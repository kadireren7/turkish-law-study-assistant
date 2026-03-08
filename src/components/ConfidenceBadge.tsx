'use client'

import { CONFIDENCE_LABELS, type ConfidenceLevel } from '@/lib/confidence'

type Props = { level: ConfidenceLevel; className?: string }

/**
 * Subtle, professional confidence indicator for legal AI answers.
 * Used in Sohbet, Olay Analizi, Konu Anlatımı, Pratik Çöz.
 */
export function ConfidenceBadge({ level, className = '' }: Props) {
  const styles = {
    yuksek: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
    orta: 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300',
    dusuk: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  }
  return (
    <span
      className={`inline-flex items-center text-xs font-medium rounded-full px-2.5 py-0.5 ${styles[level]} ${className}`}
      title={
        level === 'yuksek'
          ? 'Yanıt yerel mevzuat veya güçlü kaynaklarla destekleniyor.'
          : level === 'orta'
            ? 'Yanıt kaynaklara dayalı; yorum veya kısmi kapsam içerebilir.'
            : 'Sınırlı kaynak desteği veya tartışmalı konu.'
      }
    >
      {CONFIDENCE_LABELS[level]}
    </span>
  )
}
