'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ui/ThemeProvider'
import { BrandLogo } from '@/components/ui/BrandLogo'
import { loadSavedQuestions, deleteSavedQuestion, type SavedPracticeItem } from '@/lib/saved-practice-questions'

const navItems = [
  { href: '/sohbet', label: 'Sohbet', icon: ChatIcon },
  { href: '/pratik-coz', label: 'Pratik', icon: PracticeIcon },
  { href: '/kesfet', label: 'Keşfet', icon: ExploreIcon },
] as const

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 3l-6 18-3-9-9-3 18-6z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 8v13H3V8M1 3h22v5H1V3zM10 12h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatArchiveDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startToday - startThat) / 86400000)
  if (diffDays <= 0) return 'Bugün'
  if (diffDays === 1) return 'Dün'
  if (diffDays < 7) return `${diffDays} gün önce`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function archivePreviewText(item: SavedPracticeItem): string {
  const scen = item.scenario?.trim()
  if (scen) return scen.replace(/\s+/g, ' ')
  return item.question.replace(/\s+/g, ' ')
}

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [savedQuestions, setSavedQuestions] = useState<SavedPracticeItem[]>([])
  const closeMobile = () => setMobileOpen(false)

  useEffect(() => {
    const sync = () => setSavedQuestions(loadSavedQuestions())
    sync()
    window.addEventListener('saved-questions-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('saved-questions-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-30 flex h-12 items-center gap-3 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm px-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Menüyü aç"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="flex items-center gap-2 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
          <BrandLogo className="shrink-0" />
          Hukuk Çalışma
        </span>
      </div>

      {mobileOpen && (
        <button type="button" aria-label="Menüyü kapat" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeMobile} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] shrink-0 flex-col border-r border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-3 md:h-14 md:border-0 md:px-4 md:pt-4">
          <Link
            href="/sohbet"
            onClick={closeMobile}
            className="flex min-w-0 items-center gap-2 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-base"
          >
            <BrandLogo className="shrink-0" />
            <span className="truncate">Hukuk Çalışma</span>
          </Link>
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Kapat"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 p-2 md:px-2 md:pt-2" aria-label="Ana menü">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/sohbet' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="shrink-0 opacity-80" />
                {item.label}
              </Link>
            )
          })}

          {savedQuestions.length > 0 && (
            <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <div className="flex min-w-0 items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <ArchiveIcon className="shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="truncate text-xs font-semibold tracking-tight">Soru arşivi</span>
                </div>
                <span
                  className="shrink-0 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-teal-700 dark:bg-teal-400/15 dark:text-teal-300"
                  title="Kayıtlı soru sayısı"
                >
                  {savedQuestions.length}
                </span>
              </div>
              <div className="sidebar-archive-scroll max-h-[min(320px,42vh)] space-y-2 overflow-y-auto overflow-x-hidden pl-0.5 pr-1">
                {savedQuestions.slice(0, 20).map((sq) => {
                  const preview = archivePreviewText(sq)
                  const topic = sq.topic?.trim()
                  const fullTitle = topic ? `${topic} — ${preview}` : preview
                  return (
                    <article
                      key={sq.id}
                      className="group relative rounded-lg border border-slate-200/90 bg-slate-50/90 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/60 dark:shadow-none"
                    >
                      <Link
                        href={`/pratik-coz?saved=${encodeURIComponent(sq.id)}`}
                        onClick={closeMobile}
                        className="block rounded-lg px-2.5 py-2 pr-8 transition-colors hover:bg-white/80 dark:hover:bg-slate-800/70"
                        title={fullTitle}
                      >
                        {topic ? (
                          <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400/95">
                            {topic}
                          </p>
                        ) : null}
                        <p className="line-clamp-2 text-left text-[11px] leading-snug text-slate-700 dark:text-slate-200">{preview}</p>
                        <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">{formatArchiveDate(sq.createdAt)}</p>
                      </Link>
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 opacity-70 transition hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Arşivden sil"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteSavedQuestion(sq.id)
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                          <path d="M3 6h18M8 6V4h8v2M19 6v14H5V6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? (
              <>
                <span aria-hidden>☀️</span>
                Açık tema
              </>
            ) : (
              <>
                <span aria-hidden>🌙</span>
                Koyu tema
              </>
            )}
          </button>
          <p className="px-1 text-[10px] leading-snug text-slate-400 dark:text-slate-600">Eğitim amaçlıdır; hukuki danışmanlık değildir.</p>
        </div>
      </aside>
    </>
  )
}
