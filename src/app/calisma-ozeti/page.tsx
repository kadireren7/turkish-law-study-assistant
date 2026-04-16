'use client'

import Link from 'next/link'
import { SitePageSurface } from '@/components/layout/SitePageSurface'
import { StudySummary } from '@/components/shared/StudySummary'

export default function CalismaOzetiPage() {
  return (
    <SitePageSurface>
      <header className="shrink-0 border-b border-teal-500/15 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-md dark:border-teal-500/10 dark:bg-slate-900/75 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Çalışma özeti ve öneriler</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Pratik, sözlü ve olay analizi verilerinize göre tekrar, pratik ve zayıf alan önerileri.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
          >
            ← Ana sayfa
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <StudySummary variant="full" />
      </div>
    </SitePageSurface>
  )
}
