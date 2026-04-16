#!/usr/bin/env npx tsx
/**
 * Phase 1: Official legal source pipeline for legislation only.
 * - Connects to official Turkish legislation sources (mevzuat.gov.tr, resmigazete.gov.tr) via config
 * - Ensures law-data/mevzuat and law-data/guncellemeler exist
 * - Snapshots local law files (anayasa, tck, tmk, tbk, cmk, hmk) and detects changes
 * - Writes update summaries to law-data/guncellemeler/recent-amendments.md and update-log.json
 *
 * Run: npm run laws:update | npm run laws:update:daily
 * No direct UYAP integration; only public official legislation sources.
 */
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import {
  getLegalSourcesForAmendments,
  OFFICIAL_LEGISLATION_URLS,
} from '../../src/lib/legal-sources'

const ROOT = process.cwd()
const MEVZUAT_DIR = path.join(ROOT, 'data', 'core', 'laws')
const GUNCELLEMELER_DIR = path.join(ROOT, 'data', 'derived', 'updates')
const UPDATE_LOG_PATH = path.join(GUNCELLEMELER_DIR, 'update-log.json')
const RECENT_AMENDMENTS_PATH = path.join(GUNCELLEMELER_DIR, 'recent-amendments.md')

/** Initial law files for phase 1 (official legislation refresh). */
const LAW_FILES = ['anayasa.md', 'tck.md', 'tmk.md', 'tbk.md', 'cmk.md', 'hmk.md'] as const

const LAW_LABELS: Record<string, string> = {
  'anayasa.md': 'Türkiye Cumhuriyeti Anayasası (2709)',
  'tck.md': 'Türk Ceza Kanunu (5237)',
  'tmk.md': 'Türk Medeni Kanunu (4721)',
  'tbk.md': 'Türk Borçlar Kanunu (6098)',
  'cmk.md': 'Ceza Muhakemesi Kanunu (5271)',
  'hmk.md': 'Hukuk Muhakemeleri Kanunu (6100)',
}

type FileSnapshot = { hash: string; lastModified: string; articleNumbers: string[] }
type UpdateLog = {
  lastRun: string
  previousSnapshot: Record<string, FileSnapshot>
  runs: RunEntry[]
}
type RunEntry = {
  at: string
  pipeline: 'laws'
  schedule?: 'full' | 'daily'
  amendmentsDetected: AmendmentDetected[]
  filesChanged: string[]
}
type AmendmentDetected = {
  file: string
  lawName: string
  type: 'changed' | 'articles_added' | 'articles_removed'
  articlesAdded?: string[]
  articlesRemoved?: string[]
  articlesPossiblyChanged?: string[]
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex')
}

function extractArticleNumbers(content: string): string[] {
  const numbers: string[] = []
  const patterns = [
    /^##\s+Madde\s+(\d+)\s*[–\-:\s]/gm,
    /^###\s+Madde\s+(\d+)\s*[–\-]/gm,
    /^###\s+Madde\s+(\d+)\s*$/gm,
  ]
  for (const regex of patterns) {
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      if (!numbers.includes(m[1])) numbers.push(m[1])
    }
  }
  return [...new Set(numbers)].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
}

async function ensureDirs(): Promise<void> {
  await fs.mkdir(MEVZUAT_DIR, { recursive: true })
  await fs.mkdir(GUNCELLEMELER_DIR, { recursive: true })
}

async function readLawFile(filename: string): Promise<{ content: string; mtime: Date } | null> {
  const filePath = path.join(MEVZUAT_DIR, filename)
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    return { content, mtime: stat.mtime }
  } catch {
    return null
  }
}

async function loadUpdateLog(): Promise<UpdateLog> {
  try {
    const raw = await fs.readFile(UPDATE_LOG_PATH, 'utf-8')
    const data = JSON.parse(raw) as UpdateLog
    if (data.previousSnapshot && typeof data.previousSnapshot === 'object' && Array.isArray(data.runs)) {
      return data
    }
  } catch {}
  return {
    lastRun: '',
    previousSnapshot: {},
    runs: [],
  }
}

async function saveUpdateLog(log: UpdateLog): Promise<void> {
  await fs.mkdir(GUNCELLEMELER_DIR, { recursive: true })
  await fs.writeFile(UPDATE_LOG_PATH, JSON.stringify(log, null, 2), 'utf-8')
}

function detectAmendments(
  previousSnapshot: Record<string, FileSnapshot>,
  current: Record<string, FileSnapshot>
): AmendmentDetected[] {
  const detected: AmendmentDetected[] = []
  for (const file of LAW_FILES) {
    const key = `data/core/laws/${file}`
    const prev = previousSnapshot[key]
    const curr = current[key]
    if (!curr) continue
    const lawName = LAW_LABELS[file] ?? file
    if (!prev) {
      if (curr.articleNumbers.length) {
        detected.push({
          file: key,
          lawName,
          type: 'changed',
          articlesPossiblyChanged: curr.articleNumbers.slice(0, 20),
        })
      }
      continue
    }
    if (prev.hash === curr.hash) continue
    const added = curr.articleNumbers.filter((n) => !prev.articleNumbers.includes(n))
    const removed = prev.articleNumbers.filter((n) => !curr.articleNumbers.includes(n))
    const possiblyChanged = curr.articleNumbers.filter(
      (n) => prev.articleNumbers.includes(n) && !added.includes(n) && !removed.includes(n)
    )
    if (removed.length) {
      detected.push({ file: key, lawName, type: 'articles_removed', articlesRemoved: removed })
    }
    if (added.length) {
      detected.push({ file: key, lawName, type: 'articles_added', articlesAdded: added })
    }
    if (possiblyChanged.length) {
      detected.push({
        file: key,
        lawName,
        type: 'changed',
        articlesPossiblyChanged: possiblyChanged.slice(0, 30),
      })
    }
    if (!added.length && !removed.length && !possiblyChanged.length) {
      detected.push({
        file: key,
        lawName,
        type: 'changed',
        articlesPossiblyChanged: curr.articleNumbers.slice(0, 15),
      })
    }
  }
  return detected
}

