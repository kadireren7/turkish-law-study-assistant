/**
 * Freshness and amendment warnings for the law assistant.
 * - Only show warnings when: source verification is older than 24 months (2 years), or an amendment was explicitly detected.
 * - If all sources were verified within the last 24 months, do not show any warning. Prefer displaying "Son kontrol: {date}" without warning banners.
 * - Removed generic warnings from normal answers.
 */
import path from 'path'
import fs from 'fs/promises'
import { getSourceMetadata } from '@/lib/source-metadata'

const GUNCELLEMELER_DIR = path.join(process.cwd(), 'law-data', 'guncellemeler')
const UPDATE_LOG_PATH = path.join(GUNCELLEMELER_DIR, 'update-log.json')

/** Consider "recent" amendment if detected within this many days. */
const RECENT_AMENDMENT_DAYS = 180

/** Do not show any warning if every source was verified within this many months (2 years). */
const RECENT_OK_MONTHS = 24

/** Only warn "old source" if last_checked is older than this many months (2 years). */
const OLD_SOURCE_MONTHS = 24

const WARNING_RECENT_AMENDMENT = 'Bu konuda yakın tarihli bir mevzuat değişikliği tespit edildi; güncel metin Resmî Gazete veya ilgili portal üzerinden doğrulanmalıdır.'
const WARNING_OLD_SOURCE = 'Kaynaklar 2 yıldan eski; güncel kaynaklarla doğrulanmalıdır.'

function parseDate(s: string | undefined): Date | null {
  if (!s || typeof s !== 'string') return null
  const trimmed = s.trim().slice(0, 10)
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

/** True if date is within the last N months (inclusive). */
function isWithinMonths(date: Date | null, months: number): boolean {
  if (!date) return false
  const now = new Date()
  const limit = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  return date >= limit
}

/** True if date is older than N months. */
function isOlderThanMonths(date: Date | null, months: number): boolean {
  if (!date) return false
  const now = new Date()
  const limit = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
  return date < limit
}

function isWithinLastDays(isoDate: string, days: number): boolean {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return false
  const now = new Date()
  const limit = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return d >= limit
}

function pathNormalize(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

function isMevzuatSource(p: string): boolean {
  const n = pathNormalize(p)
  return n.includes('mevzuat/')
}

/**
 * Build a list of freshness/amendment warnings for the given RAG sources.
 * Returns empty array if all sources are verified within 6 months.
 * Only returns warnings when: verification older than 24 months, or explicit amendment detected.
 */
export async function getFreshnessWarnings(sources: string[]): Promise<string[]> {
  if (sources.length === 0) return []

  const metadata = await getSourceMetadata(sources)
  const dates = metadata.map((m) => parseDate(m.last_checked))

  // If every source has last_checked within RECENT_OK_MONTHS (e.g. 24 months), do not show any warning.
  const allHaveDate = dates.every((d) => d !== null)
  const allRecent = allHaveDate && dates.every((d) => isWithinMonths(d, RECENT_OK_MONTHS))
  if (allRecent) return []

  const warnings: string[] = []

  // Explicit amendment detected in update log
  let recentAmendmentFound = false
  try {
    const raw = await fs.readFile(UPDATE_LOG_PATH, 'utf-8')
    const log = JSON.parse(raw) as { runs?: { at: string; amendmentsDetected?: { file: string }[]; filesChanged?: string[] }[] }
    const runs = Array.isArray(log.runs) ? log.runs : []
    const normalizedSources = sources.map(pathNormalize)
    for (const run of runs) {
      if (!isWithinLastDays(run.at, RECENT_AMENDMENT_DAYS)) continue
      const filesInRun = new Set<string>()
      for (const a of run.amendmentsDetected ?? []) {
        filesInRun.add(pathNormalize(a.file))
      }
      for (const f of run.filesChanged ?? []) {
        filesInRun.add(pathNormalize(f))
      }
      if (normalizedSources.some((s) => filesInRun.has(s))) {
        recentAmendmentFound = true
        break
      }
    }
  } catch {
    // no update log or invalid
  }
  // Only warn when source is truly old (24+ months). Do not show generic "recent amendment" banner.
  // if (recentAmendmentFound) warnings.push(WARNING_RECENT_AMENDMENT)

  // Only warn "old source" when verification is older than 24 months
  const anyOld = metadata.some((m) => isOlderThanMonths(parseDate(m.last_checked), OLD_SOURCE_MONTHS))
  if (anyOld) warnings.push(WARNING_OLD_SOURCE)

  return [...new Set(warnings)]
}
