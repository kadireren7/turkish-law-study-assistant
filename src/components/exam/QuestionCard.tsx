'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { looksLikeStatuteLine } from '@/lib/exam/exam.utils'
import type { ExamResultMode } from '@/lib/exam/exam.types'

export type QuestionCardProps = {
  mode: ExamResultMode
  courseShortLabel: string
  difficultyLabel: string
  styleLabel: string
  scenario: string
  subQuestions: string[]
  questions: string[]
  currentIndex: number
  onIndexChange: (i: number) => void
  onCopyVisible: () => void
  onCopyAll: () => void
  onExportMarkdown: () => void
  onRegenerate: () => void
  onSave: () => void
  onPrintPdf: () => void
  onExportWord: () => void
  loading?: boolean
}

function parseOlayHeader(text: string): { header: string | null; rest: string } {
  const lines = text.split('\n')
  const first = lines[0]?.trim() ?? ''
  if (/^OLAY\s+/i.test(first)) {
    return { header: first, rest: lines.slice(1).join('\n').trim() }
  }
  return { header: null, rest: text.trim() }
}

function ScenarioBody({ text }: { text: string }) {
  const paragraphs = useMemo(() => text.split(/\n{2,}/), [text])
  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => (
        <div key={i} className="space-y-2">
          {para.split('\n').map((line, j) => {
            const statute = looksLikeStatuteLine(line)
            return (
              <p
                key={`${i}-${j}`}
                className={`whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 ${
                  statute
                    ? 'rounded-lg border-l-4 border-amber-400/90 bg-amber-50/90 px-3 py-2 font-medium text-amber-950 dark:border-amber-500/80 dark:bg-amber-950/35 dark:text-amber-100'
                    : ''
                }`}
              >
                {line}
              </p>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function QuestionCardInner(props: QuestionCardProps) {
  const {
    mode,
    courseShortLabel,
    difficultyLabel,
    styleLabel,
    scenario,
    subQuestions,
    questions,
    currentIndex,
    onIndexChange,
    onCopyVisible,
    onCopyAll,
    onExportMarkdown,
    onRegenerate,
    onSave,
    onPrintPdf,
    onExportWord,
    loading,
  } = props

  const olayParts = useMemo(() => (mode === 'scenario' ? parseOlayHeader(scenario) : { header: null as string | null, rest: '' }), [mode, scenario])

  const visibleQuestion =
    mode === 'scenario' ? subQuestions[currentIndex] ?? '' : questions[currentIndex] ?? ''
  const total = mode === 'scenario' ? subQuestions.length : questions.length

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-premium overflow-hidden dark:bg-slate-800/90"
    >
      <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 to-teal-50/40 px-5 py-4 dark:border-slate-600 dark:from-slate-800 dark:to-teal-950/40">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm dark:bg-slate-700 dark:text-teal-200">
            {courseShortLabel}
          </span>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-white dark:bg-slate-600">
            {difficultyLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
            {styleLabel}
          </span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-white">
          {mode === 'scenario' ? 'Senaryo ve alt sorular' : 'Üretilen sorular'}
        </h3>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {mode === 'scenario' && scenario && (
          <section className="space-y-3" aria-labelledby="scenario-heading">
            <h4 id="scenario-heading" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Olay metni
            </h4>
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-600 dark:bg-slate-900/50">
              {olayParts.header && (
                <p className="mb-3 text-sm font-bold uppercase tracking-wide text-teal-800 dark:text-teal-300">
                  {olayParts.header}
                </p>
              )}
              <ScenarioBody text={olayParts.rest || scenario} />
            </div>
          </section>
        )}

        {mode === 'scenario' && subQuestions.length > 0 && (
          <section aria-label="Alt sorular">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sorular</h4>
            <ol className="space-y-2">
              {subQuestions.map((q, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group rounded-xl border px-3 py-3 transition-colors sm:px-4 ${
                    currentIndex === i
                      ? 'border-teal-400/80 bg-teal-50/60 dark:border-teal-700 dark:bg-teal-950/40'
                      : 'border-transparent bg-slate-50/50 hover:border-slate-200 dark:bg-slate-900/40 dark:hover:border-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onIndexChange(i)}
                    className="flex w-full text-left"
                  >
                    <span className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-semibold text-teal-800 shadow-sm dark:bg-slate-800 dark:text-teal-200">
                      {i + 1}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">
                      {q}
                    </span>
                  </button>
                </motion.li>
              ))}
            </ol>
          </section>
        )}

        {mode === 'list' && questions.length > 0 && (
          <section aria-label="Soru listesi">
            {questions.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onIndexChange(i)}
                    className={`min-h-[44px] min-w-[44px] rounded-xl text-sm font-semibold transition-colors ${
                      currentIndex === i
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-600 dark:bg-slate-900/60">
              <ScenarioBody text={visibleQuestion} />
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-600">
          <ActionBtn label="Görünen metni kopyala" onClick={onCopyVisible} disabled={loading} />
          <ActionBtn label="Tümünü kopyala" onClick={onCopyAll} disabled={loading} />
          <ActionBtn label="Markdown" onClick={onExportMarkdown} disabled={loading} />
          <ActionBtn label="PDF (yazdır)" onClick={onPrintPdf} disabled={loading} />
          <ActionBtn label="Word" onClick={onExportWord} disabled={loading} />
          <ActionBtn label="Kaydet" onClick={onSave} disabled={loading} />
          <ActionBtn label="Yeniden üret" onClick={onRegenerate} primary disabled={loading} />
        </div>

        {total > 1 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Seçili soru: {currentIndex + 1} / {total}
          </p>
        )}
      </div>
    </motion.article>
  )
}

function ActionBtn({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <motion.button
      type="button"
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[40px] rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        primary
          ? 'gradient-teal text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      {label}
    </motion.button>
  )
}

export const QuestionCard = memo(QuestionCardInner)
