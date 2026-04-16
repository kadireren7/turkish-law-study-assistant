'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

function EmptyPracticeStateInner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-premium flex flex-col items-center justify-center gap-3 px-6 py-14 text-center dark:bg-slate-800/80"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="text-5xl opacity-90"
        aria-hidden
      >
        📋
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Henüz soru yok</h3>
      <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        Yukarıdaki ayarlarla &quot;Soruları oluştur&quot; dediğinizde, burada fakülte sınavına uygun metin ve alt sorular
        görünecek.
      </p>
    </motion.div>
  )
}

export const EmptyPracticeState = memo(EmptyPracticeStateInner)
