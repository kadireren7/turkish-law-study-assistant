'use client'

/**
 * API hata kutusu: mesaj + tekrar dene butonu. Sayfalarda ortak hata gösterimi için.
 */
export function ApiErrorBox({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-6"
      role="alert"
      aria-live="assertive"
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-200">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          aria-label="Tekrar dene"
        >
          Tekrar dene
        </button>
      )}
    </div>
  )
}
