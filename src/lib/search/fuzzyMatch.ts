/**
 * Hafif fuzzy eşleşme — kısa Türkçe tokenler için Levenshtein tabanlı.
 */

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  const row: number[] = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!
    row[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(prev + cost, row[j]! + 1, row[j - 1]! + 1)
      prev = tmp
    }
  }
  return row[n]!
}

/** Uzunluk ≥ minLen ve düzenleme mesafesi ≤ maxDist ise eşleşme sayılır. */
export function fuzzyTokenMatch(a: string, b: string, minLen = 4, maxDist = 1): boolean {
  if (a.length < minLen || b.length < minLen) return false
  if (a === b) return true
  return levenshtein(a, b) <= maxDist
}
