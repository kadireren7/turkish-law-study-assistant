/**
 * Local RAG pipeline for legal data (fast, lightweight).
 * - Reads law-data (mevzuat, konu-notlari, guncellemeler, madde-index)
 * - Chunks markdown by headings and JSON by article entries
 * - Uses hybrid retrieval WITHOUT heavy embeddings:
 *   1) keyword overlap
 *   2) semantic lexicon expansion (lightweight)
 *   3) recency boost (newest data first)
 * - Context uses human-readable source labels only.
 */
import path from 'path'
import fs from 'fs/promises'
import OpenAI from 'openai'
import { toHumanReadableLabel } from '@/lib/source-metadata'
import { filterChunksBySourceGroups, type SourceGroupId } from '@/lib/source-routing'

const LAW_DATA_DIR = path.join(process.cwd(), 'law-data')
const TOP_K = 6
const MIN_HYBRID_SCORE = 0.08
const MAX_CONTEXT_CHARS = 4200

export type LawChunk = {
  id: string
  filePath: string
  heading: string
  text: string
  updatedAt: number
  tokens: string[]
}

export type ChunkRef = { filePath: string; heading: string }

export type RagResult = {
  context: string
  sources: string[]
  chunksUsed: ChunkRef[]
  lowConfidence: boolean
}

let cachedIndex: LawChunk[] | null = null

type MdFile = { relativePath: string; fullPath: string; content: string; updatedAt: number }

export async function findAllMarkdownFiles(dir: string = LAW_DATA_DIR): Promise<MdFile[]> {
  const out: MdFile[] = []
  let entries: { name: string; path: string }[]
  try {
    entries = (await fs.readdir(dir, { withFileTypes: true })).map((e) => ({
      name: e.name,
      path: path.join(dir, e.name),
    }))
  } catch {
    return out
  }
  for (const e of entries) {
    const fullPath = e.path
    const relativePath = path.relative(process.cwd(), fullPath)
    if (path.basename(e.name).startsWith('.')) continue
    const stat = await fs.stat(fullPath).catch(() => null)
    if (!stat) continue
    if (stat.isDirectory()) {
      const sub = await findAllMarkdownFiles(fullPath)
      out.push(...sub)
      continue
    }
    if (e.name.toLowerCase().endsWith('.md')) {
      const content = await fs.readFile(fullPath, 'utf-8').catch(() => '')
      out.push({ relativePath, fullPath, content, updatedAt: stat.mtimeMs })
    }
  }
  return out
}

/**
 * Strip YAML frontmatter (--- ... ---) from content for chunking.
 */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)
  return match ? content.slice(match[0].length) : content
}

/**
 * Chunk markdown by ## and ### headings. Each chunk is one section (heading + body until next heading).
 */
