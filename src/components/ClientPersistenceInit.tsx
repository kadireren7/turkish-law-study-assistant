'use client'

import { useEffect } from 'react'

/** Tarayıcıda cihaz kimliği çerezi + localStorage ile oturum tutarlılığı (aynı origin). */
export function ClientPersistenceInit() {
  useEffect(() => {
    try {
      let id = localStorage.getItem('studylaw_device_id')
      if (!id && typeof crypto !== 'undefined' && crypto.randomUUID) {
        id = crypto.randomUUID()
        localStorage.setItem('studylaw_device_id', id)
      }
      if (id) {
        document.cookie = `studylaw_device=${encodeURIComponent(id)};path=/;max-age=31536000;SameSite=Lax`
      }
    } catch {
      /* ignore */
    }
  }, [])
  return null
}
