'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '@/lib/exam-practice-prompt'
import { MAIN_TOPICS, getSubtopics, QUESTION_STYLES, type MainTopicId } from '@/lib/pratik-topic-config'
const QUIZ_COUNT_OPTIONS = [5, 10, 15, 20] as const

export type PracticeMode = 'klasik' | 'coktan' | 'dogruyanlis'

type PratikSetupWizardProps = {
  setupStep: number
  setSetupStep: (n: number | ((n: number) => number)) => void
  practiceMode: PracticeMode
  setPracticeMode: (m: PracticeMode) => void
  mainTopicId: MainTopicId
  setMainTopicId: (id: MainTopicId) => void
  subtopic: string
  setSubtopic: (v: string) => void
  customTopic: string
  setCustomTopic: (v: string) => void
  useOnlyCustomTopic: boolean
  setUseOnlyCustomTopic: (v: boolean) => void
  questionStyle: string
  setQuestionStyle: (v: string) => void
  questionType: string
  setQuestionType: (v: string) => void
  difficulty: string
  setDifficulty: (v: string) => void
  questionCount: number
  setQuestionCount: (n: number) => void
  showAdvanced: boolean
  setShowAdvanced: (v: boolean | ((b: boolean) => boolean)) => void
  topicLabel: string
  topicOk: boolean
  isTekOlayCokSoru: boolean
  loadingGenerate: boolean
  loadingQuiz: boolean
  onGenerateClassic: () => void
  onGenerateQuiz: () => void
  adaptiveDifficulty: string
  focusMistakes: string[]
}

const stepVariants = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -28 },
}

