'use client'

export type ExplanationMode = 'ogrenci' | 'uyap'

const MODES: { value: ExplanationMode; label: string }[] = [
  { value: 'ogrenci', label: 'Öğrenci Dostu' },
  { value: 'uyap', label: 'UYAP / Resmî Dil' },
]

interface ExplanationModeSwitcherProps {
  value: ExplanationMode
  onChange: (mode: ExplanationMode) => void
  label?: string
  disabled?: boolean
}

/**
 * Legal explanation mode: Öğrenci Dostu (simpler, explanatory) or UYAP Uyumlu / Resmî Dil (formal, official).
 * Default should be Öğrenci Dostu.
 */
export function ExplanationModeSwitcher({
  value,
  onChange,
  label = 'Açıklama modu:',
  disabled = false,
}: ExplanationModeSwitcherProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
      <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            disabled={disabled}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              value === m.value
                ? 'bg-teal-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
