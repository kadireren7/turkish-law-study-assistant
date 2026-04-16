/**
 * Türkçe metin normalleştirme — arama, eşleştirme ve RAG tokenizasyonu için.
 * Yasal terimler için hafif eş anlamlı / yazım varyantları (kanun metni üretmez).
 */

/** ASCII-benzeri küçük harf; ı→i, ş→s vb. */
export function normalizeTr(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
}

/** Yaygın hukuk terimi yazım grupları (normalizeTr uzayından eşleşir). */
const LEGAL_TOKEN_GROUPS: string[][] = [
  ['mesru', 'meşru'],
  ['mudafaa', 'müdafaa', 'müdafa', 'mudafa'],
  ['mudafi', 'müdafi'],
  ['tesebbus', 'teşebbüs'],
]

/** Sorgu tokenlerini eş anlamlı varyantlarla genişletir (küçük kümeler). */
export function expandLegalTokenVariants(token: string): Set<string> {
  const n = normalizeTr(token)
  const set = new Set<string>([n])
  for (const group of LEGAL_TOKEN_GROUPS) {
    const normSet = new Set(group.map((v) => normalizeTr(v)))
    if (normSet.has(n)) {
      normSet.forEach((x) => set.add(x))
    }
  }
  return set
}
