/**
 * İsteğe bağlı web araması: Serper (Google) veya Tavily.
 * Yerel law-data'da bulunmayan veya güncel bilgi gerektiren sorularda
 * yapay zeka bu sonuçlarla desteklenebilir. API anahtarı yoksa atlanır.
 */

export type WebSearchResult = {
  title: string
  url: string
  snippet: string
}

/** Serper (Google) API: https://serper.dev */
async function searchSerper(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: 5 }),
  })
  if (!res.ok) throw new Error('Serper API ' + res.status)
  const data = (await res.json()) as { organic?: { title?: string; link?: string; snippet?: string }[] }
  const organic = data.organic ?? []
  return organic
    .filter((o) => o.title && o.link)
    .map((o) => ({
      title: (o.title ?? '').trim(),
      url: (o.link ?? '').trim(),
      snippet: (o.snippet ?? '').trim().slice(0, 280),
    }))
    .slice(0, 4)
}

/** Tavily Search API (AI-oriented). Genel arama; resmî siteler öncelikli değil, tüm web taranır. */
async function searchTavily(query: string, apiKey: string): Promise<WebSearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 4,
    }),
  })
  if (!res.ok) throw new Error('Tavily API ' + res.status)
  const data = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] }
  const results = data.results ?? []
  return results
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: (r.title ?? '').trim(),
      url: (r.url ?? '').trim(),
      snippet: (r.content ?? '').trim().slice(0, 280),
    }))
    .slice(0, 4)
}

/** Mevzuat / kanun / madde içeren sorularda aramayı Türk mevzuat sitelerine yönlendirmek için ek terim. */
function enrichQueryForLaw(query: string): string {
  const lower = query.toLowerCase()
  const hasLaw = /\b(tck|tbk|cmk|hmk|ttk|anayasa|kanun|madde|mevzuat|5237|4721|6100|5271)\b|i̇ik|madde\s*\d+|m\.\s*\d+/i.test(lower) || /[iIİı]{2}k/.test(lower)
  if (!hasLaw) return query
  return (query.trim() + ' Türk mevzuat resmî mevzuat.gov.tr').slice(0, 350)
}

/**
 * Web'de arama yap; Serper veya Tavily kullan (env'de hangisi tanımlıysa).
 * Mevzuat sorularında farklı sitelerden (mevzuat.gov.tr, LEXPERA, Resmî Gazete vb.) sonuç almak için sorgu zenginleştirilir.
 */
export async function searchWeb(query: string): Promise<WebSearchResult[]> {
  const serperKey = process.env.SERPER_API_KEY?.trim()
  const tavilyKey = process.env.TAVILY_API_KEY?.trim()
  const raw = (query || '').trim().slice(0, 300)
  if (!raw) return []
  const q = enrichQueryForLaw(raw)

  try {
    if (serperKey) return await searchSerper(q, serperKey)
    if (tavilyKey) return await searchTavily(q, tavilyKey)
  } catch (e) {
    console.warn('Web search error:', e instanceof Error ? e.message : String(e))
  }
  return []
}

/** Web arama sonuçlarını model bağlamına eklenecek metne çevir. */
export function formatWebSearchContext(results: WebSearchResult[]): string {
  if (results.length === 0) return ''
  const lines = [
    '[Web araması (2026) – Mevzuat.gov.tr, LEXPERA, Resmî Gazete, mahkeme siteleri vb. farklı kaynaklardan; doğru bilgi için bu sonuçları kullan, yanıtta mutlaka kaynağı belirt]',
    ...results.map((r) => `- **${r.title}**\n  ${r.snippet}\n  Kaynak: ${r.url}`),
  ]
  return lines.join('\n\n')
}

/** Web araması kullanılabilir mi (env'de anahtar var mı). */
export function isWebSearchAvailable(): boolean {
  return Boolean(process.env.SERPER_API_KEY?.trim() || process.env.TAVILY_API_KEY?.trim())
}
