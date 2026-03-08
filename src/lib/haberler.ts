/**
 * Haberler sayfası: law-data/haberler içindeki JSON dosyalarını okur.
 * Tüm kayıtlar gösterilir; en yeni tarih önce sıralanır.
 * Örnek/gerçek veri etiketlemesi ve kaynak şeffaflığı korunur.
 */
import path from 'path'
import fs from 'fs/promises'

const HABERLER_DIR = path.join(process.cwd(), 'law-data', 'haberler')
const HUKUK_PATH = path.join(HABERLER_DIR, 'hukuk-haberleri.json')
const LAST_UPDATE_PATH = path.join(HABERLER_DIR, 'last-update.json')

export type HaberItem = {
  baslik: string
  tarih: string
  kaynak: string
  kisaOzet: string
  nedenOnemli: string
  kategori: string
  imageUrl?: string | null
  link?: string | null
}

export type HaberlerFeed = {
  lastUpdated: string | null
  isExampleData: boolean
  items: HaberItem[]
}

export type HaberlerPageData = {
  hukukHaberleri: HaberItem[]
  hukukMeta: { lastUpdated: string | null; isExampleData: boolean }
  currentDateFormatted: string
  hasRealUpdate: boolean
  lastSuccessfulUpdate: string | null
}

/** Parse date string. Returns 0 if missing or invalid. Never throws. */
function parseIsoDate(s: string | undefined | null): number {
  try {
    if (s == null || typeof s !== 'string') return 0
    const trimmed = String(s).trim().slice(0, 10)
    if (!trimmed) return 0
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  } catch {
    return 0
  }
}

/** Sort by date descending (newest first). Missing/invalid dates go to end. Never throws. */
function sortByNewestFirst(items: HaberItem[]): HaberItem[] {
  try {
    return [...items].sort((a, b) => parseIsoDate(b?.tarih) - parseIsoDate(a?.tarih))
  } catch {
    return items ?? []
  }
}

async function loadFeed(filePath: string): Promise<HaberlerFeed> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const data = JSON.parse(raw) as {
      lastUpdated?: string | null
      isExampleData?: boolean
      items?: unknown[]
    }
    const items = Array.isArray(data.items) ? data.items : []
    const lastUpdated =
      typeof data.lastUpdated === 'string' && data.lastUpdated.trim()
        ? data.lastUpdated.trim()
        : null
    const isExampleData = Boolean(data.isExampleData)
    const parsed: HaberItem[] = []
    for (const o of items) {
      if (!o || typeof o !== 'object') continue
      const x = o as Record<string, unknown>
      const baslik = typeof x.baslik === 'string' ? x.baslik : ''
      const tarih = typeof x.tarih === 'string' ? x.tarih : ''
      const kaynak = typeof x.kaynak === 'string' ? x.kaynak : ''
      const kisaOzet = typeof x.kisaOzet === 'string' ? x.kisaOzet : ''
      const nedenOnemli = typeof x.nedenOnemli === 'string' ? x.nedenOnemli : ''
      const kategori = typeof x.kategori === 'string' ? x.kategori : ''
      const imageUrl = typeof x.imageUrl === 'string' && x.imageUrl.trim() ? x.imageUrl.trim() : null
      const link = typeof x.link === 'string' && x.link.trim() ? x.link.trim() : null
      const keep = baslik || tarih || kaynak || imageUrl || link
      if (keep)
        parsed.push({
          baslik,
          tarih,
          kaynak,
          kisaOzet,
          nedenOnemli,
          kategori,
          imageUrl: imageUrl ?? undefined,
          link: link ?? undefined,
        })
    }
    return { lastUpdated, isExampleData, items: parsed }
  } catch {
    return { lastUpdated: null, isExampleData: true, items: [] }
  }
}

function formatCurrentDate(): string {
  return new Date().toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function loadLastSuccessfulUpdate(): Promise<string | null> {
  try {
    const raw = await fs.readFile(LAST_UPDATE_PATH, 'utf-8')
    const data = JSON.parse(raw) as { lastSuccessfulUpdate?: string }
    const v = data.lastSuccessfulUpdate
    return typeof v === 'string' && v.trim() ? v.trim() : null
  } catch {
    return null
  }
}

export async function getHaberlerPageData(): Promise<HaberlerPageData> {
  const [hukukFeed, lastSuccessfulUpdate] = await Promise.all([
    loadFeed(HUKUK_PATH),
    loadLastSuccessfulUpdate(),
  ])

  const hukukItems = sortByNewestFirst(hukukFeed.items)
  const hasRealUpdate = hukukFeed.lastUpdated != null && hukukFeed.lastUpdated !== ''

  return {
    hukukHaberleri: hukukItems,
    hukukMeta: {
      lastUpdated: hukukFeed.lastUpdated,
      isExampleData: hukukFeed.isExampleData,
    },
    currentDateFormatted: formatCurrentDate(),
    hasRealUpdate,
    lastSuccessfulUpdate,
  }
}
