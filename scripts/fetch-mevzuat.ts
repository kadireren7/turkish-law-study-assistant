#!/usr/bin/env npx tsx
/**
 * Otomatik mevzuat veri çekme: mevzuat.gov.tr'den kanun metinlerini alıp law-data/mevzuat dosyalarına yazar.
 * Kullanım: npm run mevzuat:fetch
 * Önce normal fetch denenir; TLS/socket hatası alınırsa Playwright (Chromium) ile tarayıcı üzerinden çekim yapılır.
 * İlk kullanımda (bir kez): npx playwright install chromium
 */
import path from 'path'
import fs from 'fs/promises'
import { MEVZUAT_FETCH_LAWS, OFFICIAL_LEGISLATION_URLS } from '../src/lib/legal-sources'

const ROOT = process.cwd()
const MEVZUAT_DIR = path.join(ROOT, 'law-data', 'mevzuat')

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const REQUEST_DELAY_MS = 3500
const REQUEST_TIMEOUT_MS = 25000

/** Guncel URL formatlari – sirasiyla dene. Metin.Aspx resmi orneklerde kullaniliyor. */
function buildMevzuatUrls(no: number): string[] {
  const kod = '1.5.' + no
  return [
    'https://mevzuat.gov.tr/Metin.Aspx?MevzuatIliski=0&MevzuatKod=' + kod + '&sourceXmlSearch=',
    'https://www.mevzuat.gov.tr/Metin.Aspx?MevzuatIliski=0&MevzuatKod=' + kod + '&sourceXmlSearch=',
    'https://www.mevzuat.gov.tr/Metin1.Aspx?MevzuatIliski=0&MevzuatKod=' + kod + '&No=' + no + '&Tertip=5&Tur=1',
    'https://mevzuat.gov.tr/Metin1.Aspx?MevzuatIliski=0&MevzuatKod=' + kod + '&No=' + no + '&Tertip=5&Tur=1',
    'http://www.mevzuat.gov.tr/Metin.Aspx?MevzuatIliski=0&MevzuatKod=' + kod + '&sourceXmlSearch=',
  ]
}

/** HTML'den metin çıkar; basit tag temizleme. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Ham metinden "Madde N" bloklarını bul; başlık + metin döndür. */
function extractMaddeler(fullText: string): { numara: number; baslik: string; metin: string }[] {
  const maddeler: { numara: number; baslik: string; metin: string }[] = []
  const maddeRegex = /(?:^|\n)\s*Madde\s+(\d+)\s*[–\-:\s]*([\s\S]*?)(?=\s*Madde\s+\d+\s*[–\-:\s]|$)/gi
  let m: RegExpExecArray | null
  while ((m = maddeRegex.exec(fullText)) !== null) {
    const numara = parseInt(m[1], 10)
    const baslik = (m[2] || '').trim().replace(/\s+/g, ' ').slice(0, 200)
    const block = (m[0] || '').replace(/^\s*Madde\s+\d+\s*[–\-:\s]*/i, '').trim()
    if (block.length > 5) maddeler.push({ numara, baslik, metin: block })
  }
  return maddeler
}

function buildMarkdown(
  label: string,
  legalArea: string,
  no: number,
  maddeler: { numara: number; baslik: string; metin: string }[],
  fetchedAt: string
): string {
  const lines: string[] = [
    '---',
    'source: "Mevzuat Bilgi Sistemi (mevzuat.gov.tr) - otomatik cekim"',
    'date: "' + fetchedAt.slice(0, 10) + '"',
    'last_checked: "' + fetchedAt.slice(0, 10) + '"',
    'legal_area: "' + legalArea + '"',
    'keywords: "' + legalArea.toLowerCase() + ' mevzuat kanun madde"',
    'confidence: "high"',
    '---',
    '',
    '# ' + label + ' (' + no + ' sayili)',
    '',
    '**Kanun adi:** ' + label + ' (' + no + ' sayili)',
    '**Hukuk alani:** ' + legalArea,
    '**Guncel metin:** mevzuat.gov.tr uzerinden otomatik cekilmistir. Resmi teyit icin ' + OFFICIAL_LEGISLATION_URLS.mevzuat + ' kontrol ediniz.',
    '',
    '---',
    '',
  ]
  for (const mad of maddeler) {
    const baslikPart = mad.baslik ? ' - ' + mad.baslik : ''
    lines.push('## Madde ' + mad.numara + baslikPart, '')
    lines.push('**Madde metni:**', mad.metin, '')
    lines.push('**Anahtar kelimeler:** madde, kanun', '')
    lines.push('**Hukuk alani:** ' + legalArea, '')
    lines.push('---', '')
  }
  lines.push('', '*Son otomatik guncelleme: ' + fetchedAt.slice(0, 10) + '. Resmi metin icin mevzuat.gov.tr kullaniniz.*')
  return lines.join('\n')
}

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://mevzuat.gov.tr/',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'same-origin',
}

/** Tek bir URL icin timeout ile fetch; hata detayini logla. */
async function fetchOne(url: string, cookieHeader?: string): Promise<string> {
  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const headers: Record<string, string> = { ...DEFAULT_HEADERS }
  if (cookieHeader) headers['Cookie'] = cookieHeader
  try {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(to)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.text()
  } catch (e) {
    clearTimeout(to)
    const msg = e instanceof Error ? e.message : String(e)
    const cause = e instanceof Error && e.cause ? String(e.cause) : ''
    throw new Error(msg + (cause ? ' | ' + cause : ''))
  }
}

