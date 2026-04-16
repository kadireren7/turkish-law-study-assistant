'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

function ExamPracticeHeroInner() {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card dark:border-slate-700/80 dark:bg-slate-800/90 dark:shadow-card-dark sm:p-8"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-teal-400/25 to-emerald-500/15 blur-2xl dark:from-teal-500/20 dark:to-emerald-600/10"
        aria-hidden
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden />
            StudyLaw · Sınav modülü
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Sınav Pratiği</h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Hukuk fakültesi sınavına uygun olay ve analiz soruları üretin; cevabınızı yazıp yapay zekâ ile
            değerlendirin. PDF, Word veya Markdown ile dışa aktarın.
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-teal-50/80 text-4xl shadow-inner dark:border-slate-600 dark:from-slate-800 dark:to-teal-950/40"
          aria-hidden
        >
          ⚖️
        </motion.div>
      </div>
    </motion.header>
  )
}

export const ExamPracticeHero = memo(ExamPracticeHeroInner)
