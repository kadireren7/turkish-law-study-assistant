/**
 * Source transparency: parse frontmatter from canonical `data/` markdown and build
 * "Kullanılan kaynak" / "Güncellik notu" data for legal responses.
 * Human-readable labels: e.g. "Türk Ceza Kanunu (5237) m.21", "Konu Notu: Ceza Hukuku Genel Hükümler".
 */
import path from 'path'
import fs from 'fs/promises'
import { normalizeDataRelativePath } from '@/lib/config/data-paths'

export type SourceMeta = {
  filePath: string
  fileName: string
  lawName: string
  last_checked?: string
  legal_area?: string
}

const PATH_TO_LAW_NAME: Record<string, string> = {
  'mevzuat/anayasa.md': 'Türkiye Cumhuriyeti Anayasası (2709)',
  'mevzuat/tck.md': 'Türk Ceza Kanunu (5237)',
  'mevzuat/tmk.md': 'Türk Medeni Kanunu (4721)',
  'mevzuat/tbk.md': 'Türk Borçlar Kanunu (6098)',
  'mevzuat/idare.md': 'İdare Hukuku',
  'mevzuat/cmk.md': 'Ceza Muhakemesi Kanunu (5271)',
  'mevzuat/hmk.md': 'Hukuk Muhakemeleri Kanunu (6100)',
  'mevzuat/iik.md': 'İcra ve İflas Kanunu (2004)',
  'mevzuat/ttk.md': 'Türk Ticaret Kanunu (6102)',
  'mevzuat/idari-yargilama-usulu.md': 'İdari Yargılama Usulü Kanunu (2577)',
  'mevzuat/is-kanunu.md': 'İş Kanunu (4857)',
  'mevzuat/kabahatler.md': 'Kabahatler Kanunu (5326)',
  'madde-index/anayasa.json': 'Türkiye Cumhuriyeti Anayasası (2709)',
  'madde-index/tck.json': 'Türk Ceza Kanunu (5237)',
  'madde-index/tmk.json': 'Türk Medeni Kanunu (4721)',
  'madde-index/tbk.json': 'Türk Borçlar Kanunu (6098)',
  'madde-index/cmk.json': 'Ceza Muhakemesi Kanunu (5271)',
  'madde-index/hmk.json': 'Hukuk Muhakemeleri Kanunu (6100)',
  'madde-index/iik.json': 'İcra ve İflas Kanunu (2004)',
  'madde-index/ttk.json': 'Türk Ticaret Kanunu (6102)',
  'madde-index/idari-yargilama-usulu.json': 'İdari Yargılama Usulü Kanunu (2577)',
  'madde-index/is-kanunu.json': 'İş Kanunu (4857)',
  'madde-index/kabahatler.json': 'Kabahatler Kanunu (5326)',
  'konu-notlari/ceza-genel-hukumler.md': 'Ceza Hukuku Genel Hükümler (konu notları)',
  'konu-notlari/medeni-giris.md': 'Medeni Hukuk Giriş (konu notları)',
  'konu-notlari/borclar-genel.md': 'Borçlar Hukuku Genel (konu notları)',
  'konu-notlari/anayasa-genel.md': 'Anayasa Hukuku Genel (konu notları)',
  'konu-notlari/idare-genel.md': 'İdare Hukuku Genel (konu notları)',
  'konu-notlari/usul-temelleri.md': 'Usul Hukuku Temelleri (konu notları)',
  'konu-notlari/cmk-temelleri.md': 'CMK Temelleri (konu notları)',
  'konu-notlari/hmk-temelleri.md': 'HMK Temelleri (konu notları)',
  'konu-notlari/icra-iflas-temelleri.md': 'İcra İflas Temelleri (konu notları)',
  'konu-notlari/ticaret-hukuku-giris.md': 'Ticaret Hukuku Giriş (konu notları)',
  'konu-notlari/is-hukuku-giris.md': 'İş Hukuku Giriş (konu notları)',
  'konu-notlari/idare-hukuku-giris.md': 'İdare Hukuku Giriş (konu notları)',
  'guncellemeler/recent-amendments.md': 'Son mevzuat değişiklikleri özeti',
  'guncellemeler/recent-important-decisions.md': 'Son önemli kararlar özeti (Yargıtay / AYM)',
}

