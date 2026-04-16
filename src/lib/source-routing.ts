/**
 * Kaynak yönlendirme katmanı (source routing layer).
 * Sorgu sınıfına göre hangi kaynak gruplarının taranacağını ve öncelik sırasını belirler.
 * Yanıt üretiminden önce kullanılır; gereksiz kaynaklar taranmaz, hız artar.
 * Tamamen Türkçe.
 */

import type { QueryType } from '@/lib/query-classifier'

/** Desteklenen kaynak grupları. */
export const SOURCE_GROUP_IDS = [
  'mevzuat',
  'madde-index',
  'konu-notlari',
  'karar-ozetleri',
  'guncel-gelismeler',
] as const

export type SourceGroupId = (typeof SOURCE_GROUP_IDS)[number]

/** Kaynak grubu Türkçe etiketleri. */
export const SOURCE_GROUP_LABELS: Record<SourceGroupId, string> = {
  mevzuat: 'Mevzuat',
  'madde-index': 'Madde indeksi',
  'konu-notlari': 'Konu notları',
  'karar-ozetleri': 'Karar özetleri',
  'guncel-gelismeler': 'Güncel gelişmeler / Haberler',
}

/**
 * Dosya yolu verildiğinde hangi kaynak grubuna ait olduğunu döner.
 * law-data altındaki relative path veya normalize edilmiş path kabul eder.
 */
export function pathToSourceGroup(filePath: string): SourceGroupId {
  const n = filePath.replace(/\\/g, '/').toLowerCase()
  if (n.includes('mevzuat/') || n.includes('core/laws/')) return 'mevzuat'
  if (n.includes('madde-index/') || n.includes('core/article-index/')) return 'madde-index'
  if (n.includes('konu-notlari/') || n.includes('core/topics/')) return 'konu-notlari'
  if (
    n.includes('guncellemeler/recent-important-decisions') ||
    n.includes('derived/updates/recent-important-decisions') ||
    n.includes('recent-important-decisions')
  )
    return 'karar-ozetleri'
  if (n.includes('karar-ozetleri/') || n.includes('cases/decision-summaries/')) return 'karar-ozetleri'
  if (n.includes('guncellemeler/') || n.includes('derived/updates/')) return 'guncel-gelismeler'
  return 'konu-notlari'
}

/**
 * Sorgu tipine göre taranacak kaynak gruplarını öncelik sırasıyla döner.
 * Sadece bu gruplardaki chunk'lar retrieval'a dahil edilir; diğerleri taranmaz.
 *
 * Kurallar:
 * - madde arama -> mevzuat + madde-index
 * - olay analizi -> mevzuat + konu notları + karar özetleri
 * - konu anlatımı -> konu notları + mevzuat
 * - güncel gelişme -> güncel gelişmeler + (resmî güncellemeler aynı grupta)
 * - karar analizi -> karar özetleri + mevzuat
 * - tartışmalı konu -> konu notları + karar özetleri
 */
export function getSourceGroupsForQueryType(queryType: QueryType): SourceGroupId[] {
  switch (queryType) {
    case 'madde_arama':
      return ['mevzuat', 'madde-index']
    case 'olay_analizi':
      return ['mevzuat', 'konu-notlari', 'karar-ozetleri']
    case 'konu_anlatimi':
      return ['konu-notlari', 'mevzuat']
    case 'guncel_gelisme':
      return ['guncel-gelismeler', 'karar-ozetleri']
    case 'karar_analizi':
      return ['karar-ozetleri', 'mevzuat']
    case 'tartismali_konu':
      return ['konu-notlari', 'karar-ozetleri', 'mevzuat']
    case 'mevzuat_sorusu':
      return ['mevzuat', 'madde-index', 'konu-notlari']
    case 'sinav_pratigi':
      return ['mevzuat', 'konu-notlari', 'madde-index', 'karar-ozetleri']
    case 'sohbet_genel':
    default:
      return ['mevzuat', 'madde-index', 'konu-notlari', 'karar-ozetleri', 'guncel-gelismeler']
  }
}

/**
 * Chunk listesini yalnızca izin verilen kaynak gruplarına ait olanlarla filtreler.
 * Index daraltma için kullanılır; gereksiz kaynaklar taranmaz.
 */
export function filterChunksBySourceGroups<T extends { filePath: string }>(
  chunks: T[],
  allowedGroups: SourceGroupId[]
): T[] {
  if (allowedGroups.length === 0) return chunks
  const set = new Set(allowedGroups)
  return chunks.filter((c) => set.has(pathToSourceGroup(c.filePath)))
}
