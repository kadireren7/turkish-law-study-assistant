'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HaberlerNewsControls() {
  const router = useRouter()
  const [manual, setManual] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [errHint, setErrHint] = useState<string | null>(null)

  async function runUpdate() {
    setManual('loading')
    setErrHint(null)
    try {
      const res = await fetch('/api/news-update', { method: 'POST' })
      if (res.status === 401) {
        setManual('error')
        setErrHint('Sunucuda CRON_SECRET tanımlı; tarayıcıdan güncelleme engellenmiş olabilir. Yerel geliştirmede .env içinde CRON_SECRET’i kaldırın veya cron ile güncelleyin.')
        return
      }
      if (!res.ok) {
        setManual('error')
        setErrHint('Güncelleme başarısız. Ağ veya sunucu günlüklerine bakın.')
        return
      }
      setManual('ok')
      router.refresh()
    } catch {
      setManual('error')
      setErrHint('Ağ hatası.')
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
      <button
        type="button"
        onClick={() => void runUpdate()}
        disabled={manual === 'loading'}
        className="inline-flex items-center justify-center rounded-xl border border-teal-500/35 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-500/15 disabled:opacity-60 dark:text-teal-100 dark:hover:bg-teal-500/20"
      >
        {manual === 'loading' ? 'Güncelleniyor…' : 'Haberleri şimdi yenile'}
      </button>
      {manual === 'ok' && (
        <span className="text-xs text-teal-600 dark:text-teal-400">Liste yenilendi.</span>
      )}
      {manual === 'error' && errHint && (
        <span className="text-xs text-amber-700 dark:text-amber-400/95">{errHint}</span>
      )}
    </div>
  )
}
