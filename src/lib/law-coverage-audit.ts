/**
 * Coverage audit for law-data: reports index article counts, mevzuat presence,
 * and missing areas. Use for systematic improvement (no copyrighted content).
 */
import path from 'path'
import fs from 'fs/promises'

const MEVZUAT_DIR = path.join(process.cwd(), 'law-data', 'mevzuat')
const MADDE_INDEX_DIR = path.join(process.cwd(), 'law-data', 'madde-index')
const KONU_NOTLARI_DIR = path.join(process.cwd(), 'law-data', 'konu-notlari')

export type IndexCoverage = {
  lawCode: string
  file: string
  articleCount: number
  articleNumbers: number[]
  exists: boolean
  error?: string
}

export type MevzuatCoverage = {
  file: string
  exists: boolean
  sizeBytes: number
  error?: string
}

export type KonuNotuCoverage = {
  path: string
  exists: boolean
}

export type LawCoverageAuditResult = {
  indexes: IndexCoverage[]
  mevzuat: MevzuatCoverage[]
  konuNotlari: KonuNotuCoverage[]
  summary: {
    totalIndexArticles: number
    lawsWithWeakCoverage: string[]
    missingIndexFiles: string[]
    missingMevzuatFiles: string[]
  }
}

const EXPECTED_MEVZUAT = [
  'anayasa.md',
  'tck.md',
  'tmk.md',
  'tbk.md',
  'cmk.md',
  'hmk.md',
  'iik.md',
  'ttk.md',
  'kabahatler.md',
  'is-kanunu.md',
  'idari-yargilama-usulu.md',
  'idare.md',
]

const EXPECTED_INDEXES = [
  'anayasa.json',
  'tck.json',
  'tmk.json',
  'tbk.json',
  'cmk.json',
  'hmk.json',
  'iik.json',
  'ttk.json',
  'kabahatler.json',
  'is-kanunu.json',
  'idari-yargilama-usulu.json',
]

/** Weak = fewer than 10 articles in index (configurable threshold). */
const WEAK_COVERAGE_THRESHOLD = 10

export async function getLawCoverageAudit(): Promise<LawCoverageAuditResult> {
  const indexes: IndexCoverage[] = []
  const mevzuat: MevzuatCoverage[] = []
  const konuNotlari: KonuNotuCoverage[] = []

  for (const file of EXPECTED_INDEXES) {
    const filePath = path.join(MADDE_INDEX_DIR, file)
    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      const arr = JSON.parse(raw) as Array<{ articleNumber?: string | number }>
      const articleNumbers = Array.isArray(arr)
        ? arr
            .map((e) => (typeof e.articleNumber === 'number' ? e.articleNumber : parseInt(String(e.articleNumber ?? ''), 10)))
            .filter((n) => !isNaN(n))
        : []
      indexes.push({
        lawCode: file.replace('.json', '').toUpperCase(),
        file,
        articleCount: articleNumbers.length,
        articleNumbers: [...new Set(articleNumbers)].sort((a, b) => a - b),
        exists: true,
      })
    } catch (e) {
      indexes.push({
        lawCode: file.replace('.json', ''),
        file,
        articleCount: 0,
        articleNumbers: [],
        exists: false,
        error: e instanceof Error ? e.message : 'okunamadı',
      })
    }
  }

  for (const file of EXPECTED_MEVZUAT) {
    const filePath = path.join(MEVZUAT_DIR, file)
    try {
      const stat = await fs.stat(filePath)
      mevzuat.push({ file, exists: true, sizeBytes: stat.size })
    } catch {
      mevzuat.push({ file, exists: false, sizeBytes: 0, error: 'dosya yok' })
    }
  }

  try {
    const entries = await fs.readdir(KONU_NOTLARI_DIR, { withFileTypes: true })
    for (const e of entries) {
      const p = path.join(KONU_NOTLARI_DIR, e.name)
      konuNotlari.push({ path: e.name, exists: true })
    }
  } catch {
    // konu-notlari may not exist
  }

  const lawsWithWeakCoverage = indexes.filter((i) => i.exists && i.articleCount < WEAK_COVERAGE_THRESHOLD).map((i) => i.lawCode)
  const missingIndexFiles = indexes.filter((i) => !i.exists).map((i) => i.file)
  const missingMevzuatFiles = mevzuat.filter((m) => !m.exists).map((m) => m.file)
  const totalIndexArticles = indexes.reduce((s, i) => s + i.articleCount, 0)

  return {
    indexes,
    mevzuat,
    konuNotlari,
    summary: {
      totalIndexArticles,
      lawsWithWeakCoverage,
      missingIndexFiles,
      missingMevzuatFiles,
    },
  }
}
