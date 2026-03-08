/**
 * Legal updates summary for the assistant: recent amendments and important decisions.
 * Read from law-data/guncellemeler so the model is aware of recent legal developments.
 * Updates are populated by scripts/update-legal-data (npm run legal:update, legal:update:daily, legal:update:weekly).
 */
import path from 'path'
import fs from 'fs/promises'

const GUNCELLEMELER_DIR = path.join(process.cwd(), 'law-data', 'guncellemeler')
const MAX_SUMMARY_CHARS = 2500
const CACHE_MS = 5 * 60 * 1000 // 5 minutes

let cachedSummary: string | null = null
let cachedAt = 0

export async function getLegalUpdatesSummary(): Promise<string> {
  const now = Date.now()
  if (cachedSummary !== null && now - cachedAt < CACHE_MS) return cachedSummary

  const parts: string[] = []
  try {
    const amendmentsPath = path.join(GUNCELLEMELER_DIR, 'recent-amendments.md')
    const amendments = await fs.readFile(amendmentsPath, 'utf-8').catch(() => '')
    if (amendments.trim()) {
      const truncated =
        amendments.length > MAX_SUMMARY_CHARS
          ? amendments.slice(0, MAX_SUMMARY_CHARS) + '\n\n[...]'
          : amendments
      parts.push('## Son mevzuat değişiklikleri (özet)\n' + truncated)
    }
  } catch {
    // ignore
  }
  try {
    const decisionsPath = path.join(GUNCELLEMELER_DIR, 'recent-important-decisions.md')
    const decisions = await fs.readFile(decisionsPath, 'utf-8').catch(() => '')
    if (decisions.trim()) {
      const truncated =
        decisions.length > MAX_SUMMARY_CHARS
          ? decisions.slice(0, MAX_SUMMARY_CHARS) + '\n\n[...]'
          : decisions
      parts.push('## Son önemli kararlar (Yargıtay / AYM özet)\n' + truncated)
    }
  } catch {
    // ignore
  }
  if (parts.length === 0) return ''
  const result =
    '\n\n---\n\nAşağıdaki bölüm güncel hukuki gelişmeler hakkında özet içerir. Soru bu konularla ilgiliyse dikkate al.\n\n' +
    parts.join('\n\n')
  cachedSummary = result
  cachedAt = Date.now()
  return result
}
