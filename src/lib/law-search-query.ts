/**
 * Madde sorgusu ayrıştırma (istemci + sunucu güvenli; fs yok).
 */

/** Canonical law codes used in file lookup. */
export const CODE_TO_FILE: Record<string, string> = {
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

export const CODE_LABELS: Record<string, string> = {
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

export function getLawDisplayLabel(lawCode: string, article?: number): string {
  const label = CODE_LABELS[lawCode] ?? lawCode
  if (article != null) return `${label} m.${article}`
  return label
}

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

export function getFilePath(code: string): string | null {
  const file = CODE_TO_FILE[code] ?? CODE_TO_FILE[code.toUpperCase()]
  return file ?? null
}

export function parseLawQuery(query: string): { code: string; article: number } | null {
  const trimmed = query
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
  if (!trimmed) return null

  const numPart = '(\\d{1,4})'

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

  const codePart = '(tck|tmk|tbk|anayasa|ay|cmk|hmk|iik|ttk|iyuk|idare|is|iş|kabahatler)'
  const match1 = trimmed.match(new RegExp(`^${codePart}\\s*(?:m\\.?|madde)?\\s*${numPart}$`, 'i'))
  if (match1) {
    const codeKey = (match1[1] ?? '')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/ğ/g, 'g')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
    const code = INPUT_ALIASES[codeKey] ?? (match1[1] ?? '').toUpperCase().replace(/İ/g, 'I')
    const article = parseInt(match1[2], 10)
    if (!isNaN(article) && code && getFilePath(code)) return { code, article }
  }

  const match2 = trimmed.match(new RegExp(`^${numPart}\\s*${codePart}$`, 'i'))
  if (match2) {
    const codeKey = (match2[2] ?? '')
      .toLowerCase()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/ğ/g, 'g')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
    const code = INPUT_ALIASES[codeKey] ?? (match2[2] ?? '').toUpperCase().replace(/İ/g, 'I')
    const article = parseInt(match2[1], 10)
    if (!isNaN(article) && code && getFilePath(code)) return { code, article }
  }

  return null
}

/** İlgili madde önerileri (aynı kanun, sonraki maddeler). */
export function buildRelatedArticleQueries(code: string, article: number, count = 2): string[] {
  const c = code.toUpperCase()
  const out: string[] = []
  for (let i = 1; i <= count; i++) {
    const n = article + i
    if (n > 0) out.push(`${c} ${n}`)
  }
  return out
}