/** Human-readable labels for konu-notlari (topic notes). Used when path not in map. */
const KONU_NOTA_TITLES: Record<string, string> = {
  'ceza-genel-hukumler': 'Ceza Hukuku Genel Hükümler',
  'medeni-giris': 'Medeni Hukuk Giriş',
  'borclar-genel': 'Borçlar Hukuku Genel',
  'anayasa-genel': 'Anayasa Hukuku Genel',
  'idare-genel': 'İdare Hukuku Genel',
  'usul-temelleri': 'Usul Hukuku Temelleri',
  'cmk-temelleri': 'CMK Temelleri',
  'hmk-temelleri': 'HMK Temelleri',
  'icra-iflas-temelleri': 'İcra İflas Temelleri',
  'ticaret-hukuku-giris': 'Ticaret Hukuku Giriş',
  'is-hukuku-giris': 'İş Hukuku Giriş',
  'idare-hukuku-giris': 'İdare Hukuku Giriş',
}

function parseFrontmatter(content: string): { last_checked?: string; source?: string; legal_area?: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return {}
  const block = match[1]
  const out: { last_checked?: string; source?: string; legal_area?: string } = {}
  for (const line of block.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*["']?([^"'\n]+)["']?/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim()
      if (key === 'last_checked') out.last_checked = val
      if (key === 'source') out.source = val
      if (key === 'legal_area') out.legal_area = val
    }
  }
  return out
}

/**
 * Always returns a human-readable label; never raw file names or paths.
 * Maps: mevzuat → law name + number, madde-index → law name, konu-notlari → topic title, guncellemeler → current developments label.
 */
