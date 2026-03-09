'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

const navItems = [
  { href: '/', label: 'Ana Sayfa', icon: '🏠' },
  { href: '/sohbet', label: 'Sohbet', icon: '💬' },
  { href: '/law-search', label: 'Madde Ara', icon: '🔍' },
  { href: '/case-solver', label: 'Olay Analizi', icon: '⚖️' },
  { href: '/karar-analizi', label: 'Karar Analizi', icon: '📋' },
  { href: '/mini-sozlu', label: 'Mini Sözlü Yoklama', icon: '🎤' },
  { href: '/pratik-coz', label: 'Pratik Çöz', icon: '✏️' },
  { href: '/law-lessons', label: 'Konu Anlatımı', icon: '📖' },
  { href: '/flashcards', label: 'Bilgi Kartları', icon: '🃏' },
  { href: '/guncel-gelismeler', label: 'Güncel Gelişmeler', icon: '📌' },
  { href: '/haberler', label: 'Haberler', icon: '📰' },
  { href: '/calisma-ozeti', label: 'Çalışma Özeti', icon: '📊' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  function NavLink({
    href,
    label,
    icon,
    onNavigate,
  }: { href: string; label: string; icon: string; onNavigate?: () => void }) {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
          isActive
            ? 'bg-teal-500/15 dark:bg-teal-400/15 text-teal-700 dark:text-teal-300'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition-colors ${
            isActive
              ? 'bg-teal-100 dark:bg-teal-500/25 text-teal-600 dark:text-teal-300'
              : 'bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400'
          }`}
        >
          {icon}
        </span>
        {label}
      </Link>
    )
  }

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 shadow-sm md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
          aria-label="Menüyü aç"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="truncate text-base font-semibold text-slate-800 dark:text-slate-100">Hukuk Çalışma</h1>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-lg transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 md:hidden">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Menü</span>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Menüyü kapat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="hidden border-b border-slate-100 dark:border-slate-800 p-4 md:block md:p-5">
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-tight">Hukuk Çalışma</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Akıllı hukuk çalışma platformu</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Ana menü">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onNavigate={closeMobile} />
          ))}
        </nav>
        <div className="border-t border-slate-100 dark:border-slate-800 p-4 space-y-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
          >
            {theme === 'dark' ? (
              <>
                <span className="text-lg">☀️</span>
                <span>Açık tema</span>
              </>
            ) : (
              <>
                <span className="text-lg">🌙</span>
                <span>Koyu tema</span>
              </>
            )}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Eğitim amaçlıdır; hukuki danışmanlık değildir.
          </p>
        </div>
      </aside>
    </>
  )
}
