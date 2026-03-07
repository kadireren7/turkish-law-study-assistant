/**
 * Güncel Hukuk Gelişmeleri sayfası için law-data/guncellemeler içeriğini okur ve ayrıştırır.
 * - recent-amendments.md → son mevzuat değişiklikleri
 * - recent-important-decisions.md → önemli yeni kararlar
 * - update-log.json → son güncelleme zamanı
 */
import path from 'path'
import fs from 'fs/promises'

const GUNCELLEMELER_DIR = path.join(process.cwd(), 'law-data', 'guncellemeler')
const AMENDMENTS_PATH = path.join(GUNCELLEMELER_DIR, 'recent-amendments.md')
const DECISIONS_PATH = path.join(GUNCELLEMELER_DIR, 'recent-important-decisions.md')
const UPDATE_LOG_PATH = path.join(GUNCELLEMELER_DIR, 'update-log.json')

function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/)
  return match ? content.slice(match[0].length) : content
}

function parseBullet(line: string): { key: string; value: string } | null {
  const m = line.match(/^-\s*\*\*([^*]+):\*\*\s*(.*)$/)
  if (!m) return null
  return { key: m[1].trim(), value: m[2].trim() }
}

export type MevzuatDegisikligi = {
  baslik: string
  tarih: string | null
  degisenMaddeler: string | null
  ozet: string | null
  kaynak: string | null
  ogrenciIcinOnem: string
}

export type OnemliKarar = {
  baslik: string
  mahkeme: string | null
  dosyaNo: string | null
  tarih: string | null
  konu: string | null
  ozet: string | null
  kaynak: string | null
  ogrenciIcinOnem: string
}

export type GuncelGelismelerData = {
  mevzuatDegisiklikleri: MevzuatDegisikligi[]
  onemliKararlar: OnemliKarar[]
  sonGuncelleme: string | null
}

const OGRENCI_ONEM_MEVZUAT =
  'Ders ve sınavlarda güncel metnin bilinmesi gerekir; mevzuat değişiklikleri sınavda soru olarak karşınıza çıkabilir.'
const OGRENCI_ONEM_KARAR =
  'İçtihat kararları, sınav ve uygulama sorularında emsal olarak kullanılır; konu tekrarı ve pratik için faydalıdır.'

function parseAmendmentsMarkdown(body: string): MevzuatDegisikligi[] {
  const out: MevzuatDegisikligi[] = []
  const blocks = body.split(/\n###\s+/)
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/)
    if (lines.length === 0) continue
    const first = lines[0].trim()
    if (!first) continue
    // Başlık: "Örnek Kanun Adı (XXXX sayılı) – 2024-06-01" veya benzeri
    const titleMatch = first.match(/^(.+?)\s*[–\-]\s*(\d{4}-\d{2}-\d{2}|[\d./]+)$/)
    const baslik = titleMatch ? titleMatch[1].trim() : first
    const tarih = titleMatch ? titleMatch[2].trim() : null
    let degisenMaddeler: string | null = null
    let ozet: string | null = null
    let kaynak: string | null = null
    for (let i = 1; i < lines.length; i++) {
      const parsed = parseBullet(lines[i])
      if (!parsed) continue
      if (parsed.key.toLowerCase().includes('değişen madde')) degisenMaddeler = parsed.value
      else if (parsed.key.toLowerCase().includes('özet')) ozet = parsed.value
      else if (parsed.key.toLowerCase().includes('kaynak')) kaynak = parsed.value
    }
    if (!ozet && !degisenMaddeler && !titleMatch) continue
    out.push({
      baslik,
      tarih,
      degisenMaddeler,
      ozet,
      kaynak,
      ogrenciIcinOnem: OGRENCI_ONEM_MEVZUAT,
    })
  }
  return out
}

function parseDecisionsMarkdown(body: string): OnemliKarar[] {
  const out: OnemliKarar[] = []
  const blocks = body.split(/\n###\s+/)
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/)
    if (lines.length === 0) continue
    const first = lines[0].trim()
    if (!first) continue
    // Başlık: "Yargıtay Hukuk Genel Kurulu – 2023/123 – 2024-05-15"
    const parts = first.split(/\s*[–\-]\s*/).map((p) => p.trim())
    const baslik = first
    const mahkeme = parts.length > 0 ? parts[0] : null
    const dosyaNo = parts.length > 1 ? parts[1] : null
    const tarih = parts.length > 2 ? parts[2] : null
    let konu: string | null = null
    let ozet: string | null = null
    let kaynak: string | null = null
    for (let i = 1; i < lines.length; i++) {
      const parsed = parseBullet(lines[i])
      if (!parsed) continue
      if (parsed.key.toLowerCase().includes('konu')) konu = parsed.value
      else if (parsed.key.toLowerCase().includes('özet') || parsed.key.toLowerCase().includes('sonuç')) ozet = parsed.value
      else if (parsed.key.toLowerCase().includes('kaynak')) kaynak = parsed.value
    }
    if (!konu && !ozet) continue
    out.push({
      baslik,
      mahkeme,
      dosyaNo,
      tarih,
      konu,
      ozet,
      kaynak,
      ogrenciIcinOnem: OGRENCI_ONEM_KARAR,
    })
  }
  return out
}

function formatLastRun(iso: string): string {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export async function getGuncelGelismeler(): Promise<GuncelGelismelerData> {
  let amendmentsRaw = ''
  let decisionsRaw = ''
  let lastRun: string | null = null

  try {
    amendmentsRaw = await fs.readFile(AMENDMENTS_PATH, 'utf-8')
  } catch {
    amendmentsRaw = ''
  }
  try {
    decisionsRaw = await fs.readFile(DECISIONS_PATH, 'utf-8')
  } catch {
    decisionsRaw = ''
  }
  try {
    const log = await fs.readFile(UPDATE_LOG_PATH, 'utf-8')
    const json = JSON.parse(log) as { lastRun?: string }
    if (json.lastRun) lastRun = formatLastRun(json.lastRun)
  } catch {
    lastRun = null
  }

  const amendmentsBody = stripFrontmatter(amendmentsRaw)
  const decisionsBody = stripFrontmatter(decisionsRaw)

  const mevzuatDegisiklikleri = parseAmendmentsMarkdown(amendmentsBody)
  const onemliKararlar = parseDecisionsMarkdown(decisionsBody)

  return {
    mevzuatDegisiklikleri,
    onemliKararlar,
    sonGuncelleme: lastRun,
  }
}