export function PratikSetupWizard(props: PratikSetupWizardProps) {
  const {
    setupStep,
    setSetupStep,
    practiceMode,
    setPracticeMode,
    mainTopicId,
    setMainTopicId,
    subtopic,
    setSubtopic,
    customTopic,
    setCustomTopic,
    useOnlyCustomTopic,
    setUseOnlyCustomTopic,
    questionStyle,
    setQuestionStyle,
    questionType,
    setQuestionType,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    showAdvanced,
    setShowAdvanced,
    topicLabel,
    topicOk,
    isTekOlayCokSoru,
    loadingGenerate,
    loadingQuiz,
    onGenerateClassic,
    onGenerateQuiz,
    adaptiveDifficulty,
    focusMistakes,
  } = props

  const subtopics = getSubtopics(mainTopicId)
  const isQuiz = practiceMode === 'coktan'

  function goNext() {
    if (setupStep === 2 && !topicOk) return
    setSetupStep((s) => Math.min(4, s + 1))
  }
  function goBack() {
    setSetupStep((s) => Math.max(1, s - 1))
  }

  const modeOptions = [
    { id: 'klasik' as const, label: 'Açık uçlu', desc: 'IRAC / klasik sınav cevabı', icon: '📄' },
    { id: 'coktan' as const, label: 'Test (A-B-C-D)', desc: 'Çoktan seçmeli test', icon: '📝' },
    { id: 'dogruyanlis' as const, label: 'Doğru / Yanlış', desc: 'Kısa doğru-yanlış + gerekçe', icon: '✓✗' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              setupStep >= i ? 'bg-teal-500 shadow-[0_0_12px_rgba(20,184,166,0.45)]' : 'bg-slate-200/80 dark:bg-slate-700/90'
            }`}
          />
        ))}
      </div>
      <p className="text-center text-xs font-medium uppercase tracking-wider text-teal-600/90 dark:text-teal-400/90">
        Adım {setupStep} / 4
      </p>

      <AnimatePresence mode="wait">
        {setupStep === 1 && (
          <motion.div
            key="s1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h3 className="text-center text-lg font-semibold text-slate-800 dark:text-slate-100">Nasıl çalışmak istiyorsunuz?</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {modeOptions.map(({ id, label, desc, icon }) => (
                <motion.button
                  key={id}
                  type="button"
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPracticeMode(id)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    practiceMode === id
                      ? 'border-teal-500/80 bg-gradient-to-br from-teal-600/15 to-emerald-600/10 shadow-lg shadow-teal-900/20 ring-2 ring-teal-500/50 dark:from-teal-500/20 dark:to-emerald-900/20'
                      : 'border-slate-200/90 bg-white/60 dark:border-slate-600 dark:bg-slate-800/50 hover:border-teal-400/40'
                  }`}
                >
                  <span className="text-2xl">{icon}</span>
                  <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {setupStep === 2 && (
          <motion.div
            key="s2"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Konu seçimi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ana ve alt konuyu belirleyin; isterseniz ek anahtar kelime ekleyin.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Ana konu</span>
                <select
                  value={mainTopicId}
                  onChange={(e) => setMainTopicId(e.target.value as MainTopicId)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {MAIN_TOPICS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Alt konu</span>
                <select
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  disabled={useOnlyCustomTopic}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                >
                  {subtopics.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Ek konu (isteğe bağlı)</span>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Örn: Kast, taksir, teşebbüs"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={useOnlyCustomTopic}
                  onChange={(e) => setUseOnlyCustomTopic(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">Sadece yukarıdaki ek konuyu kullan</span>
              </label>
            </div>
            {!topicOk && <p className="text-sm text-amber-700 dark:text-amber-400">Konu eksik: alt konu veya ek konu girin.</p>}
          </motion.div>
        )}

        {setupStep === 3 && (
          <motion.div
            key="s3"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{isQuiz ? 'Test ayarları' : 'Soru ayarları'}</h3>
            {isQuiz ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Zorluk</span>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {DIFFICULTY_LEVELS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Soru sayısı</span>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {QUIZ_COUNT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} soru
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  {!isTekOlayCokSoru && practiceMode !== 'dogruyanlis' && (
                    <label className="block">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Soru sayısı</span>
                      <select
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {[1, 2, 3, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} soru
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Zorluk</span>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {DIFFICULTY_LEVELS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  {showAdvanced ? 'Gelişmiş ayarları gizle' : 'Gelişmiş ayarları göster'}
                </button>
                {showAdvanced && practiceMode !== 'dogruyanlis' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Soru tarzı</span>
                      <select
                        value={questionStyle}
                        onChange={(e) => setQuestionStyle(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {QUESTION_STYLES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Soru tipi</span>
                      <select
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {QUESTION_TYPES.filter((t) => t.value !== 'coktan' && t.value !== 'dogruyanlis').map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {setupStep === 4 && (
          <motion.div
            key="s4"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-5"
          >
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Özet</h3>
            <div className="rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-sm dark:border-slate-600 dark:bg-slate-800/60">
              <ul className="space-y-2 text-slate-700 dark:text-slate-200">
                <li>
                  <span className="text-slate-500 dark:text-slate-400">Tür:</span>{' '}
                  {practiceMode === 'klasik' ? 'Açık uçlu' : practiceMode === 'coktan' ? 'Çoktan seçmeli' : 'Doğru / Yanlış'}
                </li>
                <li>
                  <span className="text-slate-500 dark:text-slate-400">Konu:</span> {topicLabel}
                </li>
                {!isQuiz && (
                  <>
                    <li>
                      <span className="text-slate-500 dark:text-slate-400">Zorluk:</span>{' '}
                      {DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty}
                    </li>
                    <li className="text-xs text-slate-500 dark:text-slate-400">
                      Adaptif zorluk: {adaptiveDifficulty}
                      {focusMistakes.length > 0 ? ` · Hata odağı: ${focusMistakes.join(', ')}` : ''}
                    </li>
                  </>
                )}
                {isQuiz && (
                  <li>
                    <span className="text-slate-500 dark:text-slate-400">Test:</span> {questionCount} soru ·{' '}
                    {DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty}
                  </li>
                )}
              </ul>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={loadingGenerate || loadingQuiz || !topicOk}
              onClick={() => (isQuiz ? onGenerateQuiz() : onGenerateClassic())}
              className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-teal-900/30 transition-opacity disabled:opacity-50 dark:from-teal-500 dark:to-emerald-600"
            >
              {loadingGenerate || loadingQuiz
                ? 'Hazırlanıyor…'
                : isQuiz
                  ? 'Test soruları oluştur'
                  : practiceMode === 'dogruyanlis' || questionCount > 1 || isTekOlayCokSoru
                    ? 'Soruları oluştur'
                    : 'Soru oluştur'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between gap-3 pt-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={setupStep <= 1}
          onClick={goBack}
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
        >
          Geri
        </motion.button>
        {setupStep < 4 && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            disabled={setupStep === 2 && !topicOk}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50 dark:bg-teal-500"
          >
            Devam
          </motion.button>
        )}
      </div>
    </div>
  )
}
