'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HABERLER_AUTO_ATTEMPT_COOLDOWN_MS, HABERLER_STALE_AFTER_MS } from '@/lib/haberler-refresh-policy'

const STORAGE_ATTEMPT = 'studylaw:haberler:autoFetchAttemptAt'

function isDataStale(lastSuccessfulUpdate: string | null): boolean {
  if (lastSuccessfulUpdate == null || !String(lastSuccessfulUpdate).trim()) return true
  const t = Date.parse(String(lastSuccessfulUpdate).trim())
  if (Number.isNaN(t)) return true
  return Date.now() - t > HABERLER_STALE_AFTER_MS
}

/**
 * Veri “bayat” ise arka planda /api/news-update tetikler; başarılı olunca sayfayı yeniler.
 * Eski mantık (sadece takvim günü değişince) kaldırıldı — gün içinde de RSS yenilenebilir.
 * CRON_SECRET tanımlıysa 401 alınabilir; kullanıcıya kısa uyarı + “Haberleri şimdi yenile” ile deneme.
 */
export function HaberlerAutoUpdate({ lastSuccessfulUpdate }: { lastSuccessfulUpdate: string | null }) {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'updating' | 'ok' | 'error'>('idle')
  const [errorKind, setErrorKind] = useState<'none' | 'unauthorized' | 'other'>('none')

  useEffect(() => {
    if (!isDataStale(lastSuccessfulUpdate)) {
      setStatus('idle')
      setErrorKind('none')
      return
    }

    try {
      const last = Number(sessionStorage.getItem(STORAGE_ATTEMPT) || 0)
      if (Date.now() - last < HABERLER_AUTO_ATTEMPT_COOLDOWN_MS) return
      sessionStorage.setItem(STORAGE_ATTEMPT, String(Date.now()))
    } catch {
      // sessionStorage yoksa yine dene
    }

    setStatus('updating')
    setErrorKind('none')

    fetch('/api/news-update', { method: 'POST' })
      .then((res) => {
        if (res.status === 401) {
          setStatus('error')
          setErrorKind('unauthorized')
          return
        }
        if (res.ok) {
          setStatus('ok')
          router.refresh()
        } else {
          setStatus('error')
          setErrorKind('other')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorKind('other')
      })
  }, [lastSuccessfulUpdate, router])

  if (status === 'idle' || status === 'ok') return null
  if (status === 'error') {
    if (errorKind === 'unauthorized') {
      return (
        <span className="text-amber-700 dark:text-amber-400/95 text-xs">
          Otomatik güncelleme sunucu güvenlik ayarı (CRON_SECRET) nedeniyle reddedildi. Aşağıdan &quot;Haberleri şimdi yenile&quot;yi deneyin veya yerelde CRON_SECRET’i kaldırın.
        </span>
      )
    }
    return (
      <span className="text-amber-600 dark:text-amber-400 text-xs">
        Otomatik güncelleme şu an tamamlanamadı; &quot;Haberleri şimdi yenile&quot; ile tekrar deneyebilirsiniz.
      </span>
    )
  }
  return (
    <span className="text-teal-600 dark:text-teal-400 text-xs font-medium" aria-live="polite">
      Haberler güncelleniyor…
    </span>
  )
}
