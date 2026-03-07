#!/usr/bin/env npx tsx
/**
 * Legal updates pipeline for Turkish law content.
 * - Tracks changes in law-data/mevzuat by comparing to previous snapshot
 * - Detects new amendments, repealed/changed articles
 * - Accepts manual input for amendments and court decisions (from Resmî Gazete / court DBs)
 * - Writes update-log.json and generates recent-amendments.md, recent-important-decisions.md
 * - Saves update history before overwriting (law-data/guncellemeler/history/)
 *
 * Schedule modes (env LEGAL_UPDATE_SCHEDULE or --schedule=):
 *   full   – amendments + decisions (default)
 *   daily  – legislation/amendments only
 *   weekly – court decisions only
 *
 * Run: npm run legal:update | npm run legal:update:daily | npm run legal:update:weekly
 */
import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import {
  getLegalSourcesForAmendments,
  getLegalSourcesForDecisions,
  type LegalSource,
} from '../src/lib/legal-sources'

const ROOT = process.cwd()
const LAW_DATA = path.join(ROOT, 'law-data')
const MEVZUAT_DIR = path.join(LAW_DATA, 'mevzuat')
const GUNCELLEMELER_DIR = path.join(LAW_DATA, 'guncellemeler')
const HISTORY_DIR = path.join(GUNCELLEMELER_DIR, 'history')
const INPUT_DIR = path.join(GUNCELLEMELER_DIR, 'input')
const UPDATE_LOG_PATH = path.join(GUNCELLEMELER_DIR, 'update-log.json')
const RECENT_AMENDMENTS_PATH = path.join(GUNCELLEMELER_DIR, 'recent-amendments.md')
const RECENT_DECISIONS_PATH = path.join(GUNCELLEMELER_DIR, 'recent-important-decisions.md')
const MAX_HISTORY_FILES_PER_TYPE = 30

const MEVZUAT_FILES = ['anayasa.md', 'tck.md', 'tmk.md', 'tbk.md', 'idare.md'] as const
const LAW_LABELS: Record<string, string> = {
  'anayasa.md': 'Türkiye Cumhuriyeti Anayasası (2709)',
  'tck.md': 'Türk Ceza Kanunu (5237)',
  'tmk.md': 'Türk Medeni Kanunu (4721)',
  'tbk.md': 'Türk Borçlar Kanunu (6098)',
  'idare.md': 'İdare Hukuku',
}

type FileSnapshot = { hash: string; lastModified: string; articleNumbers: string[] }
type UpdateLog = {
  lastRun: string
  previousSnapshot: Record<string, FileSnapshot>
  runs: RunEntry[]
}
export type ScheduleMode = 'full' | 'daily' | 'weekly'

type RunEntry = {
  at: string
  schedule?: ScheduleMode
  amendmentsDetected: AmendmentDetected[]
  decisionsAdded: number
  filesChanged: string[]
  inputAmendments: number
  inputDecisions: number
}
type AmendmentDetected = {
  file: string
  lawName: string
  type: 'changed' | 'articles_added' | 'articles_removed'
  articlesAdded?: string[]
  articlesRemoved?: string[]
  articlesPossiblyChanged?: string[]
}

type InputAmendment = {
  lawName: string
  date?: string
  source?: string
  changedArticles?: string[]
  summary?: string
}
type InputDecision = {
  court: string
  dossierNo?: string
  date?: string
  subject?: string
  summary?: string
  source?: string
}

function getScheduleMode(): ScheduleMode {
  const env = process.env.LEGAL_UPDATE_SCHEDULE?.toLowerCase()
  if (env === 'daily' || env === 'weekly' || env === 'full') return env
  const arg = process.argv.find((a) => a.startsWith('--schedule='))
  if (arg) {
    const val = arg.slice('--schedule='.length).toLowerCase()
    if (val === 'daily' || val === 'weekly' || val === 'full') return val
  }
  return 'full'
}

/** Copy current summary to history/ before overwriting; prune old history files. */
async function saveHistoryBeforeOverwrite(
  currentFilePath: string,
  kind: 'amendments' | 'decisions',
  runDate: string
): Promise<void> {
  try {
    const content = await fs.readFile(currentFilePath, 'utf-8')
    if (!content.trim()) return
    await fs.mkdir(HISTORY_DIR, { recursive: true })
    const dateStr = runDate.slice(0, 19).replace(/[-:T]/g, '').slice(0, 12)
    const name = `${kind}-${dateStr}.md`
    const historyPath = path.join(HISTORY_DIR, name)
    await fs.writeFile(historyPath, content, 'utf-8')
    const prefix = `${kind}-`
    const entries = await fs.readdir(HISTORY_DIR).catch(() => [])
    const ofKind = entries.filter((e) => e.startsWith(prefix) && e.endsWith('.md')).sort().reverse()
    for (let i = MAX_HISTORY_FILES_PER_TYPE; i < ofKind.length; i++) {
      await fs.unlink(path.join(HISTORY_DIR, ofKind[i])).catch(() => {})
    }
  } catch {
    // file may not exist yet
  }
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf-8').digest('hex')
}

