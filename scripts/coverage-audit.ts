#!/usr/bin/env npx tsx
/**
 * Coverage audit for law-data: mevzuat, madde-index, konu-notlari.
 * Reports weak law coverage, missing article ranges, missing topic notes, weak madde-index.
 *
 * Run: npm run coverage:audit
 */
import path from 'path'
import fs from 'fs/promises'

const ROOT = process.cwd()
const LAW_DATA = path.join(ROOT, 'law-data')
const MEVZUAT_DIR = path.join(LAW_DATA, 'mevzuat')
const MADDE_INDEX_DIR = path.join(LAW_DATA, 'madde-index')
const KONU_NOTLARI_DIR = path.join(LAW_DATA, 'konu-notlari')

const MEVZUAT_FILES = ['anayasa.md', 'tck.md', 'tmk.md', 'tbk.md', 'cmk.md', 'hmk.md', 'idare.md', 'iik.md', 'ttk.md', 'idari-yargilama-usulu.md', 'is-kanunu.md', 'kabahatler.md'] as const
const EXPECTED_INDEX: Record<string, string> = {
  'anayasa.md': 'anayasa.json',
  'tck.md': 'tck.json',
  'tmk.md': 'tmk.json',
  'tbk.md': 'tbk.json',
  'cmk.md': 'cmk.json',
  'hmk.md': 'hmk.json',
  'iik.md': 'iik.json',
  'ttk.md': 'ttk.json',
  'idari-yargilama-usulu.md': 'idari-yargilama-usulu.json',
  'is-kanunu.md': 'is-kanunu.json',
  'kabahatler.md': 'kabahatler.json',
}

function extractArticleNumbersFromMarkdown(content: string): number[] {
  const nums: number[] = []
  const regex = /^#{2,3}\s+Madde\s+(\d+)\s*[–\-]?/gm
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) nums.push(parseInt(m[1], 10))
  return [...new Set(nums)].sort((a, b) => a - b)
}

async function main(): Promise<void> {
  console.log('=== Law-data coverage audit ===\n')

  const issues: string[] = []
  const weakLaws: string[] = []
  const missingRanges: { file: string; count: number; maxArticle: number }[] = []
  const missingIndex: string[] = []
  const weakIndex: { file: string; entries: number }[] = []

  for (const file of MEVZUAT_FILES) {
    const mevzuatPath = path.join(MEVZUAT_DIR, file)
    let content = ''
    try {
      content = await fs.readFile(mevzuatPath, 'utf-8')
    } catch {
      issues.push(`Mevzuat missing: ${file}`)
      continue
    }

    const articles = extractArticleNumbersFromMarkdown(content)
    const hasJunk = content.includes('Mevzuat Bilgi Sistemi') && content.length < 5000
    if (hasJunk || articles.length < 3) {
      weakLaws.push(`${file} (${articles.length} maddeler${hasJunk ? ', içerik zayıf/HTML kalıntı' : ''})`)
    }
    if (articles.length > 0) {
      const maxArt = Math.max(...articles)
      if (articles.length < 10 && (file === 'anayasa.md' || file === 'tck.md' || file === 'tmk.md')) {
        missingRanges.push({ file, count: articles.length, maxArticle: maxArt })
      }
    }

    const indexFile = EXPECTED_INDEX[file]
    if (!indexFile) continue
    const indexPath = path.join(MADDE_INDEX_DIR, indexFile)
    try {
      const raw = await fs.readFile(indexPath, 'utf-8')
      const arr = JSON.parse(raw)
      const entries = Array.isArray(arr) ? arr.length : 0
      if (entries < 5) weakIndex.push({ file: indexFile, entries })
    } catch {
      missingIndex.push(indexFile)
    }
  }

  const konuFiles = await fs.readdir(KONU_NOTLARI_DIR).catch(() => [] as string[])
  const konuMd = konuFiles.filter((f) => f.endsWith('.md'))
  if (konuMd.length < 5) {
    issues.push(`Konu notları az: ${konuMd.length} dosya (en az 5 önerilir)`)
  }

  console.log('--- Zayıf mevzuat (az madde veya HTML kalıntı) ---')
  if (weakLaws.length) weakLaws.forEach((l) => console.log('  ', l))
  else console.log('  Yok')

  console.log('\n--- Eksik madde aralıkları (önemli kanunlarda az madde) ---')
  if (missingRanges.length) missingRanges.forEach((r) => console.log('  ', r.file, '→', r.count, 'madde, en büyük:', r.maxArticle))
  else console.log('  Yok')

  console.log('\n--- Eksik madde-index dosyası ---')
  if (missingIndex.length) missingIndex.forEach((f) => console.log('  ', f))
  else console.log('  Yok')

  console.log('\n--- Zayıf madde-index (5’ten az giriş) ---')
  if (weakIndex.length) weakIndex.forEach((w) => console.log('  ', w.file, '→', w.entries, 'giriş'))
  else console.log('  Yok')

  console.log('\n--- Diğer sorunlar ---')
  if (issues.length) issues.forEach((i) => console.log('  ', i))
  else console.log('  Yok')

  console.log('\n=== Audit bitti ===')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
