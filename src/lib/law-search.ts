/**
 * Law article search (Madde Ara). Reads from `data/core/article-index` first, then `data/core/laws`.
 * Normalizes input (tbk 2, TBK 2, TBK m.2, Türk Borçlar Kanunu 2). Official-source priority.
 *
 * Past "bilgi tabanında bulunamadı" causes: (1) parseLawQuery did not accept lowercase or
 * long-form names; (2) only mevzuat was tried first and some .md files use "## Madde N"
 * not "### Madde N", or lack the article; (3) madde-index was fallback and some articles
 * (e.g. TBK 2) were missing. Fix: normalize query, try madde-index first, support both
 * ## and ### in mevzuat, and add common articles to indexes.
 */
import path from 'path'
import { CORE_ARTICLE_INDEX_DIR, CORE_LAWS_DIR } from '@/lib/config/data-paths'
import { readFileCachedUtf8 } from '@/lib/cache/legalFileCache'
import { CODE_LABELS, getFilePath } from '@/lib/law-search-query'

export {
  parseLawQuery,
  getLawDisplayLabel,
  getFilePath,
  buildRelatedArticleQueries,
  CODE_LABELS,
  CODE_TO_FILE,
} from '@/lib/law-search-query'

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

  const indexPath = path.join(CORE_ARTICLE_INDEX_DIR, file.replace(/\.md$/i, '.json'))

  // 1) Try madde-index first (reliable, structured)
  try {
    const indexRaw = await readFileCachedUtf8(indexPath)
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
  const baseDir = CORE_LAWS_DIR
  const filePath = path.join(baseDir, file)
  let content: string
  try {
    content = await readFileCachedUtf8(filePath)
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
