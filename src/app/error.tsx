'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 min-h-[40vh]" role="alert" aria-live="assertive">
      <div className="max-w-md w-full text-center rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <span className="text-3xl" role="img" aria-hidden>
          ⚠️
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100">
          Bir hata oluştu
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          İşleminiz sırasında bir sorun oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-label="Tekrar dene"
          >
            Tekrar dene
          </button>
          <Link
            href="/"
            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 inline-block text-center"
            aria-label="Ana sayfaya dön"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  )
}
