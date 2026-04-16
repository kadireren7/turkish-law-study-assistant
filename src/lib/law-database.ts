import path from 'path'
import { readFileCachedUtf8 } from '@/lib/cache/legalFileCache'
import { CORE_LAWS_DIR } from '@/lib/config/data-paths'

/** Mevzuat files to load; order matters for priority in context. */
const LAW_FILES = [
  'anayasa.md',
  'tck.md',
  'tmk.md',
  'tbk.md',
  'cmk.md',
  'hmk.md',
  'iik.md',
  'ttk.md',
  'kabahatler.md',
  'is-kanunu.md',
  'idari-yargilama-usulu.md',
  'idare.md',
] as const

const MAX_TOTAL_CHARS = 32000 // room for system prompt and more laws
const EXAM_CONTEXT_MAX_CHARS = 14000

/** Human-readable labels for mevzuat (do not show raw file names in UI). */
export const MEVZUAT_DISPLAY_LABELS: Record<string, string> = {
  'anayasa.md': 'Türkiye Cumhuriyeti Anayasası (2709)',
  'tck.md': 'Türk Ceza Kanunu (5237)',
  'tmk.md': 'Türk Medeni Kanunu (4721)',
  'tbk.md': 'Türk Borçlar Kanunu (6098)',
  'cmk.md': 'Ceza Muhakemesi Kanunu (5271)',
  'hmk.md': 'Hukuk Muhakemeleri Kanunu (6100)',
  'iik.md': 'İcra ve İflas Kanunu (2004)',
  'ttk.md': 'Türk Ticaret Kanunu (6102)',
  'kabahatler.md': 'Kabahatler Kanunu (5326)',
  'is-kanunu.md': 'İş Kanunu (4857)',
  'idari-yargilama-usulu.md': 'İdari Yargılama Usulü Kanunu (2577)',
  'idare.md': 'İdare Hukuku',
}

let cachedContext: string | null = null
let cachedShortContext: string | null = null

export function invalidateLawDatabaseCache(): void {
  cachedContext = null
  cachedShortContext = null
}

/**
 * Loads canonical mevzuat (`data/core/laws`) and returns a single string for AI context.
 * Uses in-memory cache. Used by chat, case, exam-practice, lesson, quiz, flashcards.
 */
export async function getLawDatabaseContext(): Promise<string> {
  if (cachedContext) return cachedContext
  const baseDir = CORE_LAWS_DIR
  const parts: string[] = []

  for (const file of LAW_FILES) {
    try {
      const filePath = path.join(baseDir, file)
      const content = await readFileCachedUtf8(filePath)
      const name = MEVZUAT_DISPLAY_LABELS[file] ?? file.replace('.md', '').toUpperCase()
      parts.push(`## ${name}\n${content}`)
    } catch (e) {
      console.warn(`mevzuat: could not read ${file}`, e)
    }
  }

  const full = parts.join('\n\n---\n\n')
  const result =
    full.length > MAX_TOTAL_CHARS
      ? full.slice(0, MAX_TOTAL_CHARS) + '\n\n[... metin kısaltıldı.]'
      : full
  cachedContext = result
  return result
}

/**
 * Shorter law context for exam question generation to improve response time.
 * Cached in memory.
 */
export async function getLawDatabaseContextShort(): Promise<string> {
  if (cachedShortContext) return cachedShortContext
  const full = await getLawDatabaseContext()
  const result =
    full.length > EXAM_CONTEXT_MAX_CHARS
      ? full.slice(0, EXAM_CONTEXT_MAX_CHARS) + '\n\n[... metin kısaltıldı.]'
      : full
  cachedShortContext = result
  return cachedShortContext
}
