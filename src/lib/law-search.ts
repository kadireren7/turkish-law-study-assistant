/**
 * Law article search (Madde Ara). Reads from law-data: madde-index first, then mevzuat.
 * Normalizes input (tbk 2, TBK 2, TBK m.2, Türk Borçlar Kanunu 2). Official-source priority.
 *
 * Past "bilgi tabanında bulunamadı" causes: (1) parseLawQuery did not accept lowercase or
 * long-form names; (2) only mevzuat was tried first and some .md files use "## Madde N"
 * not "### Madde N", or lack the article; (3) madde-index was fallback and some articles
 * (e.g. TBK 2) were missing. Fix: normalize query, try madde-index first, support both
 * ## and ### in mevzuat, and add common articles to indexes.
 */
import path from 'path'
import fs from 'fs/promises'

/** Canonical law codes used in file lookup. */
const CODE_TO_FILE: Record<string, string> = {
  TCK: 'tck.md',
  TMK: 'tmk.md',
  TBK: 'tbk.md',
  ANAYASA: 'anayasa.md',
  AY: 'anayasa.md',
  İDARE: 'idare.md',
  IDARE: 'idare.md',
  CMK: 'cmk.md',
  HMK: 'hmk.md',
  İİK: 'iik.md',
  IIK: 'iik.md',
  TTK: 'ttk.md',
  İYUK: 'idari-yargilama-usulu.md',
  IYUK: 'idari-yargilama-usulu.md',
  IS: 'is-kanunu.md',
  İŞ: 'is-kanunu.md',
  KABAHATLER: 'kabahatler.md',
}

const CODE_LABELS: Record<string, string> = {
  TCK: 'Türk Ceza Kanunu (5237)',
  TMK: 'Türk Medeni Kanunu (4721)',
  TBK: 'Türk Borçlar Kanunu (6098)',
  ANAYASA: 'Türkiye Cumhuriyeti Anayasası (2709)',
  IDARE: 'İdare Hukuku',
  CMK: 'Ceza Muhakemesi Kanunu (5271)',
  HMK: 'Hukuk Muhakemeleri Kanunu (6100)',
  IIK: 'İcra ve İflas Kanunu (2004)',
  TTK: 'Türk Ticaret Kanunu (6102)',
  IYUK: 'İdari Yargılama Usulü Kanunu (2577)',
  IS: 'İş Kanunu (4857)',
  KABAHATLER: 'Kabahatler Kanunu (5326)',
}

/**
 * Human-readable source label for UI (do not show raw file names).
 * Example: "Türk Borçlar Kanunu (6098) m.2", "T.C. Anayasası m.10".
 */
export function getLawDisplayLabel(lawCode: string, article?: number): string {
  const label = CODE_LABELS[lawCode] ?? lawCode
  if (article != null) return `${label} m.${article}`
  return label
}

/** Aliases: user input (lowercase, no dots) -> canonical code */
const INPUT_ALIASES: Record<string, string> = {
  tck: 'TCK',
  tmk: 'TMK',
  tbk: 'TBK',
  anayasa: 'ANAYASA',
  ay: 'ANAYASA',
  cmk: 'CMK',
  hmk: 'HMK',
  iik: 'IIK',
  ttk: 'TTK',
  iyuk: 'IYUK',
  idare: 'IDARE',
  is: 'IS',
  iş: 'IS',
  kabahatler: 'KABAHATLER',
}

/** Long-form law names (case-insensitive prefix match) -> canonical code */
const LONG_NAME_TO_CODE: Array<{ pattern: RegExp; code: string }> = [
  { pattern: /^t\.?\s*c\.?\s*anayasa[sıi]/i, code: 'ANAYASA' },
  { pattern: /^anayasa\s/i, code: 'ANAYASA' },
  { pattern: /^türk\s*borçlar\s*kanunu/i, code: 'TBK' },
  { pattern: /^türk\s*ceza\s*kanunu/i, code: 'TCK' },
  { pattern: /^türk\s*medeni\s*kanunu/i, code: 'TMK' },
  { pattern: /^ceza\s*muhakemesi\s*kanunu/i, code: 'CMK' },
  { pattern: /^hukuk\s*muhakemeleri\s*kanunu/i, code: 'HMK' },
  { pattern: /^i[çc]ra\s*ve\s*iflas\s*kanunu/i, code: 'IIK' },
  { pattern: /^türk\s*ticaret\s*kanunu/i, code: 'TTK' },
  { pattern: /^idari\s*yargilama/i, code: 'IYUK' },
  { pattern: /^iş\s*kanunu/i, code: 'IS' },
  { pattern: /^kabahatler\s*kanunu/i, code: 'KABAHATLER' },
]

/**
 * Normalize raw query for lookup: trim, collapse spaces, normalize dots so "m. 2" and "m.2" both work.
 * Supports: tbk 2, TBK 2, TBK m.2, Türk Borçlar Kanunu 2, anayasa 10 (lowercase/uppercase).
 * Returns { code: canonical code, article: number } or null.
 */
