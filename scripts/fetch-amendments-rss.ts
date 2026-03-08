#!/usr/bin/env npx tsx
/**
 * Son mevzuat değişikliklerini Mevzuat.Net RSS'inden otomatik çeker.
 * Resmî Gazete (resmigazete.gov.tr) kamuya açık API/RSS sunmadığı için
 * mevzuat portallarından biri olan Mevzuat.Net RSS kullanılır.
 *
 * Çıktı: law-data/guncellemeler/input/amendments-from-rss.json
 * Bu dosya update-legal-data tarafından okunup recent-amendments.md'ye yansıtılır.
 *
 * Kullanım: npm run amendments:fetch
 */
import path from 'path'
import fs from 'fs/promises'
import Parser from 'rss-parser'

const ROOT = process.cwd()
const INPUT_DIR = path.join(ROOT, 'law-data', 'guncellemeler', 'input')
const RSS_OUTPUT_PATH = path.join(INPUT_DIR, 'amendments-from-rss.json')

const RSS_URL = 'https://www.mevzuat.net/rss.aspx?f=s'
const RSS_TIMEOUT_MS = 20_000
const MAX_ITEMS = 50 // Son 50 öğe (günlük sayı + değişiklik özetleri)
const DESCRIPTION_MAX_LEN = 500

type RssAmendment = {
  lawName: string
  date: string
  source: string
  summary: string
  link?: string
}

const parser = new Parser({ timeout: RSS_TIMEOUT_MS })

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function parsePubDate(pubDate: string | undefined): string | null {
  if (!pubDate) return null
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/** Resmî Gazete sayı numarasını başlıktan çıkar (örn. "07 Mart 2026 Tarihli, 33189 Sayılı Resmi Gazete" -> 33189). */
function extractGazeteSayi(title: string): string | null {
  const m = title.match(/(\d{5,})\s*Sayılı?\s*Resmi\s*Gazete/i) || title.match(/sayı\s*(\d{5,})/i)
  return m ? m[1] : null
}

async function fetchAmendmentsFromRss(): Promise<RssAmendment[]> {
  const feed = await parser.parseURL(RSS_URL)
  const out: RssAmendment[] = []
  const seen = new Set<string>()

  const items = (feed.items || []).slice(0, MAX_ITEMS)

  for (const item of items) {
    const title = (item.title || '').trim()
    if (!title) continue

    const date = parsePubDate(item.pubDate)
    const dateStr = date || new Date().toISOString().slice(0, 10)
    const dedupKey = `${dateStr}|${title.slice(0, 80)}`
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)

    const rawDesc = item.contentSnippet || item.content || item.description || ''
    const summary = stripHtml(String(rawDesc)).slice(0, DESCRIPTION_MAX_LEN)
    const sayi = extractGazeteSayi(title)
    const source = sayi
      ? `Resmî Gazete, sayı ${sayi}, ${dateStr} (Mevzuat.Net özeti)`
      : `Resmî Gazete / Mevzuat.Net, ${dateStr}`

    out.push({
      lawName: title,
      date: dateStr,
      source,
      summary: summary || title,
      link: item.link,
    })
  }

  return out
}

async function main(): Promise<void> {
  console.log('Mevzuat değişiklikleri RSS çekiliyor:', RSS_URL)

  let items: RssAmendment[]
  try {
    items = await fetchAmendmentsFromRss()
  } catch (err) {
    console.error('RSS çekilemedi:', err)
    process.exit(1)
  }

  await fs.mkdir(INPUT_DIR, { recursive: true })
  await fs.writeFile(
    RSS_OUTPUT_PATH,
    JSON.stringify(items, null, 2),
    'utf-8'
  )

  console.log('Yazıldı:', RSS_OUTPUT_PATH)
  console.log('Öğe sayısı:', items.length)
  console.log('Sonraki adım: npm run legal:update ile recent-amendments.md güncellenir.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
