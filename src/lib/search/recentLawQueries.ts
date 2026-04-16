const STORAGE_KEY = 'studylaw:law-search:recent:v1'
const MAX = 12

export function loadRecentLawQueries(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? p.filter((x) => typeof x === 'string').slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecentLawQuery(q: string): void {
  if (typeof window === 'undefined') return
  const t = q.trim()
  if (t.length < 2) return
  const prev = loadRecentLawQueries().filter((x) => x.toLowerCase() !== t.toLowerCase())
  const next = [t, ...prev].slice(0, MAX)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
}
