/**
 * Legal updates and news summary for the assistant.
 * Reads law-data/guncellemeler (amendments, decisions, update-log) and law-data/haberler/hukuk-haberleri.json
 * so the model answers current-legal questions from updated local data.
 * Populated by npm run daily:update (amendments:fetch, legal:update, news:update).
 */
import path from 'path'
import fs from 'fs/promises'

const LAW_DATA = path.join(process.cwd(), 'law-data')
const GUNCELLEMELER_DIR = path.join(LAW_DATA, 'guncellemeler')
const HABERLER_DIR = path.join(LAW_DATA, 'haberler')
const UPDATE_LOG_PATH = path.join(GUNCELLEMELER_DIR, 'update-log.json')
const HUKUK_HABERLERI_PATH = path.join(HABERLER_DIR, 'hukuk-haberleri.json')

const MAX_AMENDMENTS_CHARS = 3200
const MAX_DECISIONS_CHARS = 2400
const MAX_NEWS_ITEMS = 12
const MAX_NEWS_ITEM_CHARS = 180
const CACHE_MS = 5 * 60 * 1000 // 5 minutes

let cachedSummary: string | null = null
let cachedAt = 0

type UpdateLog = { lastRun?: string }
type NewsFeed = { lastUpdated?: string; isExampleData?: boolean; items?: { baslik?: string; tarih?: string; kisaOzet?: string; kaynak?: string }[] }

async function getLastRunFromUpdateLog(): Promise<string | null> {
  try {
    const raw = await fs.readFile(UPDATE_LOG_PATH, 'utf-8')
    const log = JSON.parse(raw) as UpdateLog
    const run = log.lastRun
    if (typeof run === 'string' && run.trim()) return run.trim().slice(0, 10)
  } catch {
    // ignore
  }
  return null
}

async function getNewsSummary(): Promise<{ text: string; lastUpdated: string | null }> {
  try {
    const raw = await fs.readFile(HUKUK_HABERLERI_PATH, 'utf-8')
    const data = JSON.parse(raw) as NewsFeed
    const items = Array.isArray(data.items) ? data.items : []
    const lastUpdated = typeof data.lastUpdated === 'string' && data.lastUpdated.trim() ? data.lastUpdated.trim().slice(0, 10) : null
    if (items.length === 0) return { text: '', lastUpdated }

    const lines: string[] = []
    for (let i = 0; i < Math.min(MAX_NEWS_ITEMS, items.length); i++) {
      const it = items[i]
      const title = typeof it.baslik === 'string' ? it.baslik.trim() : ''
      const date = typeof it.tarih === 'string' ? it.tarih.trim().slice(0, 10) : ''
      const summary = typeof it.kisaOzet === 'string' ? it.kisaOzet.trim().slice(0, MAX_NEWS_ITEM_CHARS) : ''
      if (!title && !summary) continue
      lines.push(`- **${title || 'Haber'}**${date ? ` (${date})` : ''}${summary ? ': ' + summary + (it.kisaOzet && it.kisaOzet.length > MAX_NEWS_ITEM_CHARS ? '…' : '') : ''}`)
    }
    const text = lines.length ? '## Güncel hukuk haberleri\n\n' + lines.join('\n') + (lastUpdated ? `\n\n*Son güncelleme: ${lastUpdated}*` : '') : ''
    return { text, lastUpdated }
  } catch {
    return { text: '', lastUpdated: null }
  }
}

/**
 * Builds the full "current developments" block for the AI: amendments, decisions, news, last-run.
 * Used by chat and any route that needs to answer from updated local data.
 */
export async function getLegalUpdatesSummary(): Promise<string> {
  const now = Date.now()
  if (cachedSummary !== null && now - cachedAt < CACHE_MS) return cachedSummary

  const parts: string[] = []
  const lastRun = await getLastRunFromUpdateLog()

  try {
    const amendmentsPath = path.join(GUNCELLEMELER_DIR, 'recent-amendments.md')
    const amendments = await fs.readFile(amendmentsPath, 'utf-8').catch(() => '')
    if (amendments.trim()) {
      const truncated =
        amendments.length > MAX_AMENDMENTS_CHARS
          ? amendments.slice(0, MAX_AMENDMENTS_CHARS) + '\n\n[...]'
          : amendments
      parts.push('## Son mevzuat değişiklikleri özeti\n' + truncated)
    }
  } catch {
    // ignore
  }

  try {
    const decisionsPath = path.join(GUNCELLEMELER_DIR, 'recent-important-decisions.md')
    const decisions = await fs.readFile(decisionsPath, 'utf-8').catch(() => '')
    if (decisions.trim()) {
      const truncated =
        decisions.length > MAX_DECISIONS_CHARS
          ? decisions.slice(0, MAX_DECISIONS_CHARS) + '\n\n[...]'
          : decisions
      parts.push('## Son önemli kararlar özeti (Yargıtay / AYM)\n' + truncated)
    }
  } catch {
    // ignore
  }

  const { text: newsText } = await getNewsSummary()
  if (newsText) parts.push(newsText)

  if (parts.length === 0) {
    cachedSummary = ''
    cachedAt = Date.now()
    return ''
  }

  const header =
    '\n\n---\n\n**Güncel kaynaklar (yerel güncelleme)**\n' +
    (lastRun ? `Son tam güncelleme (pipeline): ${lastRun}. ` : '') +
    'Aşağıdaki bölümler güncel mevzuat değişiklikleri, önemli kararlar ve hukuk haberlerini içerir. Soru güncel gelişmelerle ilgiliyse yanıtını önce bu bölümlere dayandır.\n\n'

  const result = header + parts.join('\n\n')
  cachedSummary = result
  cachedAt = Date.now()
  return result
}
