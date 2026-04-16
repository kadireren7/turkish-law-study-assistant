'use client'

import Link from 'next/link'
import { StudySummary } from '@/components/shared/StudySummary'

export default function CalismaOzetiPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Çalışma özeti ve öneriler</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Pratik, sözlü ve olay analizi verilerinize göre tekrar, pratik ve zayıf alan önerileri.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            ← Ana sayfa
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <StudySummary variant="full" />
      </div>
    </div>
  )
}
