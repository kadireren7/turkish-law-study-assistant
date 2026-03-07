/**
 * Source transparency: parse frontmatter from law-data markdown and build
 * "Kullanılan kaynak" / "Güncellik notu" data for legal responses.
 */
import path from 'path'
import fs from 'fs/promises'

const LAW_DATA_DIR = path.join(process.cwd(), 'law-data')

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
  'guncellemeler/recent-amendments.md': 'Son Değişiklikler',
  'guncellemeler/recent-important-decisions.md': 'Son Önemli Kararlar',
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

function lawNameFromPath(relativePath: string): string {
  const normalized = relativePath.replace(/^law-data[\\/]/, '').replace(/\\/g, '/')
  return PATH_TO_LAW_NAME[normalized] ?? path.basename(relativePath, path.extname(relativePath))
}

/**
 * Load metadata for given law-data file paths (relative to cwd, e.g. law-data/mevzuat/tck.md).
 */
export async function getSourceMetadata(filePaths: string[]): Promise<SourceMeta[]> {
  const unique = [...new Set(filePaths)]
  const result: SourceMeta[] = []
  for (const rel of unique) {
    const fullPath = path.join(process.cwd(), rel)
    let content = ''
    try {
      content = await fs.readFile(fullPath, 'utf-8')
    } catch {
      // file not found or not readable
    }
    const fm = parseFrontmatter(content)
    const fileName = path.basename(rel)
    result.push({
      filePath: rel,
      fileName,
      lawName: lawNameFromPath(rel),
      last_checked: fm.last_checked,
      legal_area: fm.legal_area,
    })
  }
  return result
}

/**
 * Format a single source line for "Kullanılan kaynak" section.
 */
function formatSourceLine(m: SourceMeta): string {
  const parts = [`- ${m.fileName} (${m.lawName})`]
  if (m.last_checked) parts.push(`Son kontrol: ${m.last_checked}`)
  return parts.join('; ')
}

/**
 * Build the text block to inject so the model can output "Kullanılan kaynak" with correct data.
 * Also instructs to list article numbers if cited in the answer.
 */
export function buildSourceTransparencyBlock(metadata: SourceMeta[], fromGuncellemeler: boolean): string {
  const lines = [
    'KULLANILAN KAYNAK BÖLÜMÜ (yanıtın mutlaka bu bölümle bitmeli):',
    '',
    '**Kullanılan kaynak**',
    ...metadata.map(formatSourceLine),
    '',
    'Yanıtta atıf yaptığın madde numaralarını (örn. TCK m. 81, TBK m. 77) bu bölümde de yaz. Yukarıdaki dosyalarda Son kontrol (last_checked) varsa aynen kullan; ek uyarı ekleme.',
  ]
  if (fromGuncellemeler) {
    lines.push('', '**Güncellik notu**', 'Bu yanıt guncellemeler klasöründeki kaynaklara dayanmaktadır; güncel gelişmeler için Resmî Gazete ve ilgili portallar kontrol edilmelidir.')
  }
  return lines.join('\n')
}

/**
 * Default source block for APIs that use full mevzuat (no RAG): fixed list of mevzuat files.
 */
export const DEFAULT_MEVZUAT_SOURCE_BLOCK = `
KULLANILAN KAYNAK BÖLÜMÜ (yanıtın mutlaka bu bölümle bitmeli):

**Kullanılan kaynak**
- Yerel dosyalar: law-data/mevzuat (anayasa, tck, tmk, tbk, cmk, hmk, iik, ttk, idari-yargilama-usulu, is-kanunu, kabahatler, idare) ve law-data/madde-index (madde metinleri), law-data/konu-notlari (konu notları)
- Kanunlar: Anayasa (2709), TCK (5237), TMK (4721), TBK (6098), CMK (5271), HMK (6100), İİK (2004), TTK (6102), İYUK (2577), İş K. (4857), Kabahatler (5326), İdare Hukuku
- Madde numaraları: Yanıtta atıf yaptığın maddeleri bu bölümde belirt.
- Güncellik: Güncel metin için Resmî Gazete kontrol edilmeli.
`.trim()

export function isFromGuncellemeler(filePaths: string[]): boolean {
  return filePaths.some((p) => p.includes('guncellemeler'))
}
