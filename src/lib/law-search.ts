/**
 * Law article search (Madde Ara). Reads only from law-data files.
 * Official-source priority: content is from structured law-data derived from official
 * legislation (Resmî Gazete / official sources); random web summaries are not used.
 */
import path from 'path'
import fs from 'fs/promises'

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
 * Parse user input like "TCK 81", "TMK 472", "TBK m. 77" into law code and article number.
 */
export function parseLawQuery(query: string): { code: string; article: number } | null {
  const trimmed = query.trim().replace(/\s+/g, ' ')
  // TCK 81, TCK m. 81, TCK madde 81
  const codePattern = '(TCK|TMK|TBK|CMK|HMK|İİK|IIK|TTK|İYUK|IYUK|İş|IS|Kabahatler|Anayasa|AY|İdare|Idare|IDARE)'
  const match1 = trimmed.match(new RegExp(`^${codePattern}\\s*(?:m\\.?|madde)?\\s*(\\d+)$`, 'i'))
  if (match1) {
    const raw = match1[1].toUpperCase().replace(/İ/g, 'I')
    const code = raw === 'IDARE' ? 'IDARE' : raw === 'AY' ? 'ANAYASA' : (raw === 'IŞ' || raw === 'IS') ? 'IS' : raw
    return { code, article: parseInt(match1[2], 10) }
  }
  const match2 = trimmed.match(new RegExp(`^(\\d+)\\s*${codePattern}$`, 'i'))
  if (match2) {
    const raw = match2[2].toUpperCase().replace(/İ/g, 'I')
    const code = raw === 'IDARE' ? 'IDARE' : raw === 'AY' ? 'ANAYASA' : (raw === 'IŞ' || raw === 'IS') ? 'IS' : raw
    return { code, article: parseInt(match2[1], 10) }
  }
  return null
}

/**
 * Find which file to read for a given code.
 */
function getFilePath(code: string): string | null {
  const file = CODE_TO_FILE[code] ?? CODE_TO_FILE[code.toUpperCase()]
  return file ?? null
}

/**
 * Extract article block and parse title (Madde N – Başlık) and body.
 */
function extractArticleSection(content: string, articleNum: number): { raw: string; title: string; body: string } | null {
  const lines = content.split('\n')
  let inSection = false
  const collected: string[] = []
  const articleRegex = new RegExp(`^###\\s+Madde\\s+${articleNum}\\s*[–-]\\s*(.*)$`, 'i')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const titleMatch = line.match(articleRegex)
    if (titleMatch) {
      inSection = true
      collected.push(line)
      continue
    }
    if (inSection) {
      if (line.startsWith('### ') && /Madde\s+\d+/i.test(line)) break
      if (line.startsWith('## ') && !line.includes('Madde')) break
      collected.push(line)
    }
  }
  if (collected.length === 0) return null
  const raw = collected.join('\n').trim()
  const firstLine = collected[0]
  const titleMatch = firstLine.match(new RegExp(`^###\\s+Madde\\s+${articleNum}\\s*[–-]\\s*(.*)$`, 'i'))
  const title = (titleMatch?.[1] ?? '').trim() || `Madde ${articleNum}`
  const body = collected.slice(1).join('\n').trim()
  return { raw, title, body }
}

/** Extract first line of frontmatter value (e.g. last_checked). */
function parseFrontmatterValue(content: string, key: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/m)
  if (!match) return null
  const line = match[1].split(/\r?\n/).find((l) => new RegExp(`^${key}:`, 'i').test(l))
  if (!line) return null
  const val = line.replace(new RegExp(`^${key}:\\s*["']?|["']?$`, 'i'), '').trim()
  return val || null
}

/** Find a bullet or line in section text that refers to this article (m. N or Madde N). */
function findRelevantSnippet(sectionText: string | null, articleNum: number): string | null {
  if (!sectionText) return null
  const re = new RegExp(`(?:^|\\n)(?:[-*•]\\s*)?([^\\n]*(?:m\\.\\s*${articleNum}|Madde\\s+${articleNum}|m\\. ${articleNum})[^\\n]*)`, 'i')
  const m = sectionText.match(re)
  return m ? m[1].trim() : null
}

/**
 * Extract a full ## SECTION (e.g. ## AÇIKLAMALAR) from markdown.
 */
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
  /** Madde başlığı (örn. Kast, Taksir) */
  maddeBasligi: string | null
  /** Madde metni (başlık + metin) */
  maddeMetni: string | null
  /** Basit açıklama (AÇIKLAMALAR’dan; mümkünse bu maddeye ait kısım) */
  basitAciklama: string | null
  /** Bu maddenin amacı (kısa; yoksa null) */
  maddeninAmaci: string | null
  /** Kısa örnek (ÖRNEKLER’den; mümkünse bu maddeye ait) */
  kisaOrnek: string | null
  /** Sınavda dikkat (SINAVDA DİKKAT / SINAV NOTU bölümü varsa) */
  sinavdaDikkat: string | null
  /** Güncellik notu (last_checked + Resmî Gazete uyarısı) */
  guncellikNotu: string | null
  message?: string
  /** @deprecated Use maddeMetni */
  articleContent: string | null
  /** @deprecated Use basitAciklama */
  explanation: string | null
  /** @deprecated Use kisaOrnek */
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

/**
 * Search law-data for the given code and article; return structured fields for students.
 */
export async function searchLawArticle(code: string, article: number): Promise<LawSearchResult> {
  const file = getFilePath(code)
  const lawLabel = CODE_LABELS[code] ?? code
  if (!file) {
    return emptyResult(code, article, 'Geçersiz kanun kodu.')
  }

  const baseDir = path.join(process.cwd(), 'law-data', 'mevzuat')
  const filePath = path.join(baseDir, file)
  let content: string
  try {
    content = await fs.readFile(filePath, 'utf-8')
  } catch {
    return emptyResult(code, article, 'Kanun dosyası okunamadı.')
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
    const indexPath = path.join(process.cwd(), 'law-data', 'madde-index', file.replace(/\.md$/i, '.json'))
    try {
      const indexRaw = await fs.readFile(indexPath, 'utf-8')
      const indexEntries = JSON.parse(indexRaw) as Array<{ articleNumber: string; title?: string; text?: string }>
      if (Array.isArray(indexEntries)) {
        const entry = indexEntries.find((e) => String(e.articleNumber) === String(article))
        if (entry?.text) {
          const maddeMetni = entry.title ? `Madde ${article} – ${entry.title}\n${entry.text}` : entry.text
          return {
            found: true,
            lawCode: code,
            lawLabel,
            article,
            maddeBasligi: entry.title || null,
            maddeMetni,
            basitAciklama: explanationFull || null,
            maddeninAmaci: null,
            kisaOrnek: exampleFull || null,
            sinavdaDikkat: sinavdaDikkatSection,
            guncellikNotu: lastChecked ? `Son kontrol: ${lastChecked}. Güncel metin için Resmî Gazete kontrol edilmelidir.` : 'Güncel metin için Resmî Gazete kontrol edilmelidir.',
            articleContent: maddeMetni,
            explanation: explanationFull || null,
            example: exampleFull || null,
          }
        }
      }
    } catch {
      // madde-index fallback failed; return not found
    }
    return {
      ...emptyResult(code, article, `Bu kanunda Madde ${article} bilgi tabanında bulunamadı. Resmî metin için Resmî Gazete veya mevzuat portallarını kontrol edin.`),
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