export function lawNameFromPath(relativePath: string): string {
  const normalized = normalizeDataRelativePath(relativePath)
  const exact = PATH_TO_LAW_NAME[normalized]
  if (exact) return exact
  const base = path.basename(normalized, path.extname(normalized))
  if (normalized.includes('konu-notlari/')) {
    return 'Konu Notu: ' + (KONU_NOTA_TITLES[base] ?? base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  }
  if (normalized.includes('guncellemeler/')) {
    if (normalized.includes('amendment') || normalized.includes('recent-amendments')) return 'Son mevzuat değişiklikleri özeti'
    if (normalized.includes('decision') || normalized.includes('recent-important-decisions')) return 'Son önemli kararlar özeti (Yargıtay / AYM)'
    return 'Güncel hukuk gelişmeleri'
  }
  if (normalized.includes('mevzuat/')) return 'Mevzuat: ' + (base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  if (normalized.includes('madde-index/')) return 'Madde metni: ' + (base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
  return base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Extract article number from heading like "Madde 21", "Madde 21 – Başlık", "TCK Madde 21". */
function extractMaddeFromHeading(heading: string): string | null {
  const m = heading.match(/(?:^|\s)Madde\s+(\d+)/i) ?? heading.match(/(?:^|\s)m\.\s*(\d+)/i)
  return m ? m[1]! : null
}

/**
 * Build one human-readable label from filePath + optional heading.
 * Law + number + article when available (e.g. "Türk Ceza Kanunu (5237) m.21").
 * Konu notları: "Konu Notu: Ceza Hukuku Genel Hükümler". Guncellemeler: "Güncel Gelişme: ...".
 */
export function toHumanReadableLabel(filePath: string, heading?: string): string {
  const name = lawNameFromPath(filePath)
  const madde = heading ? extractMaddeFromHeading(heading) : null
  if (madde) return `${name} m.${madde}`
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.includes('konu-notlari/') || normalized.includes('core/topics/')) return name.startsWith('Konu Notu:') ? name : 'Konu Notu: ' + name
  if (normalized.includes('guncellemeler/') || normalized.includes('derived/updates/')) return name.startsWith('Güncel Gelişme:') ? name : 'Güncel Gelişme: ' + name
  return name
}

/** Veri çekildiği / yanıt üretildiği anın tarihi (Son kontrol için). YYYY-MM-DD. */
export function getRetrievalDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Deduplicate and sort human-readable labels from chunk refs. */
export function toHumanReadableSourceLabels(chunksUsed: { filePath: string; heading: string }[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const { filePath, heading } of chunksUsed) {
    const label = toHumanReadableLabel(filePath, heading)
    if (seen.has(label)) continue
    seen.add(label)
    out.push(label)
  }
  return out
}

/** In-memory cache for source metadata to avoid repeated file reads on every chat/evaluate request. */
const sourceMetaCache = new Map<string, SourceMeta>()

/**
 * Load metadata for given data file paths (relative to cwd, e.g. data/core/laws/tck.md).
 * Results are cached by path so repeated requests for the same sources do not re-read files.
 */
export async function getSourceMetadata(filePaths: string[]): Promise<SourceMeta[]> {
  const unique = [...new Set(filePaths)]
  const result: SourceMeta[] = []
  const toFetch: string[] = []
  for (const rel of unique) {
    const cached = sourceMetaCache.get(rel)
    if (cached) {
      result.push(cached)
    } else {
      toFetch.push(rel)
    }
  }
  for (const rel of toFetch) {
    const fullPath = path.join(process.cwd(), rel)
    let content = ''
    try {
      content = await fs.readFile(fullPath, 'utf-8')
    } catch {
      // file not found or not readable
    }
    const fm = parseFrontmatter(content)
    const fileName = path.basename(rel)
    const meta: SourceMeta = {
      filePath: rel,
      fileName,
      lawName: lawNameFromPath(rel),
      last_checked: fm.last_checked,
      legal_area: fm.legal_area,
    }
    sourceMetaCache.set(rel, meta)
    result.push(meta)
  }
  return result
}

/**
 * Format a single source line for "Kullanılan kaynak" section. Never use file name; only human-readable lawName.
 * Son kontrol = veri çekildiği an (retrievalDate); dosyadaki last_checked artık kullanılmıyor.
 */
function formatSourceLine(m: SourceMeta, retrievalDate: string): string {
  const parts = ['- ' + m.lawName]
  parts.push('Son kontrol: ' + retrievalDate)
  return parts.join('; ')
}

/**
 * Build the text block to inject so the model can output "Kullanılan kaynak" with correct data.
 * Son kontrol = veri çekildiği an (retrievalDate); yoksa bugünün tarihi.
 */
export function buildSourceTransparencyBlock(metadata: SourceMeta[], fromGuncellemeler: boolean, retrievalDate?: string): string {
  const date = retrievalDate ?? getRetrievalDate()
  const lines = [
    'KULLANILAN KAYNAK BÖLÜMÜ (yanıtın mutlaka bu bölümle bitmeli):',
    '',
    '**Kullanılan kaynak**',
    ...metadata.map((m) => formatSourceLine(m, date)),
    '',
    'Yanıtta atıf yaptığın madde numaralarını (örn. TCK m. 81, TBK m. 77) bu bölümde de yaz. Son kontrol tarihini yukarıdaki gibi aynen kullan; ek uyarı ekleme.',
  ]
  if (fromGuncellemeler) {
    lines.push('', '**Güncellik notu**', 'Bu yanıt guncellemeler klasöründeki kaynaklara dayanmaktadır; güncel gelişmeler için Resmî Gazete ve ilgili portallar kontrol edilmelidir.')
  }
  return lines.join('\n')
}

/**
 * Default source block for APIs that use full mevzuat (no RAG). Only human-readable names.
 */
export const DEFAULT_MEVZUAT_SOURCE_BLOCK = `
KULLANILAN KAYNAK BÖLÜMÜ (yanıtın mutlaka bu bölümle bitmeli):

**Kullanılan kaynak**
- Türkiye Cumhuriyeti Anayasası (2709), Türk Ceza Kanunu (5237), Türk Medeni Kanunu (4721), Türk Borçlar Kanunu (6098), Ceza Muhakemesi Kanunu (5271), Hukuk Muhakemeleri Kanunu (6100), İcra ve İflas Kanunu (2004), Türk Ticaret Kanunu (6102), İdari Yargılama Usulü Kanunu (2577), İş Kanunu (4857), Kabahatler Kanunu (5326), İdare Hukuku; konu notları ve madde metinleri.
- Madde numaraları: Yanıtta atıf yaptığın maddeleri (örn. TCK m. 81, TBK m. 77) bu bölümde belirt.
- Güncel metin için Resmî Gazete kontrol edilmeli.
`.trim()

export function isFromGuncellemeler(filePaths: string[]): boolean {
  return filePaths.some((p) => {
    const n = p.replace(/\\/g, '/').toLowerCase()
    return n.includes('guncellemeler') || n.includes('derived/updates/')
  })
}
