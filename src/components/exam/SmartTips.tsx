'use client'

import { memo, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const TIPS = [
  'Olay çözümünde önce hukuki sorunu tespit edin.',
  'Madde ezberi yerine gerekçe kurun.',
  'Usul ve esas hükümleri birbirinden ayırın.',
  'Somut olay ile norm arasında bağ kurmayı gösterin.',
  'Karşı argümanları da kısaca değerlendirin.',
] as const

function SmartTipsInner() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setI((n) => (n + 1) % TIPS.length)
    }, 6500)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div
      className="rounded-2xl border border-dashed border-slate-200/90 bg-slate-50/80 px-4 py-3 dark:border-slate-600/80 dark:bg-slate-900/40"
      role="status"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Akıllı ipucu</p>
      <div className="relative mt-1 min-h-[2.75rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
            className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
          >
            {TIPS[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}

export const SmartTips = memo(SmartTipsInner)
