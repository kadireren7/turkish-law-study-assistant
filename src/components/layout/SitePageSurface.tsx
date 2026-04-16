import type { ReactNode } from 'react'

/**
 * Ortak “premium” arka plan: gradient + hafif ızgara + teal blur (Pratik / uygulama geneli ile uyumlu).
 */
export function SitePageSurface({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-white to-teal-50/80 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,118,110,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,118,110,0.07)_1px,transparent_1px)] bg-[size:48px_48px] dark:bg-[linear-gradient(to_right,rgba(45,212,191,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(45,212,191,0.06)_1px,transparent_1px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10"
      />
      <div className="relative z-[1] flex min-h-screen flex-col">{children}</div>
    </div>
  )
}
