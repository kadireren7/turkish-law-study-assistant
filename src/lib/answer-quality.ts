/**
 * Pratik cevabının hukukî değerlendirmeye uygun olup olmadığını heuristik olarak tespit eder.
 * Rastgele klavye, anlamsız Latin dizisi vb. için model çağrısı yapılmadan 0–5 puan döner.
 */

const LEGAL_LEX = new Set(
  [
    'madde',
    'kanun',
    'hukuk',
    'tck',
    'tbk',
    'hmk',
    'cmk',
    'anayasa',
    'borç',
    'ceza',
    'dava',
    'mahkeme',
    'tazminat',
    'sorumluluk',
    'olay',
    'somut',
    'kural',
    'uygulama',
    'sonuç',
    'unsur',
    'kast',
    'taksir',
    'haksız',
    'sözleşme',
    'ifade',
    'iddia',
    'savunma',
    'delil',
    'usul',
    'şart',
    'istisna',
    'mülkiyet',
    'ehliyet',
    'vekalet',
    'temerrüt',
    'ifa',
    'aym',
    'yargıtay',
    'danıştay',
    'irac',
    'ihtilaf',
  ].map((s) => s.toLowerCase())
)

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
}

/** Türkçe veya hukukî içerik sinyali var mı? */
function hasSubstantiveContent(text: string): boolean {
  const t = text.trim()
  if (t.length >= 120) return true
  const words = normalizeWords(t)
  if (words.length >= 8) return true
  const hasTrLetter = /[ğıüşıöçĞİÜŞÖÇ]/i.test(t)
  let legalHits = 0
  for (const w of words) {
    if (LEGAL_LEX.has(w)) legalHits++
    else if (w.length >= 4) {
      for (const lx of LEGAL_LEX) {
        if (lx.length >= 4 && w.includes(lx)) {
          legalHits++
          break
        }
      }
    }
  }
  if (legalHits >= 1 && words.length >= 3) return true
  if (hasTrLetter && words.length >= 4) return true
  if (hasTrLetter && t.length >= 40) return true
  return false
}

/**
 * true ise cevap anlamsız / rastgele kabul edilir; düşük puan + model çağrısı yapılmaz.
 */
export function isNonEvaluableAnswer(text: string): boolean {
  const t = text.trim()
  if (t.length === 0) return true
  if (t.length < 10) return true
  if (!hasSubstantiveContent(t)) return true
  const words = normalizeWords(t)
  if (words.length <= 2 && t.length < 50) return true
  if (/^[A-Z0-9\s]{4,}$/.test(t) && !/[ğıüşıöç]/i.test(t) && t.length < 100) return true
  return false
}
