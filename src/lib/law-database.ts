import path from 'path'
import fs from 'fs/promises'

const LAW_FILES = ['anayasa.md', 'tck.md', 'tmk.md', 'tbk.md', 'idare.md'] as const
const MAX_TOTAL_CHARS = 32000 // leave room for system prompt and conversation

/**
 * Loads all law-data markdown files and returns a single string for AI context.
 * This is the structured legal source for the source-grounded architecture:
 * the AI must answer using only this material; no invented articles, decisions, or dates.
 * Used by chat, case, exam-practice, lesson, quiz, flashcards APIs.
 * Files: anayasa, tck, tmk, tbk, idare (articles, definitions, explanations, examples).
 * Prefer official/current content in law-data; future: updater-generated data can be merged here.
 */
export async function getLawDatabaseContext(): Promise<string> {
  const baseDir = path.join(process.cwd(), 'law-data', 'mevzuat')
  const parts: string[] = []
  const fileLabels: Record<string, string> = {
    'anayasa.md': 'ANAYASA',
    'tck.md': 'TCK',
    'tmk.md': 'TMK',
    'tbk.md': 'TBK',
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
  if (full.length > MAX_TOTAL_CHARS) {
    return full.slice(0, MAX_TOTAL_CHARS) + '\n\n[... metin kısaltıldı; tam metin için law-data dosyalarına bakınız.]'
  }
  return full
}