export function parseLawQuery(query: string): { code: string; article: number } | null {
  const trimmed = query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
  if (!trimmed) return null

  const numPart = '(\\d{1,4})'

  // Long-form: "Türk Borçlar Kanunu 2", "T.C. Anayasası 10", "Anayasa 10"
  const longMatch = trimmed.match(new RegExp(`^(.+?)\\s*(?:m\\.?|madde)?\\s*${numPart}$`, 'i'))
  if (longMatch) {
    const prefix = (longMatch[1] ?? '').trim()
    const article = parseInt(longMatch[2], 10)
    if (!isNaN(article)) {
      for (const { pattern, code } of LONG_NAME_TO_CODE) {
        if (pattern.test(prefix) && getFilePath(code)) return { code, article }
      }
    }
  }

  // Pattern: CODE (optional: m. or madde) NUMBER
  const codePart = '(tck|tmk|tbk|anayasa|ay|cmk|hmk|iik|ttk|iyuk|idare|is|iş|kabahatler)'
  const match1 = trimmed.match(new RegExp(`^${codePart}\\s*(?:m\\.?|madde)?\\s*${numPart}$`, 'i'))
  if (match1) {
    const codeKey = (match1[1] ?? '').toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ç/g, 'c')
    const code = INPUT_ALIASES[codeKey] ?? (match1[1] ?? '').toUpperCase().replace(/İ/g, 'I')
    const article = parseInt(match1[2], 10)
    if (!isNaN(article) && code && getFilePath(code)) return { code, article }
  }

  // "2 tbk", "21 tck"
  const match2 = trimmed.match(new RegExp(`^${numPart}\\s*${codePart}$`, 'i'))
  if (match2) {
    const codeKey = (match2[2] ?? '').toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ç/g, 'c')
    const code = INPUT_ALIASES[codeKey] ?? (match2[2] ?? '').toUpperCase().replace(/İ/g, 'I')
    const article = parseInt(match2[1], 10)
    if (!isNaN(article) && code && getFilePath(code)) return { code, article }
  }

  return null
}

function getFilePath(code: string): string | null {
  const file = CODE_TO_FILE[code] ?? CODE_TO_FILE[code.toUpperCase()]
  return file ?? null
}

/** Match both ## Madde N and ### Madde N – ... */
function extractArticleSection(content: string, articleNum: number): { raw: string; title: string; body: string } | null {
  const lines = content.split('\n')
  let inSection = false
  const collected: string[] = []
  const articleRegex = new RegExp(`^#{2,3}\\s+Madde\\s+${articleNum}\\s*[–-]?\\s*(.*)$`, 'i')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const titleMatch = line.match(articleRegex)
    if (titleMatch) {
      inSection = true
      collected.push(line)
      continue
    }
    if (inSection) {
      if (/^#{2,3}\s+Madde\s+\d+/i.test(line)) break
      if (line.startsWith('## ') && !line.includes('Madde')) break
      collected.push(line)
    }
  }
  if (collected.length === 0) return null
  const raw = collected.join('\n').trim()
  const firstLine = collected[0]
  const titleMatch = firstLine.match(new RegExp(`^#{2,3}\\s+Madde\\s+${articleNum}\\s*[–-]?\\s*(.*)$`, 'i'))
  const title = (titleMatch?.[1] ?? '').trim() || `Madde ${articleNum}`
  const body = collected.slice(1).join('\n').trim()
  return { raw, title, body }
}

function parseFrontmatterValue(content: string, key: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/m)
  if (!match) return null
  const line = match[1].split(/\r?\n/).find((l) => new RegExp(`^${key}:`, 'i').test(l))
  if (!line) return null
  const val = line.replace(new RegExp(`^${key}:\\s*["']?|["']?$`, 'i'), '').trim()
  return val || null
}

function findRelevantSnippet(sectionText: string | null, articleNum: number): string | null {
  if (!sectionText) return null
  const re = new RegExp(`(?:^|\\n)(?:[-*•]\\s*)?([^\\n]*(?:m\\.\\s*${articleNum}|Madde\\s+${articleNum}|m\\. ${articleNum})[^\\n]*)`, 'i')
  const m = sectionText.match(re)
  return m ? m[1].trim() : null
}

