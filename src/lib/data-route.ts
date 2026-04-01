/**
 * Akıllı veri rotası: static (genel/sohbet) | local (law-data / RAG) | live (güncel → web).
 * Chat ve Explore aynı mantığı paylaşır; Tavily/Serper yalnızca live’da.
 */
import type { QueryType } from '@/lib/query-classifier'
import { requiresLiveData } from '@/lib/live-data-classifier'

export type DataRoute = 'static' | 'local' | 'live'

const LOCAL_QUERY_TYPES: ReadonlySet<QueryType> = new Set([
  'madde_arama',
  'mevzuat_sorusu',
  'olay_analizi',
  'karar_analizi',
  'tartismali_konu',
  'sinav_pratigi',
  'konu_anlatimi',
])

/**
 * Öncelik: canlı sinyal veya güncel gelişme sınıfı → live.
 * Hukukî içerik sınıfları → local (RAG öncelikli).
 * Diğer → static (web yok; kısa/AI odaklı).
 */
export function classifyDataRoute(userMessage: string, queryType: QueryType): DataRoute {
  const q = userMessage.trim()
  if (requiresLiveData(q) || queryType === 'guncel_gelisme') return 'live'
  if (LOCAL_QUERY_TYPES.has(queryType)) return 'local'
  return 'static'
}

export function shouldUseWebForDataRoute(dataRoute: DataRoute): boolean {
  return dataRoute === 'live'
}
