'use client'

import { memo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const MESSAGES = [
  'Pratik senaryo hazırlanıyor...',
  'Hukuki çerçeve oluşturuluyor...',
  'Sorular yazılıyor...',
  'Son kontroller yapılıyor...',
] as const

function PracticeLoadingInner() {
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((n) => (n + 1) % MESSAGES.length)
    }, 2200)
    return () => window.clearInterval(id)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card-premium overflow-hidden p-6 dark:bg-slate-800/90"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="relative mb-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <motion.div
          className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
          animate={{ x: ['-100%', '400%'] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
        />
      </div>
      <div className="space-y-3">
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm font-medium text-slate-800 dark:text-slate-100"
        >
          {MESSAGES[msgIndex]}
        </motion.p>
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
          <div className="h-3 w-[92%] animate-pulse rounded-lg bg-slate-100 dark:bg-slate-700" />
          <div className="h-3 w-4/5 animate-pulse rounded-lg bg-slate-100/90 dark:bg-slate-700/90" />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Bu işlem birkaç saniye sürebilir.</p>
      </div>
    </motion.div>
  )
}

export const PracticeLoading = memo(PracticeLoadingInner)