/** Ana sayfaya istek atip Set-Cookie varsa dondur (bazen sunucu oturum icin gerekir). */
async function getSessionCookie(): Promise<string | undefined> {
  const controller = new AbortController()
  const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch('https://mevzuat.gov.tr/', {
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    })
    clearTimeout(to)
    const setCookie = res.headers.get('set-cookie')
    await res.text()
    return setCookie ?? undefined
  } catch {
    clearTimeout(to)
    return undefined
  }
}

/** Verilen URL listesini sirayla dene; gerekirse once session cookie al. */
async function fetchWithRetry(urls: string[], retries = 2): Promise<string> {
  let cookieHeader: string | undefined
  try {
    cookieHeader = await getSessionCookie()
    if (cookieHeader) await new Promise((r) => setTimeout(r, 800))
  } catch {
    // Cookie alinamazsa devam et
  }
  const lastErr: string[] = []
  for (const url of urls) {
    for (let i = 0; i <= retries; i++) {
      try {
        const html = await fetchOne(url, cookieHeader)
        if (html && html.length > 500) return html
        lastErr.push(url + ' (az icerik: ' + html.length + ')')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        lastErr.push(url + ': ' + msg)
        if (i < retries) await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS * (i + 1)))
      }
    }
  }
  throw new Error(lastErr.join('; '))
}

const PLAYWRIGHT_TIMEOUT_MS = 35000

/** Tarayici (Playwright/Chromium) ile sayfa acip HTML al. Sunucu Node fetch engelliyorsa bu calisir. */
async function fetchWithPlaywright(urls: string[]): Promise<string> {
  let playwright: typeof import('playwright')
  try {
    playwright = await import('playwright')
  } catch {
    throw new Error(
      'Playwright yuklu degil. Kurmak icin: npm install -D playwright && npx playwright install chromium'
    )
  }
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    for (const url of urls) {
      const page = await browser.newPage()
      try {
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: PLAYWRIGHT_TIMEOUT_MS,
        })
        const html = await page.content()
        await page.close()
        if (html && html.length > 500) return html
      } catch {
        await page.close().catch(() => {})
      }
    }
  } finally {
    await browser.close()
  }
  throw new Error('Playwright ile de icerik alinamadi.')
}

/** Fetch TLS/socket hatasi mi (tarayici fallback gerekli). */
function isTlsOrSocketError(e: unknown): boolean {
  const s = e instanceof Error ? e.message + String(e.cause ?? '') : String(e)
  return (
    /TLS|socket disconnected|ECONNRESET|ECONNREFUSED|ConnectTimeout|ETIMEDOUT|fetch failed/i.test(s)
  )
}

async function main(): Promise<void> {
  const fetchedAt = new Date().toISOString()
  console.log('Mevzuat otomatik veri cekme basladi -', fetchedAt)
  await fs.mkdir(MEVZUAT_DIR, { recursive: true })

  for (const law of MEVZUAT_FETCH_LAWS) {
    const urls = buildMevzuatUrls(law.no)
    console.log('  Cekiliyor: ' + law.label + ' (' + law.no + ')')
    let html: string | null = null
    try {
      html = await fetchWithRetry(urls)
    } catch (e) {
      if (isTlsOrSocketError(e)) {
        console.log('    Fetch engellendi, tarayici (Playwright) ile deneniyor...')
        try {
          html = await fetchWithPlaywright(urls)
        } catch (pwErr) {
          console.error('    Hata: ' + (pwErr instanceof Error ? pwErr.message : String(pwErr)))
        }
      } else {
        console.error('    Hata: ' + (e instanceof Error ? e.message : String(e)))
      }
    }
    if (!html) {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS))
      continue
    }
    const text = stripHtml(html)
    if (text.length < 500) {
      console.warn('    Uyari: Az icerik (' + text.length + ' karakter). 403 veya farkli sayfa yapisi olabilir.')
    }
    const maddeler = extractMaddeler(text)
    if (maddeler.length === 0 && text.length > 200) {
      const fullContent = text.slice(0, 15000).trim()
      const md = buildMarkdown(law.label, law.legalArea, law.no, [{ numara: 1, baslik: '', metin: fullContent }], fetchedAt)
      const outPath = path.join(MEVZUAT_DIR, law.file)
      await fs.writeFile(outPath, md, 'utf-8')
      console.log('    Kaydedildi (ham metin): ' + law.file)
    } else if (maddeler.length > 0) {
      const md = buildMarkdown(law.label, law.legalArea, law.no, maddeler, fetchedAt)
      const outPath = path.join(MEVZUAT_DIR, law.file)
      await fs.writeFile(outPath, md, 'utf-8')
      console.log('    Kaydedildi: ' + law.file + ' (' + maddeler.length + ' madde)')
    } else {
      console.warn('    Atlandi: Yeterli icerik cikarilamadi.')
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS))
  }

  console.log('Tamamlandi. law-data/mevzuat guncellendi.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
