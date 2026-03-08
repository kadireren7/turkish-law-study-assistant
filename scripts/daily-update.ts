#!/usr/bin/env npx tsx
/**
 * Günlük otomatik güncelleme: haberler, mevzuat değişiklikleri ve güncel hukuk gelişmeleri.
 * Sıra: 1) Mevzuat RSS çekimi 2) Legal update (recent-amendments, decisions) 3) Hukuk haberleri.
 * Siyaset gündemi dahil değildir.
 *
 * Tek seferde: npm run daily:update
 * Windows'ta her gün otomatik: Görev Zamanlayıcı ile bu komutu günlük çalıştırın (örn. sabah 06:00).
 */
import { spawnSync } from 'child_process'

const ROOT = process.cwd()
const isWindows = process.platform === 'win32'
const npx = isWindows ? 'npx.cmd' : 'npx'

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
  console.log('Günlük güncelleme başlıyor:', new Date().toISOString().slice(0, 19))

  if (!run('Mevzuat RSS (amendments:fetch)', ['scripts/fetch-amendments-rss.ts'])) {
    process.exit(1)
  }
  if (!run('Güncel mevzuat/karar özetleri (legal:update)', ['scripts/update-legal-data.ts'])) {
    process.exit(1)
  }
  if (!run('Hukuk haberleri (news:update)', ['scripts/update-news.ts', '--mode=law'])) {
    process.exit(1)
  }

  console.log('\nGünlük güncelleme tamamlandı.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
