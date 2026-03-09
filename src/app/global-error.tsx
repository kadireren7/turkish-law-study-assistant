'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('GlobalError:', error)
  }, [error])

  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg p-8">
            <span className="text-4xl" role="img" aria-hidden>
              ⚠️
            </span>
            <h1 className="mt-4 text-xl font-semibold text-slate-800 dark:text-slate-100">
              Bir şeyler yanlış gitti
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
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
              <a
                href="/"
                className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 inline-block"
                aria-label="Ana sayfaya dön"
              >
                Ana sayfaya dön
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
