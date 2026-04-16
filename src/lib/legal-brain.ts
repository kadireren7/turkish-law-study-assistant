/**
 * Shared legal knowledge layer: source-aware retrieval used by Sohbet, Madde Ara,
 * Olay Analizi, Sınav Pratiği, Konu Anlatımı, Haberler. All modules use the same
 * retrieval and human-readable source display.
 * Classifies query → selects source types → retrieves relevant chunks; for article
 * questions injects direct madde text first, then combines with topic notes and decision summaries.
 */
import OpenAI from 'openai'
import { retrieveForQuery, type RagResult, type ChunkRef, type SourceTierOverrides } from '@/lib/law-rag'
import { getSourceMetadata, toHumanReadableSourceLabels, isFromGuncellemeler } from '@/lib/source-metadata'
import type { QueryType } from '@/lib/query-classifier'
import { getSourceGroupsForQueryType } from '@/lib/source-routing'
import { parseLawQuery } from '@/lib/law-search-query'
import { searchLawArticle, type LawSearchResult } from '@/lib/law-search'

export type RetrievalResult = {
  context: string
  sources: string[]
  sourceLabelsHuman: string[]
  chunksUsed: ChunkRef[]
  lowConfidence: boolean
}

const DEFAULT_TOP_K = 6

/** Top-K by query type: article questions need fewer chunks; olay/tartışmalı benefit from more (article + topic notes + decisions). */
function getTopKForQueryType(queryType?: QueryType): number {
  if (!queryType) return DEFAULT_TOP_K
  if (queryType === 'madde_arama' || queryType === 'mevzuat_sorusu') return 5
  if (queryType === 'olay_analizi' || queryType === 'tartismali_konu' || queryType === 'karar_analizi') return 8
  return DEFAULT_TOP_K
}

/** Source routing: by query type, prioritize mevzuat / konu notları / karar özetleri (guncellemeler) / mixed. */
const SOURCE_TIER_BY_QUERY_TYPE: Partial<Record<QueryType, SourceTierOverrides>> = {
  mevzuat_sorusu: { mevzuat: 1, 'madde-index': 2, 'konu-notlari': 3, guncellemeler: 4 },
  madde_arama: { 'madde-index': 1, mevzuat: 2, 'konu-notlari': 3, guncellemeler: 4 },
  olay_analizi: { mevzuat: 1, 'madde-index': 2, 'konu-notlari': 3, guncellemeler: 4 },
  sinav_pratigi: { mevzuat: 1, 'konu-notlari': 2, 'madde-index': 3, guncellemeler: 4 },
  konu_anlatimi: { 'konu-notlari': 1, mevzuat: 2, 'madde-index': 3, guncellemeler: 4 },
  guncel_gelisme: { guncellemeler: 1, mevzuat: 2, 'konu-notlari': 3, 'madde-index': 4 },
  karar_analizi: { guncellemeler: 1, 'konu-notlari': 2, mevzuat: 3, 'madde-index': 4 },
  tartismali_konu: { 'konu-notlari': 1, mevzuat: 2, 'madde-index': 3, guncellemeler: 4 },
  sohbet_genel: { mevzuat: 1, 'madde-index': 2, 'konu-notlari': 3, guncellemeler: 4 },
}

const RETRIEVAL_ORDER_NOTE = `
Öncelik sırası: (1) Doğrudan madde metni varsa önce onu kullan; (2) konu notları ve mevzuat parçaları; (3) karar özetleri ve güncel gelişmeler. Yanıtı Türkçe, yapılandırılmış ve sınav odaklı ver.
`.trim()

const MAX_DIRECT_ARTICLE_CHARS = 14_000

/**
 * Single entry point for legal retrieval. Classifies query → selects source types →
 * retrieves only relevant legal sources. For article questions, injects direct madde
 * text first; combines article + topic notes + decision summaries where helpful.
 */
export async function getRetrievalResult(
  query: string,
  openai: OpenAI,
  topK: number = DEFAULT_TOP_K,
  options?: { queryType?: QueryType; topKOverride?: number }
): Promise<RetrievalResult> {
  const queryType = options?.queryType
  const baseK = options?.queryType ? getTopKForQueryType(options.queryType) : topK
  const effectiveTopK =
    typeof options?.topKOverride === 'number' && options.topKOverride > 0
      ? Math.min(options.topKOverride, baseK)
      : baseK
  const sourceTierOverrides = queryType ? SOURCE_TIER_BY_QUERY_TYPE[queryType] : undefined
  const allowedSourceGroups = queryType ? getSourceGroupsForQueryType(queryType) : undefined

  const parsed = parseLawQuery(query.trim())
  const [rag, articleResult] = await Promise.all([
    retrieveForQuery(query, openai, effectiveTopK, {
      sourceTierOverrides,
      allowedSourceGroups,
    }),
    parsed
      ? searchLawArticle(parsed.code, parsed.article)
      : Promise.resolve(null as LawSearchResult | null),
  ])

  let context = rag.context
  const sourceLabelsHuman =
    rag.chunksUsed && rag.chunksUsed.length > 0
      ? toHumanReadableSourceLabels(rag.chunksUsed)
      : (await getSourceMetadata(rag.sources)).map((m) => m.lawName)

  // Katman 1: Sorgu "TBK 2" gibi tanınabiliyorsa doğrudan madde metni (tüm soru tipleri).
  if (parsed && articleResult?.found && articleResult.maddeMetni) {
    let body = articleResult.maddeMetni
    if (body.length > MAX_DIRECT_ARTICLE_CHARS) {
      body = body.slice(0, MAX_DIRECT_ARTICLE_CHARS) + '\n\n[... metin kısaltıldı.]'
    }
    const header = `${articleResult.lawLabel} Madde ${articleResult.article}${articleResult.maddeBasligi ? ' – ' + articleResult.maddeBasligi : ''}`
    const block = `[Doğrudan madde metni – öncelikli kaynak]\n${header}\n\n${body}`
    context = block + (context ? '\n\n---\n\n' + RETRIEVAL_ORDER_NOTE + '\n\n' + context : '')
    sourceLabelsHuman.unshift(`${articleResult.lawLabel} m.${articleResult.article} (doğrudan madde)`)
  }

  return {
    context,
    sources: rag.sources,
    sourceLabelsHuman,
    chunksUsed: rag.chunksUsed ?? [],
    lowConfidence: rag.lowConfidence,
  }
}

export { isFromGuncellemeler }