/** Extract article numbers from markdown (### Madde N – ... or ### Madde N ). */
function extractArticleNumbers(content: string): string[] {
  const numbers: string[] = []
  const regex = /^###\s+Madde\s+(\d+)\s*[–\-]/gm
  let m: RegExpExecArray | null
  while ((m = regex.exec(content)) !== null) numbers.push(m[1])
  const regex2 = /^###\s+Madde\s+(\d+)\s*$/gm
  while ((m = regex2.exec(content)) !== null) { if (!numbers.includes(m[1])) numbers.push(m[1]) }
  return [...new Set(numbers)].sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
}

async function readMevzuatFile(filename: string): Promise<{ content: string; stat: { mtime: Date } } | null> {
  const filePath = path.join(MEVZUAT_DIR, filename)
  try {
    const [content, stat] = await Promise.all([
      fs.readFile(filePath, 'utf-8'),
      fs.stat(filePath),
    ])
    return { content, stat }
  } catch {
    return null
  }
}

async function loadUpdateLog(): Promise<UpdateLog> {
  try {
    const raw = await fs.readFile(UPDATE_LOG_PATH, 'utf-8')
    const data = JSON.parse(raw) as UpdateLog
    if (data.previousSnapshot && typeof data.previousSnapshot === 'object' && Array.isArray(data.runs)) return data
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

async function loadInputAmendments(): Promise<InputAmendment[]> {
  const p = path.join(INPUT_DIR, 'amendments.json')
  try {
    const raw = await fs.readFile(p, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []
  } catch {
    return []
  }
}

async function loadInputDecisions(): Promise<InputDecision[]> {
  const p = path.join(INPUT_DIR, 'decisions.json')
  try {
    const raw = await fs.readFile(p, 'utf-8')
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []
  } catch {
    return []
  }
}

function detectAmendments(
  previousSnapshot: Record<string, FileSnapshot>,
  current: Record<string, { hash: string; lastModified: string; articleNumbers: string[] }>
): AmendmentDetected[] {
  const detected: AmendmentDetected[] = []
  for (const file of MEVZUAT_FILES) {
    const key = `law-data/mevzuat/${file}`
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
      detected.push({ file: key, lawName, type: 'changed', articlesPossiblyChanged: curr.articleNumbers.slice(0, 15) })
    }
  }
  return detected
}

function formatSourcesList(sources: LegalSource[]): string[] {
  return sources.map((s) => `- **${s.name}** (öncelik ${s.priority}, güncelleme: ${s.update_frequency}) – ${s.notes}`)
}

function buildAmendmentsMarkdown(
  detected: AmendmentDetected[],
  inputAmendments: InputAmendment[],
  runDate: string
): string {
  const amendmentSources = getLegalSourcesForAmendments()
  const lines: string[] = [
    '---',
    'source: "Resmî Gazete / Mevzuat takip (update-legal-data script)"',
    `date: "${runDate.slice(0, 10)}"`,
    'last_checked: "' + runDate.slice(0, 10) + '"',
    'legal_area: "Genel"',
    'confidence: "medium"',
    '---',
    '',
    '# Son Değişiklikler (Yakın Dönem Kanun Değişiklikleri)',
    '',
    'Bu dosya, yerel mevzuat dosyalarındaki değişiklikler ve manuel eklenen Resmî Gazete özetleriyle güncellenir. Resmî ve güncel metin için aşağıdaki kaynaklar kullanılmalıdır.',
    '',
    '## Resmî kaynak önceliği (kanun değişiklikleri)',
    '',
    ...formatSourcesList(amendmentSources),
    '',
    '---',
    '',
    '## Yerel mevzuat dosyası değişiklikleri',
    '',
  ]
  if (detected.length === 0 && inputAmendments.length === 0) {
    lines.push('Son çalıştırmada yeni değişiklik tespit edilmedi.', '')
  }
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
    lines.push('- **Kaynak:** Yerel mevzuat dosyası güncellendi (hash değişikliği).', '')
  }
  if (inputAmendments.length) {
    lines.push('## Resmî Gazete / manuel eklenen değişiklikler', '')
    for (const a of inputAmendments) {
      lines.push(`### ${a.lawName}${a.date ? ` – ${a.date}` : ''}`)
      if (a.changedArticles?.length) {
        lines.push(`- **Değişen maddeler:** ${a.changedArticles.join(', ')}`)
      }
      if (a.summary) lines.push(`- **Özet:** ${a.summary}`)
      if (a.source) lines.push(`- **Kaynak:** ${a.source}`)
      lines.push('')
    }
  }
  lines.push('---', '', '*Güncel metin için Resmî Gazete kontrol edilmelidir.*')
  return lines.join('\n')
}

function buildDecisionsMarkdown(inputDecisions: InputDecision[], runDate: string): string {
  const decisionSources = getLegalSourcesForDecisions()
  const lines: string[] = [
    '---',
    'source: "Yargıtay / AYM karar veritabanları (update-legal-data script)"',
    `date: "${runDate.slice(0, 10)}"`,
    'last_checked: "' + runDate.slice(0, 10) + '"',
    'legal_area: "Genel"',
    'confidence: "medium"',
    '---',
    '',
    '# Son Önemli Kararlar (Yakın Dönem İçtihat)',
    '',
    'Bu dosya, manuel eklenen veya script ile güncellenen karar özetlerini içerir. Resmî ve güncel metin için aşağıdaki karar arama kaynakları kullanılmalıdır.',
    '',
    '## Resmî kaynak önceliği (kararlar)',
    '',
    ...formatSourcesList(decisionSources),
    '',
    '---',
    '',
  ]
  if (inputDecisions.length === 0) {
    lines.push('Henüz karar özeti eklenmemiş. `law-data/guncellemeler/input/decisions.json` dosyasına ekleyebilirsiniz.', '')
  } else {
    for (const d of inputDecisions) {
      lines.push(`### ${d.court}${d.dossierNo ? ` – ${d.dossierNo}` : ''}${d.date ? ` – ${d.date}` : ''}`)
      if (d.subject) lines.push(`- **Konu:** ${d.subject}`)
      if (d.summary) lines.push(`- **Özet / Sonuç:** ${d.summary}`)
      if (d.source) lines.push(`- **Kaynak:** ${d.source}`)
      lines.push('')
    }
  }
  lines.push('---', '', '*Güncel kararlar ilgili mahkeme sitelerinden kontrol edilmelidir.*')
  return lines.join('\n')
}

async function main(): Promise<void> {
  const runDate = new Date().toISOString()
  const schedule = getScheduleMode()
  console.log('Legal updates pipeline –', runDate, `[schedule: ${schedule}]`)

  await fs.mkdir(INPUT_DIR, { recursive: true })

  const log = await loadUpdateLog()
  const currentSnapshot: Record<string, FileSnapshot> = {}
  const filesChanged: string[] = []

  for (const file of MEVZUAT_FILES) {
    const data = await readMevzuatFile(file)
    const key = `law-data/mevzuat/${file}`
    if (!data) continue
    const hash = sha256(data.content)
    const lastModified = data.stat.mtime.toISOString()
    const articleNumbers = extractArticleNumbers(data.content)
    currentSnapshot[key] = { hash, lastModified, articleNumbers }
    const prev = log.previousSnapshot[key]
    if (!prev || prev.hash !== hash) filesChanged.push(key)
  }

  const amendmentsDetected = detectAmendments(log.previousSnapshot, currentSnapshot)
  const inputAmendments = schedule === 'weekly' ? [] : await loadInputAmendments()
  const inputDecisions = schedule === 'daily' ? [] : await loadInputDecisions()

  log.previousSnapshot = currentSnapshot
  log.lastRun = runDate
  log.runs.push({
    at: runDate,
    schedule,
    amendmentsDetected,
    decisionsAdded: inputDecisions.length,
    filesChanged,
    inputAmendments: inputAmendments.length,
    inputDecisions: inputDecisions.length,
  })
  if (log.runs.length > 100) log.runs = log.runs.slice(-100)

  const writes: Promise<void>[] = [saveUpdateLog(log)]

  if (schedule === 'full' || schedule === 'daily') {
    const amendmentsMd = buildAmendmentsMarkdown(amendmentsDetected, inputAmendments, runDate)
    await saveHistoryBeforeOverwrite(RECENT_AMENDMENTS_PATH, 'amendments', runDate)
    writes.push(fs.writeFile(RECENT_AMENDMENTS_PATH, amendmentsMd, 'utf-8'))
  }
  if (schedule === 'full' || schedule === 'weekly') {
    const decisionsMd = buildDecisionsMarkdown(inputDecisions, runDate)
    await saveHistoryBeforeOverwrite(RECENT_DECISIONS_PATH, 'decisions', runDate)
    writes.push(fs.writeFile(RECENT_DECISIONS_PATH, decisionsMd, 'utf-8'))
  }

  await fs.mkdir(GUNCELLEMELER_DIR, { recursive: true })
  await Promise.all(writes)

  console.log('Done.')
  console.log('  Schedule:', schedule)
  console.log('  Files changed:', filesChanged.length)
  console.log('  Amendments detected:', amendmentsDetected.length)
  if (schedule !== 'weekly') console.log('  Input amendments:', inputAmendments.length)
  if (schedule !== 'daily') console.log('  Input decisions:', inputDecisions.length)
  console.log('  Written: update-log.json' + (schedule !== 'weekly' ? ', recent-amendments.md' : '') + (schedule !== 'daily' ? ', recent-important-decisions.md' : ''))
  console.log('  History: law-data/guncellemeler/history/ (previous summaries kept before overwrite)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
