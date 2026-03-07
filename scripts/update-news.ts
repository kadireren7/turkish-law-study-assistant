#!/usr/bin/env npx tsx
/**
 * Haber verisi: RSS beslemelerinden gerçek haber çeker.
 *
 * - Resmi Gazete, AYM, Yargıtay, AA, TRT vb. RSS adreslerinden veri alır.
 * - Her öğede: başlık (baslik), tarih (tarih), kaynak, özet (kisaOzet), link, görsel (varsa).
 * - Eksik alanlarda asla hata vermez; sadece o besleme/öğe atlanır.
 * - Sonuçlar en yeni önce sıralanır.
 * - Çıktı: law-data/haberler/hukuk-haberleri.json, law-data/haberler/siyaset-gundemi.json
 *
 * Modlar: --mode=all | law | politics
 * Çalıştırma: npm run news:update | npm run news:update:law | npm run news:update:politics
 */
import path from 'path'
import fs from 'fs/promises'
import Parser from 'rss-parser'

const ROOT = process.cwd()
const HABERLER_DIR = path.join(ROOT, 'law-data', 'haberler')
const HUKUK_PATH = path.join(HABERLER_DIR, 'hukuk-haberleri.json')
const SIYASET_PATH = path.join(HABERLER_DIR, 'siyaset-gundemi.json')
const LAST_UPDATE_PATH = path.join(HABERLER_DIR, 'last-update.json')

const RSS_TIMEOUT_MS = 15_000

/** Hukuk haberleri için RSS beslemeleri (Resmi Gazete, AYM, Yargıtay, AA, büyük siteler). */
const HUKUK_FEEDS: { url: string; kaynak: string; kategori: string }[] = [
  { url: 'https://www.aa.com.tr/rss/ajansguncel.xml', kaynak: 'Anadolu Ajansı', kategori: 'Hukuk / Gündem' },
  { url: 'https://www.trthaber.com/sondakika.rss', kaynak: 'TRT Haber', kategori: 'Gündem' },
  { url: 'https://www.resmigazete.gov.tr/rss.xml', kaynak: 'Resmî Gazete', kategori: 'Resmî Gazete' },
  { url: 'https://www.anayasa.gov.tr/tr/rss/', kaynak: 'Anayasa Mahkemesi', kategori: 'AYM' },
  { url: 'https://www.yargitay.gov.tr/rss', kaynak: 'Yargıtay', kategori: 'Yargıtay' },
]

/** Siyaset gündemi için RSS beslemeleri (AA, TRT, büyük haber siteleri). */
const SIYASET_FEEDS: { url: string; kaynak: string; kategori: string }[] = [
  { url: 'https://www.aa.com.tr/tr/teyithatti/rss/news?cat=politika', kaynak: 'Anadolu Ajansı', kategori: 'Politika' },
  { url: 'https://www.aa.com.tr/rss/ajansguncel.xml', kaynak: 'Anadolu Ajansı', kategori: 'Gündem' },
  { url: 'https://www.trthaber.com/sondakika.rss', kaynak: 'TRT Haber', kategori: 'Son Dakika' },
]

/** Canonical news item: all fields required for clean JSON output. */
export type NewsItem = {
  baslik: string
  tarih: string
  kaynak: string
  kisaOzet: string
  nedenOnemli: string
  kategori: string
  imageUrl: string | null
  link: string | null
}

type Feed = {
  lastUpdated: string | null
  isExampleData: boolean
  items: NewsItem[]
}

function getMode(): 'all' | 'law' | 'politics' {
  const arg = process.argv.find((a) => a.startsWith('--mode='))
  if (arg) {
    const v = arg.split('=')[1]?.toLowerCase()
    if (v === 'law' || v === 'politics' || v === 'all') return v
  }
  const env = process.env.NEWS_UPDATE_MODE?.toLowerCase()
  if (env === 'law' || env === 'politics' || env === 'all') return env
  return 'all'
}

