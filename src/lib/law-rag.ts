/**
 * Local RAG pipeline for the law assistant.
 * - Reads all markdown under /law-data recursively
 * - Chunks by section headings (## and ###)
 * - Builds in-memory index with OpenAI embeddings
 * - Retrieves relevant chunks per question and injects into model context
 * - Context uses human-readable source labels only (never raw file paths).
 */
import path from 'path'
import fs from 'fs/promises'
import OpenAI from 'openai'
import { toHumanReadableLabel } from '@/lib/source-metadata'
import { filterChunksBySourceGroups, type SourceGroupId } from '@/lib/source-routing'

const LAW_DATA_DIR = path.join(process.cwd(), 'law-data')
const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small'
const TOP_K = 6
const MIN_SIMILARITY = 0.22
const MAX_CONTEXT_CHARS = 4200
const QUERY_EMBED_MAX_CHARS = 4000

export type LawChunk = {
  id: string
  filePath: string
  heading: string
  text: string
  embedding: number[]
}

export type ChunkRef = { filePath: string; heading: string }

export type RagResult = {
  context: string
  sources: string[]
  chunksUsed: ChunkRef[]
  lowConfidence: boolean
}

let cachedIndex: LawChunk[] | null = null

/**
 * Recursively find all .md files under dir.
 */
export async function findAllMarkdownFiles(dir: string = LAW_DATA_DIR): Promise<{ relativePath: string; fullPath: string; content: string }[]> {
  const out: { relativePath: string; fullPath: string; content: string }[] = []
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
      out.push({ relativePath, fullPath, content })
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

/**
 * Load madde-index JSON files and return one chunk per article (priority tier 2: after mevzuat).
 */
async function loadMaddeIndexChunks(): Promise<{ filePath: string; heading: string; text: string }[]> {
  const list: { filePath: string; heading: string; text: string }[] = []
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
      list.push({ filePath: relativePath, heading, text })
    }
  }
  return list
}

/**
 * Build full chunk list from all law-data markdown files and madde-index JSON.
 */
export async function buildChunkList(): Promise<{ filePath: string; heading: string; text: string }[]> {
  const files = await findAllMarkdownFiles()
  const list: { filePath: string; heading: string; text: string }[] = []
  for (const f of files) {
    const sections = chunkByHeadings(f.content, f.relativePath)
    for (const s of sections) {
      list.push({
        filePath: f.relativePath,
        heading: s.heading,
        text: s.text,
      })
    }
  }
  const indexChunks = await loadMaddeIndexChunks()
  list.push(...indexChunks)
  return list
}

/**
 * Embed texts with OpenAI; returns array of embedding vectors.
 */
async function embedTexts(openai: OpenAI, texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const normalized = texts.map((t) => t.slice(0, 8000))
  const res = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: normalized,
  })
  const out: number[][] = []
  for (const e of res.data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))) {
    out.push(Array.isArray(e.embedding) ? e.embedding : [])
  }
  return out
}

/**
 * Cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Build or return cached index: chunks + embeddings.
 */
export async function getLawRagIndex(openai: OpenAI): Promise<LawChunk[]> {
  if (cachedIndex && cachedIndex.length > 0) return cachedIndex
  const list = await buildChunkList()
  const texts = list.map((c) => `${c.heading}\n${c.text}`)
  const embeddings = await embedTexts(openai, texts)
  cachedIndex = list.map((c, i) => ({
    id: `law-${i}-${path.basename(c.filePath)}`,
    filePath: c.filePath,
    heading: c.heading,
    text: c.text,
    embedding: embeddings[i] ?? [],
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
  const queryEmbeddingRes = await openai.embeddings.create({
    model: OPENAI_EMBEDDING_MODEL,
    input: query.slice(0, QUERY_EMBED_MAX_CHARS),
  })
  const queryEmb = queryEmbeddingRes.data[0]?.embedding
  if (!queryEmb || !Array.isArray(queryEmb)) {
    return { context: '', sources: [], chunksUsed: [], lowConfidence: true }
  }
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
    .map((c) => ({ chunk: c, score: cosineSimilarity(c.embedding, queryEmb) }))
    .filter((s) => s.score >= MIN_SIMILARITY)
    .sort((a, b) => {
      const tierA = sourceTier(a.chunk.filePath)
      const tierB = sourceTier(b.chunk.filePath)
      if (tierA !== tierB) return tierA - tierB
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
