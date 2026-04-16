import { clearLegalFileCache } from '@/lib/cache/legalFileCache'
import { invalidateLawRagIndex } from '@/lib/law-rag'
import { invalidateLawDatabaseCache } from '@/lib/law-database'

/** Geliştirme veya ingest sonrası tüm hukuk önbelleklerini temizler. */
export function resetAllLegalCaches(): void {
  clearLegalFileCache()
  invalidateLawRagIndex()
  invalidateLawDatabaseCache()
}