function getCurrentDateString(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Parse date; returns 0 if missing or invalid. Never throws. */
function parseIsoDate(s: string | undefined | null): number {
  if (s == null || typeof s !== 'string') return 0
  const trimmed = String(s).trim().slice(0, 10)
  if (!trimmed) return 0
  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? 0 : d.getTime()
}

/** Sort by date descending (newest first). Missing/invalid dates go to end. Never throws. */
function sortByNewestFirst(items: NewsItem[]): NewsItem[] {
  if (!Array.isArray(items)) return []
  return [...items].sort((a, b) => {
    try {
      return parseIsoDate(b.tarih) - parseIsoDate(a.tarih)
    } catch {
      return 0
    }
  })
}

/** Normalize raw input to canonical item. Missing/invalid values become "" or null. Never throws. */
function normalizeItem(raw: Record<string, unknown>): NewsItem {
  try {
    return {
      baslik: typeof raw.baslik === 'string' ? raw.baslik : '',
      tarih: typeof raw.tarih === 'string' ? raw.tarih : '',
      kaynak: typeof raw.kaynak === 'string' ? raw.kaynak : '',
      kisaOzet: typeof raw.kisaOzet === 'string' ? raw.kisaOzet : '',
      nedenOnemli: typeof raw.nedenOnemli === 'string' ? raw.nedenOnemli : '',
      kategori: typeof raw.kategori === 'string' ? raw.kategori : '',
      imageUrl: typeof raw.imageUrl === 'string' && raw.imageUrl.trim() ? raw.imageUrl.trim() : null,
      link: typeof raw.link === 'string' && raw.link.trim() ? raw.link.trim() : null,
    }
  } catch {
    return {
      baslik: '',
      tarih: '',
      kaynak: '',
      kisaOzet: '',
      nedenOnemli: '',
      kategori: '',
      imageUrl: null,
      link: null,
    }
  }
}

/** Güvenli metin: eksik/geçersiz alan boş döner, asla hata fırlatmaz. */
function safeStr(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

/** HTML metninden ilk <img src="..."> URL'sini çıkarır; yoksa null. Asla hata fırlatmaz. */
function getImageFromHtml(html: unknown): string | null {
  if (html == null || typeof html !== 'string' || !html.trim()) return null
  try {
    // Önce media/content'teki img, yoksa genel img
    const m = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i)
    if (m && m[1]) {
      const url = m[1].trim()
      if (url.startsWith('http://') || url.startsWith('https://')) return url
    }
    return null
  } catch {
    return null
  }
}

/** Nesneden URL çıkar (media:content / media:thumbnail parse sonucu). */
function getUrlFromMediaObj(media: unknown): string | null {
  if (media == null || typeof media !== 'object') return null
  const o = media as Record<string, unknown>
  const url = o.url ?? o['$']?.['url'] ?? (Array.isArray(o) ? o[0] : null)
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) return url.trim()
  if (typeof url === 'object' && url !== null && typeof (url as { url?: string }).url === 'string')
    return (url as { url: string }).url.trim()
  return null
}

/** RSS öğesinden görsel URL al (imageUrl, enclosure, media:content, HTML içerik); yoksa null. Asla hata fırlatmaz. */
function getImageFromRssItem(
  item: { enclosure?: { url?: string }; content?: string; imageUrl?: string; [key: string]: unknown }
): string | null {
  try {
    // TRT Haber vb.: doğrudan <imageUrl> etiketi
    const direct = item.imageUrl
    if (typeof direct === 'string' && (direct.startsWith('http://') || direct.startsWith('https://')))
      return direct.trim()
    const enc = item.enclosure
    if (enc && typeof enc === 'object' && typeof enc.url === 'string' && enc.url.trim()) return enc.url.trim()
    const media = item['media:content'] ?? item['media:thumbnail'] ?? item.mediaContent ?? item.mediaThumbnail
    const mediaUrl = getUrlFromMediaObj(media)
    if (mediaUrl) return mediaUrl
    // Görsel HTML içerikte (description/content:encoded) gömülü olabilir
    const content = item.content ?? item.contentEncoded ?? item['content:encoded']
    return getImageFromHtml(content) ?? null
  } catch {
    return null
  }
}

