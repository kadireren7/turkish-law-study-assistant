'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  getProfile,
  getSuggestions,
  getTotalPracticeCount,
  SUBJECT_LABELS,
  type SubjectKey,
  type StudyProfile,
} from '@/lib/study-engine'

type Props = {
  /** Kompakt: sadece birkaç öneri + link. Geniş: tüm bölümler */
  variant?: 'compact' | 'full'
}

export function StudySummary({ variant = 'compact' }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const profile = mounted ? getProfile() : null
  const total = getTotalPracticeCount(profile ?? undefined)
  const suggestions = getSuggestions(profile ?? undefined)

  if (!mounted) return null
  if (total < 1 && variant === 'compact') return null

  if (variant === 'compact') {
    const lines = [
      ...suggestions.tekrarOnerileri.slice(0, 1),
      ...suggestions.zayifAlanOnerileri.slice(0, 1),
      ...suggestions.pratikOnerileri.slice(0, 1),
    ].filter(Boolean)
    return (
      <section className="mt-12 p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Çalışma özetiniz</h3>
          <Link
            href="/calisma-ozeti"
            className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
          >
            Önerilerim →
          </Link>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Toplam {total} pratik / sözlü / olay analizi kaydedildi.
        </p>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {lines.slice(0, 3).map((line, i) => (
            <li key={i}>• {line}</li>
          ))}
        </ul>
      </section>
    )
  }

  const p = profile!
  const subjectsWithCount = (Object.keys(p.subjectCount) as SubjectKey[]).filter((k) => (p.subjectCount[k] ?? 0) > 0)
  const weak = (Object.keys(p.subjectScores) as SubjectKey[]).filter((k) => {
    const s = p.subjectScores[k]
    return s.n >= 1 && s.sum / s.n < 60
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Çalışma özetiniz</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Toplam {total} pratik kaydı. Veriler yalnızca bu cihazda saklanır.
        </p>
        {subjectsWithCount.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">En çok çalışılan alanlar</h3>
            <ul className="flex flex-wrap gap-2">
              {subjectsWithCount
                .sort((a, b) => (p.subjectCount[b] ?? 0) - (p.subjectCount[a] ?? 0))
                .map((k) => (
                  <li
                    key={k}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm"
                  >
                    {SUBJECT_LABELS[k]}: {p.subjectCount[k]}
                  </li>
                ))}
            </ul>
          </div>
        )}
        {weak.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Zayıf alanlar (ortalama &lt; 60)</h3>
            <ul className="text-sm text-slate-600 dark:text-slate-400">
              {weak.map((k) => (
                <li key={k}>• {SUBJECT_LABELS[k]}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Tekrar önerileri</h2>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {suggestions.tekrarOnerileri.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      </section>

      <section className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Yeni pratik önerileri</h2>
        <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          {suggestions.pratikOnerileri.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      </section>

      {suggestions.zayifAlanOnerileri.length > 0 && (
        <section className="p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 shadow-card dark:shadow-card-dark">
          <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-3">Zayıf alan çalışması</h2>
          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {suggestions.zayifAlanOnerileri.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </section>
      )}

      {suggestions.konuPekistirme.length > 0 && (
        <section className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">Konu pekiştirme</h2>
          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {suggestions.konuPekistirme.map((s, i) => (
              <li key={i}>{s.startsWith('•') ? s : `• ${s}`}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
