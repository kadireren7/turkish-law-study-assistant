/**
 * Shared legal knowledge layer: source-aware retrieval used by Sohbet, Madde Ara,
 * Olay Analizi, Pratik Çöz, Konu Anlatımı, Haberler. All modules use the same
 * retrieval and human-readable source display.
 * Supports query-type-based source routing (mevzuat, konu notları, karar özetleri, güncel gelişmeler).
 */
import OpenAI from 'openai'
import { retrieveForQuery, type RagResult, type ChunkRef, type SourceTierOverrides } from '@/lib/law-rag'
import { getSourceMetadata, toHumanReadableSourceLabels, isFromGuncellemeler } from '@/lib/source-metadata'
import type { QueryType } from '@/lib/query-classifier'
import { getSourceGroupsForQueryType } from '@/lib/source-routing'

export type RetrievalResult = {
  context: string
  sources: string[]
  sourceLabelsHuman: string[]
  chunksUsed: ChunkRef[]
  lowConfidence: boolean
}

const DEFAULT_TOP_K = 6

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

/**
 * Single entry point for legal retrieval. Scans local legal data, retrieves
 * relevant content, returns context and human-readable source labels for display.
 * When queryType is provided, applies source routing (prioritize mevzuat / konu notları / karar özetleri / güncel gelişmeler).
 */
export async function getRetrievalResult(
  query: string,
  openai: OpenAI,
  topK: number = DEFAULT_TOP_K,
  options?: { queryType?: QueryType }
): Promise<RetrievalResult> {
  const queryType = options?.queryType
  const sourceTierOverrides = queryType ? SOURCE_TIER_BY_QUERY_TYPE[queryType] : undefined
  const allowedSourceGroups = queryType ? getSourceGroupsForQueryType(queryType) : undefined
  const rag: RagResult = await retrieveForQuery(query, openai, topK, {
    sourceTierOverrides,
    allowedSourceGroups,
  })
  const sourceLabelsHuman =
    rag.chunksUsed && rag.chunksUsed.length > 0
      ? toHumanReadableSourceLabels(rag.chunksUsed)
      : (await getSourceMetadata(rag.sources)).map((m) => m.lawName)

  return {
    context: rag.context,
    sources: rag.sources,
    sourceLabelsHuman,
    chunksUsed: rag.chunksUsed ?? [],
    lowConfidence: rag.lowConfidence,
  }
}

export { isFromGuncellemeler }