export function chunkByHeadings(content: string, filePath: string): { heading: string; text: string }[] {
  const raw = stripFrontmatter(content)
  const chunks: { heading: string; text: string }[] = []
  const lines = raw.split(/\r?\n/)
  let currentHeading = ''
  let currentLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isH2 = /^##\s+/.test(line)
    const isH3 = /^###\s+/.test(line)
    if (isH2 || isH3) {
      if (currentHeading || currentLines.length) {
        const text = [currentHeading, ...currentLines].join('\n').trim()
        if (text.length > 0) chunks.push({ heading: currentHeading.replace(/^#+\s*/, ''), text })
      }
      currentHeading = line
      currentLines = []
      continue
    }
    currentLines.push(line)
  }
  if (currentHeading || currentLines.length) {
    const text = [currentHeading, ...currentLines].join('\n').trim()
    if (text.length > 0) chunks.push({ heading: currentHeading.replace(/^#+\s*/, ''), text })
  }
  if (chunks.length === 0 && raw.trim().length > 0) {
    chunks.push({ heading: path.basename(filePath, '.md'), text: raw.trim() })
  }
  return chunks
}

const MADDE_INDEX_DIR = path.join(LAW_DATA_DIR, 'madde-index')

type MaddeIndexEntry = {
  lawCode: string
  lawName: string
  articleNumber: string
  title: string
  text: string
  keywords?: string[]
  legalArea?: string
}

function parseFrontmatterDate(content: string): number | null {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/m)
  if (!m) return null
  const line = m[1].split(/\r?\n/).find((l) => /^last_checked:/i.test(l.trim()))
  if (!line) return null
  const raw = line.split(':').slice(1).join(':').replace(/['"]/g, '').trim()
  if (!raw) return null
  const t = Date.parse(raw)
  return Number.isFinite(t) ? t : null
}

function normalizeTr(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

function tokenize(text: string): string[] {
  const normalized = normalizeTr(text)
  const parts = normalized.split(/[^a-z0-9]+/g).filter((t) => t.length >= 2)
  return parts
}

const SEMANTIC_LEXICON: Record<string, string[]> = {
  guncel: ['degisiklik', 'yururluk', 'resmi', 'gazete', 'son'],
  degisti: ['degisiklik', 'yeni', 'yururluk'],
  yururluk: ['yururluge', 'resmi', 'gazete', 'degisiklik'],
  ceza: ['tck', 'sucl', 'hapis', 'kast', 'taksir'],
  borclar: ['tbk', 'sozlesme', 'temerrut', 'ifa', 'haksiz'],
  medeni: ['tmk', 'miras', 'aile', 'ehliyet', 'mulkiyet'],
  usul: ['cmk', 'hmk', 'sure', 'yetki', 'delil'],
}

function expandQueryTokens(tokens: string[]): Set<string> {
  const set = new Set(tokens)
  for (const t of tokens) {
    const extras = SEMANTIC_LEXICON[t]
    if (extras) extras.forEach((e) => set.add(e))
  }
  return set
}

function computeKeywordScore(queryTokens: Set<string>, chunkTokens: string[]): number {
  if (chunkTokens.length === 0 || queryTokens.size === 0) return 0
  let hit = 0
  for (const t of chunkTokens) {
    if (queryTokens.has(t)) hit += 1
  }
  const uniqueChunk = new Set(chunkTokens).size || 1
  const coverage = hit / uniqueChunk
  return Math.min(1, coverage * 4)
}

function computeRecencyBoost(updatedAt: number, newestTs: number): number {
  if (!updatedAt || !newestTs) return 0
  const ageRatio = Math.max(0, Math.min(1, updatedAt / newestTs))
  return ageRatio * 0.15
}

/**
 * Load madde-index JSON files and return one chunk per article (priority tier 2: after mevzuat).
 */
async function loadMaddeIndexChunks(): Promise<{ filePath: string; heading: string; text: string; updatedAt: number }[]> {
  const list: { filePath: string; heading: string; text: string; updatedAt: number }[] = []
  let names: string[] = []
  try {
    names = await fs.readdir(MADDE_INDEX_DIR)
  } catch {
    return list
  }
  for (const name of names) {
    if (!name.toLowerCase().endsWith('.json')) continue
    const fullPath = path.join(MADDE_INDEX_DIR, name)
    const relativePath = path.relative(process.cwd(), fullPath)
    const stat = await fs.stat(fullPath).catch(() => null)
    const updatedAt = stat?.mtimeMs ?? Date.now()
    let raw = ''
    try {
      raw = await fs.readFile(fullPath, 'utf-8')
    } catch {
      continue
    }
    let entries: MaddeIndexEntry[] = []
    try {
      entries = JSON.parse(raw) as MaddeIndexEntry[]
    } catch {
      continue
    }
    if (!Array.isArray(entries)) continue
    for (const e of entries) {
      const heading = `${e.lawCode} Madde ${e.articleNumber} – ${e.title || ''}`
      const text = [
        `Kanun: ${e.lawName}`,
        `Madde metni: ${e.text}`,
        e.keywords?.length ? `Anahtar kelimeler: ${e.keywords.join(', ')}` : '',
        e.legalArea ? `Hukuk alanı: ${e.legalArea}` : '',
      ].filter(Boolean).join('\n')
      list.push({ filePath: relativePath, heading, text, updatedAt })
    }
  }
  return list
}

/**
 * Build full chunk list from all law-data markdown files and madde-index JSON.
 */
export async function buildChunkList(): Promise<{ filePath: string; heading: string; text: string; updatedAt: number }[]> {
  const files = await findAllMarkdownFiles()
  const list: { filePath: string; heading: string; text: string; updatedAt: number }[] = []
  for (const f of files) {
    const frontmatterDate = parseFrontmatterDate(f.content)
    const updatedAt = frontmatterDate ?? f.updatedAt
    const sections = chunkByHeadings(f.content, f.relativePath)
    for (const s of sections) {
      list.push({
        filePath: f.relativePath,
        heading: s.heading,
        text: s.text,
        updatedAt,
      })
    }
  }
  const indexChunks = await loadMaddeIndexChunks()
  list.push(...indexChunks)
  return list
}

/**
 * Build or return cached index (tokenized chunks).
 */
export async function getLawRagIndex(_openai: OpenAI): Promise<LawChunk[]> {
  if (cachedIndex && cachedIndex.length > 0) return cachedIndex
  const list = await buildChunkList()
  cachedIndex = list.map((c, i) => ({
    id: `law-${i}-${path.basename(c.filePath)}`,
    filePath: c.filePath,
    heading: c.heading,
    text: c.text,
    updatedAt: c.updatedAt,
    tokens: tokenize(`${c.heading}\n${c.text}`).slice(0, 1200),
  }))
  return cachedIndex
}

/** Optional source routing: lower tier value = higher priority. Keys: mevzuat, madde-index, konu-notlari, guncellemeler */
export type SourceTierOverrides = Partial<Record<'mevzuat' | 'madde-index' | 'konu-notlari' | 'guncellemeler', number>>

/**
 * Retrieve relevant chunks for a query and build context string + unique source list.
 * If no chunks above MIN_SIMILARITY, returns empty context and lowConfidence: true.
 * - sourceTierOverrides: öncelik sırası (kaynak tipine göre).
 * - allowedSourceGroups: yalnızca bu kaynak grupları taranır; verilmezse tüm index taranır. Hız için daraltma.
 */
export async function retrieveForQuery(
  query: string,
  openai: OpenAI,
  topK: number = TOP_K,
  options?: { sourceTierOverrides?: SourceTierOverrides; allowedSourceGroups?: SourceGroupId[] }
): Promise<RagResult> {
  const fullIndex = await getLawRagIndex(openai)
  const index = options?.allowedSourceGroups?.length
    ? filterChunksBySourceGroups(fullIndex, options.allowedSourceGroups)
    : fullIndex
  if (index.length === 0) {
    return { context: '', sources: [], chunksUsed: [], lowConfidence: true }
  }
  const baseTokens = tokenize(query).slice(0, 80)
  const queryTokens = expandQueryTokens(baseTokens)
  const newestTs = Math.max(...index.map((c) => c.updatedAt || 0), 0)
  const overrides = options?.sourceTierOverrides ?? {}
  const defaultTiers: Record<string, number> = {
    'mevzuat/': 1,
    'madde-index/': 2,
    'konu-notlari/': 3,
    'guncellemeler/': 4,
  }
  function sourceTier(filePath: string): number {
    const normalized = filePath.replace(/\\/g, '/')
    if (normalized.includes('mevzuat/')) return overrides['mevzuat'] ?? defaultTiers['mevzuat/']!
    if (normalized.includes('madde-index/')) return overrides['madde-index'] ?? defaultTiers['madde-index/']!
    if (normalized.includes('konu-notlari/')) return overrides['konu-notlari'] ?? defaultTiers['konu-notlari/']!
    if (normalized.includes('guncellemeler/')) return overrides['guncellemeler'] ?? defaultTiers['guncellemeler/']!
    return 3
  }
  const scored = index
    .map((c) => {
      const keywordScore = computeKeywordScore(queryTokens, c.tokens)
      const tierBoost = (5 - sourceTier(c.filePath)) * 0.03
      const recencyBoost = computeRecencyBoost(c.updatedAt, newestTs)
      const score = keywordScore + tierBoost + recencyBoost
      return { chunk: c, score }
    })
    .filter((s) => s.score >= MIN_HYBRID_SCORE)
    .sort((a, b) => {
      return b.score - a.score
    })
    .slice(0, topK)
  const sources = [...new Set(scored.map((s) => s.chunk.filePath))]
  const chunksUsed: ChunkRef[] = scored.map((s) => ({ filePath: s.chunk.filePath, heading: s.chunk.heading }))
  const chunkMaxChars = Math.ceil(MAX_CONTEXT_CHARS / Math.max(scored.length, 1))
  let context = scored
    .map((s) => {
      const text = s.chunk.text.length > chunkMaxChars ? s.chunk.text.slice(0, chunkMaxChars) + ' […]' : s.chunk.text
      return `[Kaynak: ${toHumanReadableLabel(s.chunk.filePath, s.chunk.heading)}]\n${text}`
    })
    .join('\n\n---\n\n')
  if (context.length > MAX_CONTEXT_CHARS) {
    context = context.slice(0, MAX_CONTEXT_CHARS) + '\n\n[...]'
  }
  return {
    context,
    sources,
    chunksUsed,
    lowConfidence: scored.length === 0,
  }
}