/** RSS öğesinden ISO tarih (YYYY-MM-DD); geçersizse boş. */
function getIsoDateFromItem(item: { pubDate?: string; isoDate?: string; [key: string]: unknown }): string {
  try {
    const raw = item.isoDate ?? item.pubDate
    const s = safeStr(raw)
    if (!s) return ''
    const d = new Date(s)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

/** Tek bir RSS beslemesini çek; hata olursa boş dizi döner, asla crash etmez. */
async function fetchOneRssFeed(
  url: string,
  kaynak: string,
  kategori: string,
  parser: Parser
): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(url)
    const items: NewsItem[] = []
    const entries = feed?.items ?? []
    for (const entry of entries) {
      try {
        const baslik = safeStr(entry.title)
        const link = safeStr(entry.link) || null
        if (!baslik && !link) continue
        const tarih = getIsoDateFromItem(entry)
        const kisaOzet = safeStr(entry.contentSnippet ?? entry.content ?? '')
        const imageUrl = getImageFromRssItem(entry as Parameters<typeof getImageFromRssItem>[0]) || null
        items.push({
          baslik: baslik || '(Başlıksız)',
          tarih,
          kaynak,
          kisaOzet,
          nedenOnemli: '',
          kategori,
          imageUrl,
          link,
        })
      } catch {
        // tek öğe hata verirse atla
      }
    }
    return items
  } catch {
    return []
  }
}

/** Tüm beslemeleri çek, birleştir, en yeni önce sırala. */
async function fetchAllFeeds(
  feeds: { url: string; kaynak: string; kategori: string }[]
): Promise<NewsItem[]> {
  const parser = new Parser({
    timeout: RSS_TIMEOUT_MS,
    headers: { 'User-Agent': 'HukukHaberleriBot/1.0' },
    customFields: {
      item: [
        ['media:content', 'mediaContent'],
        ['media:thumbnail', 'mediaThumbnail'],
        ['content:encoded', 'contentEncoded'],
        'imageUrl', // TRT Haber vb. beslemelerde kullanılıyor
      ],
    },
  })
  const results: NewsItem[] = []
  for (const f of feeds) {
    const items = await fetchOneRssFeed(f.url, f.kaynak, f.kategori, parser)
    if (items.length > 0) results.push(...items)
  }
  return sortByNewestFirst(results)
}

/** Keep item if it has at least one of title, date, source, imageUrl, link. */
function isKeepable(item: NewsItem): boolean {
  return !!(item.baslik?.trim() || item.tarih?.trim() || item.kaynak?.trim() || item.imageUrl || item.link)
}

/** Serialize item for clean JSON: fixed key order, null for empty optional URLs. */
function toCleanItem(item: NewsItem): Record<string, string | null> {
  return {
    baslik: item.baslik || '',
    tarih: item.tarih || '',
    kaynak: item.kaynak || '',
    kisaOzet: item.kisaOzet || '',
    nedenOnemli: item.nedenOnemli || '',
    kategori: item.kategori || '',
    imageUrl: item.imageUrl || null,
    link: item.link || null,
  }
}

async function loadFeed(filePath: string): Promise<Feed> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as {
      lastUpdated?: string | null
      isExampleData?: boolean
      items?: unknown[]
    }
    const rawItems = Array.isArray(data.items) ? data.items : []
    const lastUpdated =
      typeof data.lastUpdated === 'string' && data.lastUpdated.trim()
        ? data.lastUpdated.trim()
        : null
    const isExampleData = Boolean(data.isExampleData)
    const items: NewsItem[] = []
    for (const o of rawItems) {
      if (!o || typeof o !== 'object') continue
      const item = normalizeItem(o as Record<string, unknown>)
      if (isKeepable(item)) items.push(item)
    }
    return { lastUpdated, isExampleData, items }
  } catch {
    return { lastUpdated: null, isExampleData: true, items: [] }
  }
}

