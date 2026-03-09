/**
 * Answer confidence levels for the legal AI assistant.
 * Source-based: how strongly the answer is supported by local mevzuat / retrieved sources.
 * Labels are fully Turkish; used in Sohbet, Olay Analizi, Konu Anlatımı, Sınav Pratiği.
 */

import type { RetrievalResult } from '@/lib/legal-brain'
import type { QueryType } from '@/lib/query-classifier'

export type ConfidenceLevel = 'yuksek' | 'orta' | 'dusuk'

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  yuksek: 'Yüksek güven',
  orta: 'Orta güven',
  dusuk: 'Düşük güven',
}

export type ComputeConfidenceOptions = {
  lowConfidence: boolean
  contextLength: number
  sourcesCount: number
  queryType?: QueryType
}

/**
 * Computes answer confidence from retrieval state.
 * - Yüksek güven: direct support from local mevzuat or strong source-backed material
 * - Orta güven: source-backed but includes interpretation or incomplete coverage
 * - Düşük güven: limited source support, incomplete local data, or highly debated issue
 */
export function computeAnswerConfidence(options: ComputeConfidenceOptions): ConfidenceLevel {
  const { lowConfidence, contextLength, sourcesCount, queryType } = options

  if (lowConfidence || sourcesCount === 0) return 'dusuk'

  if (queryType === 'tartismali_konu') return 'orta'

  if (contextLength >= 1500 && sourcesCount >= 2) return 'yuksek'

  if (contextLength >= 600 && sourcesCount >= 1) return 'orta'

  return 'dusuk'
}

/**
 * Removes the "Güven: Yüksek/Orta/Düşük güven" line from reply content so only the badge is shown.
 */
export function stripConfidenceFromReplyContent(content: string): string {
  return content
    .replace(/\n?\s*\*\*Güven:\*\*\s*(Yüksek|Orta|Düşük) güven\s*/gi, '')
    .replace(/\n?\s*Güven:\s*(Yüksek|Orta|Düşük) güven\s*/gi, '')
    .trim()
}

/**
 * Convenience: compute confidence from a RetrievalResult and optional queryType.
 */
export function confidenceFromRetrieval(
  retrieval: RetrievalResult,
  queryType?: QueryType
): ConfidenceLevel {
  return computeAnswerConfidence({
    lowConfidence: retrieval.lowConfidence,
    contextLength: retrieval.context.length,
    sourcesCount: retrieval.sources.length,
    queryType,
  })
}