function extractSection(content: string, sectionTitle: string): string | null {
  const regex = new RegExp(`^##\\s+${sectionTitle}`, 'im')
  const match = content.match(regex)
  if (!match || match.index === undefined) return null
  const start = match.index
  const rest = content.slice(start)
  const nextSection = rest.indexOf('\n## ', 3)
  const block = nextSection === -1 ? rest : rest.slice(0, nextSection)
  return block.replace(/^#+\s*[^\n]+\n?/, '').trim()
}

export type LawSearchResult = {
  found: boolean
  lawCode: string
  lawLabel: string
  article: number
  maddeBasligi: string | null
  maddeMetni: string | null
  basitAciklama: string | null
  maddeninAmaci: string | null
  kisaOrnek: string | null
  sinavdaDikkat: string | null
  guncellikNotu: string | null
  message?: string
  articleContent: string | null
  explanation: string | null
  example: string | null
}

const emptyResult = (
  code: string,
  article: number,
  message: string
): LawSearchResult => ({
  found: false,
  lawCode: code,
  lawLabel: CODE_LABELS[code] ?? code,
  article,
  maddeBasligi: null,
  maddeMetni: null,
  basitAciklama: null,
  maddeninAmaci: null,
  kisaOrnek: null,
  sinavdaDikkat: null,
  guncellikNotu: null,
  message,
  articleContent: null,
  explanation: null,
  example: null,
})

type MaddeIndexEntry = { articleNumber: string | number; title?: string; text?: string; keywords?: string[] }

/** Normalize article number for comparison (index can have string "2" or number 2). */
function indexArticleMatches(entry: MaddeIndexEntry, article: number): boolean {
  const num = entry.articleNumber
  if (num === article) return true
  return String(num).trim() === String(article)
}

/**
 * Try madde-index first for clean article text; then fall back to mevzuat.
 * Both sources are searched so valid articles are not wrongly reported as missing.
 */
export async function searchLawArticle(code: string, article: number): Promise<LawSearchResult> {
  const file = getFilePath(code)
  const lawLabel = CODE_LABELS[code] ?? code
  if (!file) {
    return emptyResult(code, article, 'Geçersiz kanun kodu.')
  }

  const indexPath = path.join(process.cwd(), 'law-data', 'madde-index', file.replace(/\.md$/i, '.json'))

  // 1) Try madde-index first (reliable, structured)
  try {
    const indexRaw = await fs.readFile(indexPath, 'utf-8')
    const indexEntries = JSON.parse(indexRaw) as MaddeIndexEntry[]
    if (Array.isArray(indexEntries)) {
      const entry = indexEntries.find((e) => indexArticleMatches(e, article))
      if (entry?.text) {
        const maddeMetni = entry.title ? `Madde ${article} – ${entry.title}\n\n${entry.text}` : `Madde ${article}\n\n${entry.text}`
        const guncellikNotu = 'Güncel metin için Resmî Gazete kontrol edilmelidir.'
        return {
          found: true,
          lawCode: code,
          lawLabel,
          article,
          maddeBasligi: entry.title || null,
          maddeMetni,
          basitAciklama: null,
          maddeninAmaci: null,
          kisaOrnek: null,
          sinavdaDikkat: null,
          guncellikNotu,
          articleContent: maddeMetni,
          explanation: null,
          example: null,
        }
      }
    }
  } catch {
    // index missing or invalid; continue to mevzuat
  }

  // 2) Mevzuat markdown
  const baseDir = path.join(process.cwd(), 'law-data', 'mevzuat')
  const filePath = path.join(baseDir, file)
  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    return emptyResult(code, article, 'Bu kanunda Madde ' + article + ' bilgi tabanında bulunamadı. Resmî metin için Resmî Gazete veya mevzuat portallarını kullanın.')
  }

  const articleBlock = extractArticleSection(content, article)
  const explanationFull = extractSection(content, 'AÇIKLAMALAR')
  const exampleFull = extractSection(content, 'ÖRNEKLER')
  const sinavdaDikkatSection = extractSection(content, 'SINAVDA DİKKAT') ?? extractSection(content, 'SINAV NOTU')
  const lastChecked = parseFrontmatterValue(content, 'last_checked')

  const basitAciklama = findRelevantSnippet(explanationFull, article) ?? explanationFull
  const kisaOrnek = findRelevantSnippet(exampleFull, article) ?? exampleFull
  const amacSnippet = findRelevantSnippet(explanationFull, article)
  const maddeninAmaci = amacSnippet ? (amacSnippet.length > 180 ? amacSnippet.slice(0, 180) + '…' : amacSnippet) : null

  const guncellikNotu = lastChecked
    ? `Son kontrol: ${lastChecked}. Güncel metin için Resmî Gazete kontrol edilmelidir.`
    : 'Güncel metin için Resmî Gazete kontrol edilmelidir.'

  if (!articleBlock) {
    return {
      ...emptyResult(code, article, `${lawLabel} Madde ${article} bilgi tabanında bulunamadı. Resmî metin için Resmî Gazete veya mevzuat portallarını kullanın.`),
      explanation: explanationFull || null,
      example: exampleFull || null,
    }
  }

  return {
    found: true,
    lawCode: code,
    lawLabel,
    article,
    maddeBasligi: articleBlock.title || null,
    maddeMetni: articleBlock.raw || null,
    basitAciklama,
    maddeninAmaci: maddeninAmaci || null,
    kisaOrnek,
    sinavdaDikkat: sinavdaDikkatSection,
    guncellikNotu,
    articleContent: articleBlock.raw,
    explanation: basitAciklama,
    example: kisaOrnek,
  }
}
