/**
 * Haberler güncelleme API’si.
 * GET veya POST ile çağrılır; RSS’ten veri çekip data/derived/news dosyalarını günceller.
 * Günlük cron veya “yeni gün” tetikleyicisi için kullanılır.
 * İsteğe bağlı: CRON_SECRET env ile yetkilendirme (Authorization: Bearer <CRON_SECRET>).
 * Bu, kullanıcı hesabı/üyelik değildir; yalnızca cron/sunucu çağrılarını korur. CRON_SECRET yoksa tarayıcı da tetikleyebilir.
 */
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  return runUpdate(request)
}

export async function POST(request: Request) {
  return runUpdate(request)
}

async function runUpdate(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret?.trim()) {
    const auth = request.headers.get('authorization')
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
    if (token !== cronSecret) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    }
  }

  const root = process.cwd()
  const scriptPath = path.join(root, 'scripts', 'ingest', 'update-news.ts')
  const cmd = `npx tsx "${scriptPath}" --mode=all`

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: root,
      timeout: 55_000,
      maxBuffer: 2 * 1024 * 1024,
    })
    const out = [stdout, stderr].filter(Boolean).join('\n').trim()
    return NextResponse.json({
      ok: true,
      date: getTodayIso(),
      message: 'Haberler güncellendi.',
      log: out || undefined,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: 'Güncelleme hatası', detail: message },
      { status: 500 }
    )
  }
}