function placeholderItem(kind: 'law' | 'politics'): NewsItem {
  const today = getCurrentDateString()
  if (kind === 'law') {
    return {
      baslik: '[ÖRNEK / TEST] Hukuk haberleri – canlı veri henüz eklenmedi',
      tarih: today,
      kaynak: 'Örnek veri (npm run news:update:law ile güncellenir)',
      kisaOzet: 'Resmî Gazete, Yargıtay, AYM vb. kaynaklardan veri eklendiğinde burada listelenecektir.',
      nedenOnemli: 'Bu kayıt test amaçlıdır; gerçek güncel kaynaklardan çekilmemiştir.',
      kategori: 'Örnek',
      imageUrl: null,
      link: null,
    }
  }
  return {
    baslik: '[ÖRNEK / TEST] Siyaset gündemi – canlı veri henüz eklenmedi',
    tarih: today,
    kaynak: 'Örnek veri (npm run news:update:politics ile güncellenir)',
    kisaOzet: 'Güvenilir haber kaynaklarından veri eklendiğinde burada listelenecektir.',
    nedenOnemli: 'Bu kayıt test amaçlıdır; gerçek güncel kaynaklardan çekilmemiştir.',
    kategori: 'Örnek',
    imageUrl: null,
    link: null,
  }
}

/** Build feed JSON for clean output: all items with canonical shape. */
function feedToJson(feed: Feed): string {
  const output = {
    lastUpdated: feed.lastUpdated,
    isExampleData: feed.isExampleData,
    items: feed.items.map(toCleanItem),
  }
  return JSON.stringify(output, null, 2)
}

async function saveFeedAtomic(filePath: string, feed: Feed): Promise<void> {
  const tmpPath = filePath + '.tmp.' + Date.now()
  await fs.writeFile(tmpPath, feedToJson(feed), 'utf-8')
  await fs.rename(tmpPath, filePath)
}

/** RSS'den veri çekip dosyaya yazar. Çekilen veri yoksa mevcut dosyayı veya placeholder kullanır. */
async function updateFileFromRss(
  filePath: string,
  feeds: { url: string; kaynak: string; kategori: string }[],
  kind: 'law' | 'politics'
): Promise<{ after: number }> {
  let items: NewsItem[] = []
  try {
    items = await fetchAllFeeds(feeds)
  } catch {
    // RSS toplu hata: mevcut dosyayı koruyoruz
  }
  if (items.length === 0) {
    const existing = await loadFeed(filePath)
    if (existing.items.length > 0) {
      items = sortByNewestFirst(existing.items)
    } else {
      items = [placeholderItem(kind)]
    }
  }
  const next: Feed = {
    lastUpdated: getCurrentDateString(),
    isExampleData: items.length === 1 && items[0]?.kaynak?.includes('Örnek veri'),
    items,
  }
  await saveFeedAtomic(filePath, next)
  return { after: items.length }
}

async function writeLastSuccessfulUpdate(iso: string): Promise<void> {
  const payload = { lastSuccessfulUpdate: iso }
  const tmpPath = LAST_UPDATE_PATH + '.tmp.' + Date.now()
  await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), 'utf-8')
  await fs.rename(tmpPath, LAST_UPDATE_PATH)
}

async function main(): Promise<void> {
  const mode = getMode()
  await fs.mkdir(HABERLER_DIR, { recursive: true })

  const runDate = new Date().toISOString()
  console.log('Haberler güncelleme –', runDate.slice(0, 19), '[mod:', mode + ']')

  try {
    if (mode === 'all' || mode === 'law') {
      const r = await updateFileFromRss(HUKUK_PATH, HUKUK_FEEDS, 'law')
      console.log('  hukuk-haberleri.json:', r.after, 'madde (en yeni önce)')
    }
    if (mode === 'all' || mode === 'politics') {
      const r = await updateFileFromRss(SIYASET_PATH, SIYASET_FEEDS, 'politics')
      console.log('  siyaset-gundemi.json:', r.after, 'madde (en yeni önce)')
    }
    await writeLastSuccessfulUpdate(runDate)
    console.log('  last-update.json güncellendi.')
    console.log('Bitti.')
  } catch (err) {
    console.error('Hata:', err)
    console.error('Mevcut veriler korundu; dosyalar güncellenmedi.')
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
