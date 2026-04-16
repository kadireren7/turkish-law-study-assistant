'use client'

import { memo } from 'react'
import type { MainTopicId } from '@/lib/pratik-topic-config'
import type { ExamGenerateOptions } from '@/lib/api'
import { QUESTION_COUNTS } from '@/lib/exam/exam.types'
import { QUESTION_TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/exam/exam.types'

export type PracticeControlsProps = {
  mainTopicId: MainTopicId
  onMainTopicId: (id: MainTopicId) => void
  mainTopics: { id: MainTopicId; label: string }[]
  subtopic: string
  onSubtopic: (v: string) => void
  subtopics: { value: string; label: string }[]
  customTopic: string
  onCustomTopic: (v: string) => void
  useOnlyCustomTopic: boolean
  onUseOnlyCustomTopic: (v: boolean) => void
  questionType: NonNullable<ExamGenerateOptions['questionType']>
  onQuestionType: (v: NonNullable<ExamGenerateOptions['questionType']>) => void
  difficulty: NonNullable<ExamGenerateOptions['difficulty']>
  onDifficulty: (v: NonNullable<ExamGenerateOptions['difficulty']>) => void
  questionStyle: string
  onQuestionStyle: (v: string) => void
  questionStyles: readonly { value: string; label: string }[]
  questionCount: number
  onQuestionCount: (n: number) => void
  professorStyle: boolean
  onProfessorStyle: (v: boolean) => void
  loading: boolean
}

const selectClass =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'

function PracticeControlsInner(props: PracticeControlsProps) {
  const {
    mainTopicId,
    onMainTopicId,
    mainTopics,
    subtopic,
    onSubtopic,
    subtopics,
    customTopic,
    onCustomTopic,
    useOnlyCustomTopic,
    onUseOnlyCustomTopic,
    questionType,
    onQuestionType,
    difficulty,
    onDifficulty,
    questionStyle,
    onQuestionStyle,
    questionStyles,
    questionCount,
    onQuestionCount,
    professorStyle,
    onProfessorStyle,
    loading,
  } = props

  const countLocked = questionStyle === 'tek_olay_cok_soru'

  return (
    <div className="card-premium p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Ayarlar</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Ders ve alt konu seçin; soru tarzını ve zorluğu belirleyin.
      </p>

      <div className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Ders / ana alan</span>
            <select
              className={selectClass}
              value={mainTopicId}
              onChange={(e) => onMainTopicId(e.target.value as MainTopicId)}
              disabled={loading}
            >
              {mainTopics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Alt konu</span>
            <select
              className={selectClass}
              value={subtopic}
              onChange={(e) => onSubtopic(e.target.value)}
              disabled={loading || useOnlyCustomTopic}
            >
              {subtopics.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-900/50 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              checked={useOnlyCustomTopic}
              onChange={(e) => onUseOnlyCustomTopic(e.target.checked)}
              disabled={loading}
            />
            <span className="text-sm text-slate-700 dark:text-slate-200">
              <span className="font-medium">Sadece özel konu metni kullan</span>
              <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
                İşaretlenirse yalnızca aşağıdaki serbest metin gönderilir (ders seçimi devre dışı).
              </span>
            </span>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Ek / özel konu (isteğe bağlı)</span>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => onCustomTopic(e.target.value)}
              placeholder="Örn. haksız fiil, temerrüt, CMK 90..."
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              disabled={loading}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Soru tipi</span>
            <select
              className={selectClass}
              value={questionType}
              onChange={(e) =>
                onQuestionType(e.target.value as NonNullable<ExamGenerateOptions['questionType']>)
              }
              disabled={loading || professorStyle}
            >
              {QUESTION_TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {professorStyle && (
              <span className="mt-1 block text-xs text-slate-500">Profesör tarzında soru tipi olay olarak sabitlenir.</span>
            )}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Zorluk</span>
            <select
              className={selectClass}
              value={difficulty}
              onChange={(e) => onDifficulty(e.target.value as NonNullable<ExamGenerateOptions['difficulty']>)}
              disabled={loading}
            >
              {DIFFICULTY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Soru tarzı</span>
            <select
              className={selectClass}
              value={questionStyle}
              onChange={(e) => onQuestionStyle(e.target.value)}
              disabled={loading || professorStyle}
            >
              {questionStyles.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {professorStyle && questionStyle !== 'tek_olay_cok_soru' && (
              <span className="mt-1 block text-xs text-slate-500">Profesör tarzı derin analiz vakası üretir.</span>
            )}
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-teal-200/80 bg-teal-50/50 p-3 dark:border-teal-900/50 dark:bg-teal-950/30 sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-teal-400 text-teal-600 focus:ring-teal-500"
              checked={professorStyle}
              onChange={(e) => onProfessorStyle(e.target.checked)}
              disabled={loading}
            />
            <span className="text-sm text-slate-800 dark:text-slate-100">
              <span className="font-medium">Profesör / hoca tarzı</span>
              <span className="mt-0.5 block text-slate-600 dark:text-slate-400">
                Derin analiz, olay temelli ve sınavda beklenen üslup (tek olay çok soru seçiminde uygulanmaz).
              </span>
            </span>
          </label>

          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Soru sayısı</span>
            {countLocked ? (
              <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
                &quot;Tek olay, çok soru&quot; modunda tek senaryo ve alt sorular üretilir.
              </p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {QUESTION_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onQuestionCount(n)}
                    disabled={loading}
                    className={`min-h-[44px] min-w-[3.25rem] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      questionCount === n
                        ? 'bg-teal-600 text-white shadow-sm dark:bg-teal-500'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const PracticeControls = memo(PracticeControlsInner)
