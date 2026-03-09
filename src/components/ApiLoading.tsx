'use client'

/**
 * Ortak API yükleme göstergesi. Sayfalarda "Kaynaklar taranıyor…" / "Yanıt hazırlanıyor…" benzeri durumlarda kullanılır.
 */
export function ApiLoading({ message = 'Yükleniyor…' }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex gap-1.5">
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:0ms]" />
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:150ms]" />
        <span className="loading-dot w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-teal-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}
