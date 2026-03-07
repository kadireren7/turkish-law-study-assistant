'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const coreTools = [
  { href: '/', label: 'Ana Sayfa', icon: '🏠' },
  { href: '/sohbet', label: 'Sohbet', icon: '💬' },
  { href: '/law-search', label: 'Madde Ara', icon: '🔍' },
  { href: '/case-solver', label: 'Olay Analizi', icon: '⚖️' },
  { href: '/exam-practice', label: 'Sınav Pratiği', icon: '📋' },
  { href: '/haberler', label: 'Haberler', icon: '📰' },
]

const otherTools = [
  { href: '/quiz', label: 'Çoktan Seçmeli Test', icon: '📝' },
  { href: '/flashcards', label: 'Bilgi Kartları', icon: '🃏' },
  { href: '/law-lessons', label: 'Konu Anlatımı', icon: '📚' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function NavLink({
    href,
    label,
    icon,
    muted,
    onNavigate,
  }: { href: string; label: string; icon: string; muted?: boolean; onNavigate?: () => void }) {
    const isActive = pathname === href
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
          isActive
            ? 'bg-teal-50 text-teal-700'
            : muted
              ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base ${
            isActive ? 'bg-teal-100 text-teal-600' : muted ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'
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
      {/* Mobil üst bar + hamburger */}
      <div className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 shadow-sm md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label="Menüyü aç"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="truncate text-base font-semibold text-slate-800">Hukuk Çalışma Asistanı</h1>
      </div>

      {/* Overlay (sadece mobil, menü açıkken) */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar: mobilde drawer, masaüstünde normal */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-white shadow-lg transition-transform duration-200 ease-out md:relative md:z-auto md:translate-x-0 md:shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4 md:hidden">
          <span className="text-sm font-semibold text-slate-800">Menü</span>
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Menüyü kapat"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="hidden border-b border-slate-100 p-4 md:block md:p-6">
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Hukuk Çalışma Asistanı</h1>
          <p className="mt-1 text-xs text-slate-500">Ders ve sınav çalışmanız için</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {coreTools.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onNavigate={closeMobile} />
          ))}
          <div className="pt-4 mt-2 border-t border-slate-100">
            <p className="px-3 pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
              Diğer araçlar
            </p>
            {otherTools.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} muted onNavigate={closeMobile} />
            ))}
          </div>
        </nav>
        <div className="border-t border-slate-100 p-4">
          <p className="text-xs text-slate-400">
            Hukuki danışmanlık değildir; yalnızca çalışma amaçlıdır.
          </p>
        </div>
      </aside>
    </>
  )
}
