#!/usr/bin/env npx tsx
/**
 * Mevzuat markdown dosyalarındaki tüm maddeleri madde-index/*.json dosyalarına yazar.
 * Böylece mevzuat:fetch ile çekilen veya manuel eklenen her madde Madde Ara'da bulunur.
 *
 * Kullanım: npm run madde-index:sync
 * Önerilen sıra: npm run mevzuat:fetch && npm run madde-index:sync
 */
import path from 'path'
import fs from 'fs/promises'

const ROOT = process.cwd()
const MEVZUAT_DIR = path.join(ROOT, 'data', 'core', 'laws')
const MADDE_INDEX_DIR = path.join(ROOT, 'data', 'core', 'article-index')

/** mevzuat dosya adı -> kanun kodu ve etiket (law-search ile uyumlu). */
const FILE_TO_LAW: Record<string, { code: string; lawName: string; legalArea: string }> = {
  'anayasa.md': { code: 'ANAYASA', lawName: 'Türkiye Cumhuriyeti Anayasası', legalArea: 'Anayasa Hukuku' },
  'tck.md': { code: 'TCK', lawName: 'Türk Ceza Kanunu', legalArea: 'Ceza Hukuku' },
  'tmk.md': { code: 'TMK', lawName: 'Türk Medeni Kanunu', legalArea: 'Medeni Hukuk' },
  'tbk.md': { code: 'TBK', lawName: 'Türk Borçlar Kanunu', legalArea: 'Borçlar Hukuku' },
  'cmk.md': { code: 'CMK', lawName: 'Ceza Muhakemesi Kanunu', legalArea: 'Ceza Muhakemesi Hukuku' },
  'hmk.md': { code: 'HMK', lawName: 'Hukuk Muhakemeleri Kanunu', legalArea: 'Hukuk Muhakemeleri Hukuku' },
  'iik.md': { code: 'IIK', lawName: 'İcra ve İflas Kanunu', legalArea: 'İcra ve İflas Hukuku' },
  'ttk.md': { code: 'TTK', lawName: 'Türk Ticaret Kanunu', legalArea: 'Ticaret Hukuku' },
  'kabahatler.md': { code: 'KABAHATLER', lawName: 'Kabahatler Kanunu', legalArea: 'Kabahatler Hukuku' },
  'is-kanunu.md': { code: 'IS', lawName: 'İş Kanunu', legalArea: 'İş Hukuku' },
  'idari-yargilama-usulu.md': { code: 'IYUK', lawName: 'İdari Yargılama Usulü Kanunu', legalArea: 'İdare Hukuku' },
  'idare.md': { code: 'IDARE', lawName: 'İdare Hukuku', legalArea: 'İdare Hukuku' },
}

type MaddeEntry = {
  lawCode: string
  lawName: string
  articleNumber: string
  title: string
  text: string
  keywords: string[]
  legalArea: string
}

/** Markdown içinden legal_area front matter değerini al. */
function getLegalAreaFromFrontMatter(content: string): string | null {
  const match = content.match(/^---\s*\n[\s\S]*?legal_area:\s*["']?([^"'\n]+)["']?/m)
  return match ? match[1].trim() : null
}

/** ## Madde N – Başlık veya ### Madde N – Başlık ile başlayan bölümleri parse et. */
function extractMaddelerFromMarkdown(
  content: string,
  defaultLegalArea: string
): { numara: number; baslik: string; metin: string }[] {
  const legalArea = getLegalAreaFromFrontMatter(content) ?? defaultLegalArea
  const maddeler: { numara: number; baslik: string; metin: string }[] = []
  const lines = content.split(/\r?\n/)
  const maddeHeading = /^#{2,3}\s+Madde\s+(\d+)\s*[–\-:\s]*(.*)$/i
  let i = 0
  while (i < lines.length) {
    const match = lines[i].match(maddeHeading)
    if (match) {
      const numara = parseInt(match[1], 10)
      const baslik = (match[2] || '').trim().replace(/\s+/g, ' ')
      const bodyLines: string[] = []
      i++
      while (i < lines.length) {
        const line = lines[i]
        if (maddeHeading.test(line) || (line.startsWith('## ') && !line.includes('Madde'))) break
        if (line.trim() === '---') {
          i++
          break
        }
        bodyLines.push(line)
        i++
      }
      const metin = bodyLines
        .join('\n')
        .replace(/\*\*[^*]+:\*\*/g, '')
        .replace(/\*\*Madde metni:\*\*\s*/i, '')
        .replace(/\*\*Anahtar kelimeler:\*\*[^\n]*/gi, '')
        .replace(/\*\*Hukuk alanı:\*\*[^\n]*/gi, '')
        .trim()
      if (metin.length > 0) maddeler.push({ numara, baslik, metin })
      continue
    }
    i++
  }
  return maddeler
}

function buildKeywords(baslik: string, metin: string): string[] {
  const words = (baslik + ' ' + metin.slice(0, 300))
    .toLowerCase()
    .replace(/[^\wçğıöşü\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of words) {
    if (seen.has(w)) continue
    seen.add(w)
    out.push(w)
    if (out.length >= 8) break
  }
  return out.length ? out : ['madde', 'kanun']
}

async function main(): Promise<void> {
  await fs.mkdir(MADDE_INDEX_DIR, { recursive: true })
  const files = await fs.readdir(MEVZUAT_DIR).catch(() => [])
  const mdFiles = files.filter((f) => f.endsWith('.md'))

  for (const filename of mdFiles) {
    const law = FILE_TO_LAW[filename]
    if (!law) {
      console.log('  Atlandı (eşleme yok):', filename)
      continue
    }
    const filePath = path.join(MEVZUAT_DIR, filename)
    let content: string
    try {
      content = await fs.readFile(filePath, 'utf-8')
    } catch {
      console.warn('  Okunamadı:', filename)
      continue
    }
    const maddeler = extractMaddelerFromMarkdown(content, law.legalArea)
    if (maddeler.length === 0) {
      console.log('  Madde bulunamadı:', filename)
      continue
    }
    const entries: MaddeEntry[] = maddeler.map((m) => ({
      lawCode: law.code,
      lawName: law.lawName,
      articleNumber: String(m.numara),
      title: m.baslik,
      text: m.metin,
      keywords: buildKeywords(m.baslik, m.metin),
      legalArea: law.legalArea,
    }))
    const jsonPath = path.join(MADDE_INDEX_DIR, filename.replace(/\.md$/i, '.json'))
    await fs.writeFile(jsonPath, JSON.stringify(entries, null, 2), 'utf-8')
    console.log('  Yazıldı:', path.basename(jsonPath), '-', entries.length, 'madde')
  }

  console.log('Tamamlandı. Madde indeksleri mevzuat ile senkronize edildi.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
