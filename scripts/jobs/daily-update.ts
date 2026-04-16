#!/usr/bin/env npx tsx
/**
 * Full legal update pipeline: mevzuat RSS, güncel gelişmeler, hukuk haberleri.
 * Used by GitHub Actions (manual) and local Windows (manual or Task Scheduler).
 *
 * Order: 1) amendments:fetch  2) legal:update  3) news:update
 * Outputs: data/derived/updates/*.md, update-log.json, data/derived/news/hukuk-haberleri.json, last-full-update.json
 *
 * Run: npm run daily:update
 */
import { spawnSync } from 'child_process'
import path from 'path'
import fs from 'fs/promises'

const ROOT = process.cwd()
const isWindows = process.platform === 'win32'
const npx = isWindows ? 'npx.cmd' : 'npx'
const LAST_FULL_UPDATE_PATH = path.join(ROOT, 'data', 'derived', 'last-full-update.json')

function run(name: string, scriptAndArgs: string[]): boolean {
  console.log('\n---', name, '---')
  const r = spawnSync(npx, ['tsx', ...scriptAndArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  })
  if (r.status !== 0) {
    console.error(name, 'başarısız, çıkış kodu:', r.status)
    return false
  }
  return true
}

async function main(): Promise<void> {
  const started = new Date().toISOString()
  console.log('Full legal update pipeline started:', started.slice(0, 19))

  if (!run('Mevzuat RSS (amendments:fetch)', ['scripts/ingest/fetch-amendments-rss.ts'])) {
    process.exit(1)
  }
  if (!run('Güncel mevzuat / karar özetleri (legal:update)', ['scripts/transform/update-legal-data.ts'])) {
    process.exit(1)
  }
  if (!run('Hukuk haberleri (news:update)', ['scripts/ingest/update-news.ts', '--mode=law'])) {
    process.exit(1)
  }

  try {
    await fs.mkdir(path.join(ROOT, 'data', 'derived'), { recursive: true })
    await fs.writeFile(
      LAST_FULL_UPDATE_PATH,
      JSON.stringify({ lastRun: started }, null, 2),
      'utf-8'
    )
    console.log('\nlast-full-update.json written.')
  } catch {
    // non-fatal
  }

  console.log('\nFull legal update pipeline finished.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
