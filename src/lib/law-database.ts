import path from 'path'
import fs from 'fs/promises'

const LAW_FILES = ['anayasa.md', 'tck.md', 'tmk.md', 'tbk.md', 'cmk.md', 'hmk.md', 'idare.md'] as const
const MAX_TOTAL_CHARS = 24000 // leave room for system prompt; smaller = faster
const EXAM_CONTEXT_MAX_CHARS = 12000 // smaller context for faster exam question generation

/** In-memory cache for law context to avoid repeated file reads (e.g. multiple questions). */
let cachedContext: string | null = null
let cachedShortContext: string | null = null

/**
 * Loads all law-data markdown files and returns a single string for AI context.
 * Uses in-memory cache to reduce file I/O across requests.
 * Used by chat, case, exam-practice, lesson, quiz, flashcards APIs.
 */
export async function getLawDatabaseContext(): Promise<string> {
  if (cachedContext) return cachedContext
  const baseDir = path.join(process.cwd(), 'law-data', 'mevzuat')
  const parts: string[] = []
  const fileLabels: Record<string, string> = {
    'anayasa.md': 'ANAYASA',
    'tck.md': 'TCK',
    'tmk.md': 'TMK',
    'tbk.md': 'TBK',
    'cmk.md': 'CMK',
    'hmk.md': 'HMK',
    'idare.md': 'İDARE HUKUKU',
  }

  for (const file of LAW_FILES) {
    try {
      const filePath = path.join(baseDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const name = fileLabels[file] ?? file.replace('.md', '').toUpperCase()
      parts.push(`## ${name}\n${content}`)
    } catch (e) {
      console.warn(`law-data: could not read ${file}`, e)
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