function formatSourcesList(): string[] {
  const sources = getLegalSourcesForAmendments()
  return sources.map(
    (s) => `- **${s.name}** (öncelik ${s.priority}, güncelleme: ${s.update_frequency}) – ${s.notes}`
  )
}

function buildAmendmentsMarkdown(
  detected: AmendmentDetected[],
  runDate: string
): string {
  const lines: string[] = [
    '---',
    'source: "Mevzuat Bilgi Sistemi / Resmî Gazete (update-laws script)"',
    `date: "${runDate.slice(0, 10)}"`,
    `last_checked: "${runDate.slice(0, 10)}"`,
    'legal_area: "Genel"',
    'confidence: "medium"',
    '---',
    '',
    '# Son Değişiklikler (Yakın Dönem Kanun Değişiklikleri)',
    '',
    'Bu dosya, yerel mevzuat dosyalarındaki değişikliklerle güncellenir. Güncel resmî metin için aşağıdaki kaynaklara başvurunuz.',
    '',
    '## Resmî kaynak önceliği (kanun değişiklikleri)',
    '',
    `- **Mevzuat Bilgi Sistemi:** ${OFFICIAL_LEGISLATION_URLS.mevzuat}`,
    `- **Resmî Gazete:** ${OFFICIAL_LEGISLATION_URLS.resmigazete}`,
    '',
    ...formatSourcesList(),
    '',
    '---',
    '',
    '## Yerel mevzuat dosyası değişiklikleri',
    '',
  ]
  if (detected.length === 0) {
    lines.push('Son çalıştırmada yeni değişiklik tespit edilmedi.', '')
  } else {
    for (const d of detected) {
      lines.push(`### ${d.lawName}`)
      if (d.articlesRemoved?.length) {
        lines.push(`- **Kaldırılan / değişen maddeler:** ${d.articlesRemoved.join(', ')}`)
      }
      if (d.articlesAdded?.length) {
        lines.push(`- **Eklenen maddeler:** ${d.articlesAdded.join(', ')}`)
      }
      if (d.articlesPossiblyChanged?.length) {
        lines.push(`- **Metni değişmiş olabilecek maddeler:** ${d.articlesPossiblyChanged.join(', ')}`)
      }
      lines.push('- **Kaynak:** Yerel mevzuat dosyası güncellendi.', '')
    }
  }
  lines.push('---', '', '*Güncel metin için mevzuat.gov.tr ve resmigazete.gov.tr kontrol edilmelidir.*')
  return lines.join('\n')
}

function getScheduleMode(): 'full' | 'daily' {
  const env = process.env.LAWS_UPDATE_SCHEDULE?.toLowerCase()
  if (env === 'daily' || env === 'full') return env
  const arg = process.argv.find((a) => a.startsWith('--schedule='))
  if (arg) {
    const val = arg.slice('--schedule='.length).toLowerCase()
    if (val === 'daily' || val === 'full') return val
  }
  return 'full'
}

async function main(): Promise<void> {
  const runDate = new Date().toISOString()
  const schedule = getScheduleMode()
  console.log('Laws update pipeline (phase 1 – official legislation sources) –', runDate, `[schedule: ${schedule}]`)

  await ensureDirs()

  const log = await loadUpdateLog()
  const currentSnapshot: Record<string, FileSnapshot> = {}
  const filesChanged: string[] = []

  for (const file of LAW_FILES) {
    const data = await readLawFile(file)
    const key = `data/core/laws/${file}`
    if (!data) {
      console.warn('  Skip (missing):', file)
      continue
    }
    const hash = sha256(data.content)
    const lastModified = data.mtime.toISOString()
    const articleNumbers = extractArticleNumbers(data.content)
    currentSnapshot[key] = { hash, lastModified, articleNumbers }
    const prev = log.previousSnapshot[key]
    if (!prev || prev.hash !== hash) filesChanged.push(key)
  }

  const amendmentsDetected = detectAmendments(log.previousSnapshot, currentSnapshot)

  log.previousSnapshot = { ...log.previousSnapshot, ...currentSnapshot }
  log.lastRun = runDate
  log.runs.push({
    at: runDate,
    pipeline: 'laws',
    schedule,
    amendmentsDetected,
    filesChanged,
  })
  if (log.runs.length > 100) log.runs = log.runs.slice(-100)

  const amendmentsMd = buildAmendmentsMarkdown(amendmentsDetected, runDate)
  await saveUpdateLog(log)
  await fs.writeFile(RECENT_AMENDMENTS_PATH, amendmentsMd, 'utf-8')

  console.log('Done.')
  console.log('  Official sources: mevzuat.gov.tr, resmigazete.gov.tr')
  console.log('  Files changed:', filesChanged.length)
  console.log('  Amendments detected:', amendmentsDetected.length)
  console.log('  Written: update-log.json, recent-amendments.md')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
