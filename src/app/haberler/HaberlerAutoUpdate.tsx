'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/** Son güncelleme bugün değilse arka planda API ile güncelleme tetikler; tamamlanınca sayfayı yeniler. Hesap/üyelik gerekmez. Sunucuda CRON_SECRET tanımlıysa 401 alınabilir; o zaman otomatik güncelleme atlanır, sayfa normal çalışır. */
export function HaberlerAutoUpdate({ lastSuccessfulUpdate }: { lastSuccessfulUpdate: string | null }) {
  const router = useRouter()
  const triggered = useRef(false)
  const [status, setStatus] = useState<'idle' | 'updating' | 'ok' | 'error'>('idle')

  useEffect(() => {
    if (triggered.current) return
    const today = new Date().toISOString().slice(0, 10)
    const lastDate = lastSuccessfulUpdate?.trim().slice(0, 10)
    if (lastDate === today) return
    triggered.current = true
    setStatus('updating')

    fetch('/api/news-update', { method: 'POST' })
      .then((res) => {
        if (res.ok) {
          setStatus('ok')
          router.refresh()
        } else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [lastSuccessfulUpdate, router])

  if (status === 'idle' || status === 'ok') return null
  if (status === 'error')
    return (
      <span className="text-amber-600 text-xs">
        Otomatik güncelleme şu an çalışmadı; sayfayı yenileyerek tekrar deneyebilirsiniz.
      </span>
    )
  return (
    <span className="text-teal-600 text-xs font-medium" aria-live="polite">
      Haberler güncelleniyor…
    </span>
  )
}
