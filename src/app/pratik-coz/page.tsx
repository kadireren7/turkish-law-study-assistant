'use client'

/**
 * Sınav Pratiği – tek istek, tek sonuç.
 * Çift çıktı önlemi: (1) generateInFlightRef / evaluateInFlightRef ile aynı anda yalnızca bir üretim/değerlendirme.
 * (2) generateRequestIdRef / evaluateRequestIdRef ile gelen yanıt yalnızca en güncel isteğe aitse state güncellenir.
 */

import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams, useRouter } from 'next/navigation'
import { savePracticeQuestion, getSavedQuestionById } from '@/lib/saved-practice-questions'
import { generateExamQuestion, generateExamQuestions, generateExamScenarioWithSubQuestions, evaluateExamAnswer, generateQuiz, type ExamEvaluation, type ExamGenerateResult } from '@/lib/api'
import { ConfidenceBadge } from '@/components/exam/ConfidenceBadge'
import { ExplanationModeSwitcher, type ExplanationMode } from '@/components/exam/ExplanationModeSwitcher'
import { recordPractice } from '@/lib/study-engine'
import { QUESTION_TYPES, DIFFICULTY_LEVELS } from '@/lib/exam-practice-prompt'
import { MAIN_TOPICS, getSubtopics, buildTopicLabel, QUESTION_STYLES, type MainTopicId } from '@/lib/pratik-topic-config'
import { PratikSetupWizard, type PracticeMode } from '@/components/pratik/PratikSetupWizard'
import { printPracticeSet, printQuizSet, slugForFilename, dateSlugForFilename } from '@/lib/export-questions'
import type { MistakeTag, PracticeDifficulty } from '@/lib/practice-adaptive'

export type { PracticeMode }

type QuizQuestion = { question: string; options: string[]; correct: string; explanation: string }

const QUIZ_COUNT_OPTIONS = [5, 10, 15, 20] as const
const letters = ['A', 'B', 'C', 'D']
const PRACTICE_SESSION_KEY = 'studylaw:practice:session:v1'

function PratikCozPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('klasik')
  const [mainTopicId, setMainTopicId] = useState<MainTopicId>('ceza')
  const [subtopic, setSubtopic] = useState<string>(getSubtopics('ceza')[0]?.value ?? '')
  const [customTopic, setCustomTopic] = useState('')
  const [useOnlyCustomTopic, setUseOnlyCustomTopic] = useState(false)
  const [questionStyle, setQuestionStyle] = useState<string>('tek_olay_tek_soru')
  const [questionType, setQuestionType] = useState<string>('olay')
  const [difficulty, setDifficulty] = useState<string>('karisik')
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<PracticeDifficulty>('karisik')
  const [focusMistakes, setFocusMistakes] = useState<MistakeTag[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [questionCount, setQuestionCount] = useState<number>(1)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [quizSelected, setQuizSelected] = useState<Record<number, string>>({})
  const [quizTestEnded, setQuizTestEnded] = useState(false)
  const [quizResultsRevealed, setQuizResultsRevealed] = useState(false)
  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const generateInFlightRef = useRef(false)
  const generateRequestIdRef = useRef(0)
  const evaluateInFlightRef = useRef(false)
  const evaluateRequestIdRef = useRef(0)
  const practiceStateLoadedRef = useRef(false)
  const [scenario, setScenario] = useState('')
  const [subQuestions, setSubQuestions] = useState<string[]>([])
  const [question, setQuestion] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null)
  const [lastGenerateSources, setLastGenerateSources] = useState<string[]>([])
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingEvaluate, setLoadingEvaluate] = useState(false)
  const [error, setError] = useState('')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')
  /** Kurulum sihirbazı: tek tek adımlar (1–4). */
  const [setupStep, setSetupStep] = useState(1)
  /** Soru üretildikten sonra sihirbazı özet çubuğuna indir. */
  const [wizardCollapsed, setWizardCollapsed] = useState(false)

  const topicLabel = buildTopicLabel(mainTopicId, subtopic)
  const topic =
    useOnlyCustomTopic && customTopic.trim()
      ? customTopic.trim()
      : customTopic.trim()
        ? (topicLabel ? `${topicLabel}; ${customTopic.trim()}` : customTopic.trim())
        : topicLabel
  const subtopics = getSubtopics(mainTopicId)
  useEffect(() => {
    if (practiceMode === 'dogruyanlis') setQuestionType('dogruyanlis')
    if (practiceMode === 'coktan' && !(QUIZ_COUNT_OPTIONS as readonly number[]).includes(questionCount)) setQuestionCount(5)
  }, [practiceMode])
  useEffect(() => {
    const d = difficulty as PracticeDifficulty
    if (d === 'kolay' || d === 'orta' || d === 'zor' || d === 'karisik') setAdaptiveDifficulty(d)
  }, [difficulty])

  const isTekOlayCokSoru = questionStyle === 'tek_olay_cok_soru'
  const hasScenarioMode = scenario && subQuestions.length > 0
  const displayQuestion = hasScenarioMode
    ? subQuestions[questionIndex] ?? subQuestions[0]
    : questions.length > 0
      ? questions[questionIndex] ?? questions[0]
      : question
  const hasMultiple = hasScenarioMode ? subQuestions.length > 1 : questions.length > 1

  useEffect(() => {
    const first = subtopics[0]
    if (first && subtopics.every((s) => s.value !== subtopic)) setSubtopic(first.value)
  }, [mainTopicId, subtopics, subtopic])

  useEffect(() => {
    const qpMain = searchParams.get('mainTopic')
    if (!qpMain) return
    const valid = MAIN_TOPICS.some((t) => t.id === qpMain)
    if (!valid) return
    const nextMain = qpMain as MainTopicId
    setMainTopicId(nextMain)
    const firstSub = getSubtopics(nextMain)[0]
    if (firstSub) setSubtopic(firstSub.value)
  }, [searchParams])

  useEffect(() => {
    const sid = searchParams.get('saved')
    if (sid) {
      const item = getSavedQuestionById(sid)
      if (!item) {
        router.replace('/pratik-coz', { scroll: false })
        return
      }
      setPracticeMode('klasik')
      if (item.scenario || (item.subQuestions && item.subQuestions.length)) {
        setScenario(item.scenario ?? '')
        setSubQuestions(item.subQuestions ?? [])
        setQuestion('')
        setQuestions([])
      } else {
        setQuestion(item.question)
        setQuestions([])
        setScenario('')
        setSubQuestions([])
      }
      setQuestionIndex(0)
      setUserAnswer('')
      setEvaluation(null)
      setError('')
      practiceStateLoadedRef.current = true
      router.replace('/pratik-coz', { scroll: false })
      return
    }

    if (practiceStateLoadedRef.current) return
    practiceStateLoadedRef.current = true

    try {
      const raw = localStorage.getItem(PRACTICE_SESSION_KEY)
      if (!raw) return
      const s = JSON.parse(raw) as Record<string, unknown>
      if (s.practiceMode === 'klasik' || s.practiceMode === 'coktan' || s.practiceMode === 'dogruyanlis') setPracticeMode(s.practiceMode)
      if (typeof s.mainTopicId === 'string') setMainTopicId(s.mainTopicId as MainTopicId)
      if (typeof s.subtopic === 'string') setSubtopic(s.subtopic)
      if (typeof s.customTopic === 'string') setCustomTopic(s.customTopic)
      if (typeof s.useOnlyCustomTopic === 'boolean') setUseOnlyCustomTopic(s.useOnlyCustomTopic)
      if (typeof s.questionStyle === 'string') setQuestionStyle(s.questionStyle)
      if (typeof s.questionType === 'string') setQuestionType(s.questionType)
      if (typeof s.difficulty === 'string') setDifficulty(s.difficulty)
      if (typeof s.questionCount === 'number') setQuestionCount(Math.min(20, Math.max(1, s.questionCount)))
      if (Array.isArray(s.quizQuestions)) setQuizQuestions(s.quizQuestions as QuizQuestion[])
      if (s.quizSelected && typeof s.quizSelected === 'object') setQuizSelected(s.quizSelected as Record<number, string>)
      if (typeof s.quizTestEnded === 'boolean') setQuizTestEnded(s.quizTestEnded)
      if (typeof s.quizResultsRevealed === 'boolean') setQuizResultsRevealed(s.quizResultsRevealed)
      if (typeof s.scenario === 'string') setScenario(s.scenario)
      if (Array.isArray(s.subQuestions)) setSubQuestions(s.subQuestions as string[])
      if (typeof s.question === 'string') setQuestion(s.question)
      if (Array.isArray(s.questions)) setQuestions(s.questions as string[])
      if (typeof s.questionIndex === 'number') setQuestionIndex(s.questionIndex)
      if (typeof s.userAnswer === 'string') setUserAnswer(s.userAnswer)
      if (Array.isArray(s.lastGenerateSources)) setLastGenerateSources(s.lastGenerateSources as string[])
    } catch {
      // ignore malformed session state
    }
  }, [searchParams, router])

  useEffect(() => {
    try {
      localStorage.setItem(
        PRACTICE_SESSION_KEY,
        JSON.stringify({
          practiceMode,
          mainTopicId,
          subtopic,
          customTopic,
          useOnlyCustomTopic,
          questionStyle,
          questionType,
          difficulty,
          questionCount,
          quizQuestions,
          quizSelected,
          quizTestEnded,
          quizResultsRevealed,
          scenario,
          subQuestions,
          question,
          questions,
          questionIndex,
          userAnswer,
          lastGenerateSources,
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [
    practiceMode,
    mainTopicId,
    subtopic,
    customTopic,
    useOnlyCustomTopic,
    questionStyle,
    questionType,
    difficulty,
    questionCount,
    quizQuestions,
    quizSelected,
    quizTestEnded,
    quizResultsRevealed,
    scenario,
    subQuestions,
    question,
    questions,
    questionIndex,
    userAnswer,
    lastGenerateSources,
  ])

  useEffect(() => {
    if (hasMultiple) {
      setUserAnswer('')
      setEvaluation(null)
    }
  }, [questionIndex])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (loadingGenerate || generateInFlightRef.current) return
    if (!topic.trim()) {
      setError(useOnlyCustomTopic ? 'Lütfen konu/alt konu yazın veya "Sadece yazdığım konuyu kullan"ı kapatın.' : 'Lütfen ana konu seçin veya konu/alt konu yazın.')
      return
    }
    generateInFlightRef.current = true
    const requestId = ++generateRequestIdRef.current
    setLoadingGenerate(true)
    setError('')
    setQuestion('')
    setQuestions([])
    setScenario('')
    setSubQuestions([])
    setQuestionIndex(0)
    setUserAnswer('')
    setEvaluation(null)
    setLastGenerateSources([])
    try {
      const effectiveQuestionType = practiceMode === 'dogruyanlis' ? 'dogruyanlis' : (questionType as 'olay' | 'madde' | 'klasik' | 'coktan' | 'dogruyanlis' | 'karma')
      const opts = {
        questionType: effectiveQuestionType,
        difficulty: difficulty as 'kolay' | 'orta' | 'zor' | 'karisik',
        questionStyle: questionStyle as import('@/lib/pratik-topic-config').QuestionStyleValue,
        mainTopic: mainTopicId,
        subtopic: subtopic || undefined,
        customTopic: customTopic.trim() || undefined,
        useOnlyCustomTopic: useOnlyCustomTopic && !!customTopic.trim(),
        adaptiveDifficulty,
        focusMistakes,
      }
      if (isTekOlayCokSoru) {
        const res = await fetch('/api/exam-practice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            questionStyle: 'tek_olay_cok_soru',
            questionType: opts.questionType ?? 'olay',
            difficulty: opts.difficulty ?? 'karisik',
            mainTopic: opts.mainTopic,
            subtopic: opts.subtopic,
            customTopic: opts.customTopic,
            useOnlyCustomTopic: opts.useOnlyCustomTopic,
            adaptiveDifficulty: opts.adaptiveDifficulty,
            focusMistakes: opts.focusMistakes,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((data && data.error) || 'Senaryo oluşturulamadı')
        const payload = (data?.ok ? data.data : data) as ExamGenerateResult
        const s = payload.scenario ?? ''
        const sq = payload.subQuestions ?? []
        if (generateRequestIdRef.current !== requestId) return
        setScenario(s)
        setSubQuestions(sq)
        setLastGenerateSources(Array.isArray(payload.sourcesUsed) ? payload.sourcesUsed : [])
        const preview = sq[0]?.trim() || s.slice(0, 280)
        if (preview)
          savePracticeQuestion({
            topic: topic.trim(),
            question: preview,
            scenario: s || undefined,
            subQuestions: sq.length ? sq : undefined,
          })
      } else if (questionCount > 1) {
        const res = await fetch('/api/exam-practice/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic.trim(),
            count: Math.min(50, Math.max(1, questionCount)),
            questionType: opts.questionType ?? 'olay',
            difficulty: opts.difficulty ?? 'karisik',
            questionStyle: opts.questionStyle ?? 'tek_olay_tek_soru',
            mainTopic: opts.mainTopic,
            subtopic: opts.subtopic,
            customTopic: opts.customTopic,
            useOnlyCustomTopic: opts.useOnlyCustomTopic,
            adaptiveDifficulty: opts.adaptiveDifficulty,
            focusMistakes: opts.focusMistakes,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((data && data.error) || 'Sorular oluşturulamadı')
        const payload = (data?.ok ? data.data : data) as ExamGenerateResult
        const list = Array.isArray(payload.questions) ? payload.questions : []
        if (generateRequestIdRef.current !== requestId) return
        setQuestions(list)
        setQuestion(list[0] ?? '')
        setLastGenerateSources(Array.isArray(payload.sourcesUsed) ? payload.sourcesUsed : [])
        for (const qItem of list.slice(0, 10)) {
          savePracticeQuestion({ topic: topic.trim(), question: qItem })
        }
      } else {
        const q = await generateExamQuestion(topic, opts)
        if (generateRequestIdRef.current !== requestId) return
        setQuestion(q)
        setLastGenerateSources([])
        if (q.trim()) savePracticeQuestion({ topic: topic.trim(), question: q })
      }
      setWizardCollapsed(true)
      setSetupStep(1)
    } catch (err) {
      if (generateRequestIdRef.current !== requestId) return
      setError(err instanceof Error ? err.message : 'Pratik soru oluşturulamadı.')
    } finally {
      if (generateRequestIdRef.current === requestId) setLoadingGenerate(false)
      generateInFlightRef.current = false
    }
  }

  async function handleGenerateQuiz(e: React.FormEvent) {
    e.preventDefault()
    if (loadingQuiz || !topic.trim()) return
    setLoadingQuiz(true)
    setError('')
    setQuizQuestions([])
    setQuizSelected({})
    setQuizTestEnded(false)
    setQuizResultsRevealed(false)
    try {
      const data = await generateQuiz(topic, questionCount, {
        difficulty: difficulty as 'kolay' | 'orta' | 'zor' | 'karisik',
      })
      const qs = data.questions ?? []
      setQuizQuestions(qs)
      for (const qq of qs.slice(0, 15)) {
        savePracticeQuestion({ topic: topic.trim(), question: qq.question })
      }
      setWizardCollapsed(true)
      setSetupStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test oluşturulamadı.')
      setQuizQuestions([])
    } finally {
      setLoadingQuiz(false)
    }
  }

  const quizCorrectCount = quizQuestions.filter((q, i) => quizSelected[i] === q.correct).length
  const quizTotal = quizQuestions.length
  const quizShowResults = quizResultsRevealed && quizTestEnded

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!displayQuestion || !userAnswer.trim() || loadingEvaluate) return
    if (evaluateInFlightRef.current) return
    evaluateInFlightRef.current = true
    const requestId = ++evaluateRequestIdRef.current
    setLoadingEvaluate(true)
    setError('')
    setEvaluation(null)
    try {
      const result = await evaluateExamAnswer(displayQuestion, userAnswer.trim(), topic, {
        explanationMode,
        ...(hasScenarioMode && scenario ? { scenario } : {}),
        currentDifficulty: adaptiveDifficulty,
      })
      if (evaluateRequestIdRef.current !== requestId) return
      setEvaluation(result)
      recordPractice({
        topic,
        score: result.score,
        improvePoints: result.improvePoints,
        missedPoints: result.missedPoints,
        legalErrors: result.legalErrors,
      })
      if (result.nextDifficulty) setAdaptiveDifficulty(result.nextDifficulty)
      if (Array.isArray(result.mistakeTags)) setFocusMistakes(result.mistakeTags)
    } catch (err) {
      if (evaluateRequestIdRef.current !== requestId) return
      setError(err instanceof Error ? err.message : 'Değerlendirme yapılamadı.')
    } finally {
      if (evaluateRequestIdRef.current === requestId) setLoadingEvaluate(false)
      evaluateInFlightRef.current = false
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-teal-600 dark:text-teal-400'
    if (score >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const topicOk = topic.trim().length > 0
  const emitGenerate = () => void handleGenerate({ preventDefault() {} } as React.FormEvent)
  const emitGenerateQuiz = () => void handleGenerateQuiz({ preventDefault() {} } as React.FormEvent)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-white to-teal-50/80 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
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

      <header className="relative z-[1] shrink-0 border-b border-teal-500/15 bg-white/75 px-4 py-4 shadow-sm backdrop-blur-md dark:border-teal-500/10 dark:bg-slate-900/70 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Sınav Pratiği</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Çalışma türünü seçin, konuyu belirleyin ve soru oluşturun.
            </p>
          </div>
          {practiceMode !== 'coktan' && (
            <div className="self-start sm:self-auto">
              <ExplanationModeSwitcher
                value={explanationMode}
                onChange={setExplanationMode}
                disabled={loadingEvaluate}
              />
            </div>
          )}
        </div>
      </header>

      <div className="relative z-[1] flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <AnimatePresence mode="wait">
            {!wizardCollapsed && (
              <motion.div
                key="wizard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-teal-500/20 bg-white/80 p-5 shadow-2xl shadow-teal-900/10 backdrop-blur-sm dark:border-teal-500/15 dark:bg-slate-900/75 dark:shadow-black/40 sm:p-8"
              >
                <PratikSetupWizard
                  setupStep={setupStep}
                  setSetupStep={setSetupStep}
                  practiceMode={practiceMode}
                  setPracticeMode={setPracticeMode}
                  mainTopicId={mainTopicId}
                  setMainTopicId={setMainTopicId}
                  subtopic={subtopic}
                  setSubtopic={setSubtopic}
                  customTopic={customTopic}
                  setCustomTopic={setCustomTopic}
                  useOnlyCustomTopic={useOnlyCustomTopic}
                  setUseOnlyCustomTopic={setUseOnlyCustomTopic}
                  questionStyle={questionStyle}
                  setQuestionStyle={setQuestionStyle}
                  questionType={questionType}
                  setQuestionType={setQuestionType}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  questionCount={questionCount}
                  setQuestionCount={setQuestionCount}
                  showAdvanced={showAdvanced}
                  setShowAdvanced={setShowAdvanced}
                  topicLabel={topicLabel}
                  topicOk={topicOk}
                  isTekOlayCokSoru={isTekOlayCokSoru}
                  loadingGenerate={loadingGenerate}
                  loadingQuiz={loadingQuiz}
                  onGenerateClassic={emitGenerate}
                  onGenerateQuiz={emitGenerateQuiz}
                  adaptiveDifficulty={adaptiveDifficulty}
                  focusMistakes={focusMistakes}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {wizardCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/25 bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-teal-500/20 dark:bg-slate-900/80"
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-600/90 dark:text-teal-400/90">Pratik ayarları</p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {practiceMode === 'klasik' ? 'Açık uçlu' : practiceMode === 'coktan' ? 'Test' : 'Doğru / Yanlış'} · {topicLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWizardCollapsed(false)
                  setSetupStep(1)
                }}
                className="rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-800 transition hover:bg-teal-500/20 dark:text-teal-100"
              >
                Ayarları değiştir
              </button>
            </motion.div>
          )}

          {practiceMode === 'coktan' && quizQuestions.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => printQuizSet({ title: 'Sınav Pratiği – Çoktan Seçmeli', topic, date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }), questions: quizQuestions.map((q) => ({ question: q.question, options: q.options, correct: q.correct, explanation: q.explanation })), showAnswers: false })}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      PDF (Yazdır)
                    </button>
                    {!quizTestEnded && (
                      <button type="button" onClick={() => setQuizTestEnded(true)} className="px-5 py-2.5 rounded-xl bg-slate-700 dark:bg-slate-600 text-white font-medium hover:bg-slate-800 dark:hover:bg-slate-500">
                        Testi Bitir
                      </button>
                    )}
                    {quizTestEnded && !quizResultsRevealed && (
                      <button type="button" onClick={() => setQuizResultsRevealed(true)} className="px-5 py-2.5 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600">
                        Kontrol Et
                      </button>
                    )}
                  </div>
                  {quizShowResults && (
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{quizCorrectCount} / {quizTotal}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">%{quizTotal > 0 ? Math.round((quizCorrectCount / quizTotal) * 100) : 0}</p>
                    </div>
                  )}
                  <div className="space-y-6">
                    {quizQuestions.map((q, i) => {
                      const userChoice = quizSelected[i]
                      const isCorrectOption = (opt: string) => opt === q.correct
                      return (
                        <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <p className="font-medium text-slate-800 dark:text-slate-100 mb-3">Soru {i + 1}: {q.question}</p>
                          <div className="space-y-2">
                            {q.options.map((opt, j) => (
                              <label
                                key={j}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  !quizShowResults
                                    ? quizSelected[i] === opt ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    : isCorrectOption(opt) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : quizSelected[i] === opt ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600 opacity-80'
                                } ${quizTestEnded ? 'pointer-events-none' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={`quiz-${i}`}
                                  value={opt}
                                  checked={quizSelected[i] === opt}
                                  onChange={() => setQuizSelected((prev) => ({ ...prev, [i]: opt }))}
                                  disabled={quizTestEnded}
                                  className="text-teal-600"
                                />
                                <span className="text-slate-700 dark:text-slate-200">{letters[j]}) {opt}</span>
                                {quizShowResults && isCorrectOption(opt) && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Doğru</span>}
                                {quizShowResults && userChoice === opt && !isCorrectOption(opt) && <span className="text-xs font-medium text-red-600 dark:text-red-400">Sizin cevabınız</span>}
                              </label>
                            ))}
                          </div>
                          {quizShowResults && (
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 text-sm">
                              <p className="font-medium text-slate-700 dark:text-slate-300">Doğru cevap: {q.correct}</p>
                              <p className="text-slate-600 dark:text-slate-400 mt-2">Açıklama: {q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {practiceMode !== 'coktan' && (
          <>
          {(displayQuestion || questions.length > 0 || hasScenarioMode) && (
            <>
              {hasScenarioMode && (
                <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark animate-fade-in-up">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-2">Senaryo</h3>
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{scenario}</p>
                </div>
              )}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark animate-fade-in-up">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                    {practiceMode === 'dogruyanlis' ? 'Doğru / Yanlış' : hasScenarioMode ? 'Alt soru' : questionType === 'olay' ? 'Olay' : questionType === 'klasik' ? 'Soru' : 'Pratik soru'}
                    {hasMultiple && (
                      <span className="ml-2 text-slate-500 dark:text-slate-400 font-normal">
                        ({questionIndex + 1} / {hasScenarioMode ? subQuestions.length : questions.length})
                      </span>
                    )}
                  </h3>
                  {hasMultiple && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
                        disabled={questionIndex === 0}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Önceki
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionIndex((i) => Math.min((hasScenarioMode ? subQuestions.length : questions.length) - 1, i + 1))}
                        disabled={questionIndex >= (hasScenarioMode ? subQuestions.length : questions.length) - 1}
                        className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Sonraki
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{displayQuestion}</p>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    const questionList = hasScenarioMode ? subQuestions : questions.length > 0 ? questions : question ? [question] : []
                    if (questionList.length === 0) return
                    const typeLabel = QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType
                    const diffLabel = DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty
                    printPracticeSet({
                      title: hasScenarioMode ? 'Sınav Pratiği – Tek olay çok soru' : 'Sınav Pratiği – Soru Seti',
                      topic,
                      questionType: typeLabel,
                      difficulty: diffLabel,
                      date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
                      questions: questionList,
                      ...(hasScenarioMode && scenario ? { scenario } : {}),
                    })
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  PDF olarak kaydet (Yazdır)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const questionList = hasScenarioMode ? subQuestions : questions.length > 0 ? questions : question ? [question] : []
                    if (questionList.length === 0) return
                    try {
                      const res = await fetch('/api/exam-practice/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: hasScenarioMode ? 'Sınav Pratiği – Tek olay çok soru' : 'Sınav Pratiği – Soru Seti',
                          topic,
                          questionType,
                          difficulty,
                          questions: questionList,
                          ...(hasScenarioMode && scenario ? { scenario } : {}),
                        }),
                      })
                      if (!res.ok) throw new Error('Dışa aktarma başarısız')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `sinav-pratigi-${slugForFilename(topic)}-${dateSlugForFilename()}.docx`
                      a.click()
                      URL.revokeObjectURL(url)
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Word dışa aktarma başarısız')
                    }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  Word (.docx) indir
                </button>
                {lastGenerateSources.length > 0 && (
                  <div className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Soru üretiminde kullanılan güncel kaynaklar</p>
                    <ul className="space-y-1">
                      {lastGenerateSources.map((s, i) => (
                        <li key={`${s}-${i}`} className="text-xs text-slate-500 dark:text-slate-400 break-all">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <form onSubmit={handleEvaluate} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {practiceMode === 'dogruyanlis' ? 'Cevabınız (Doğru/Yanlış + gerekçe)' : 'Cevabınız (IRAC: sorun → kural → uygulama → sonuç)'}
                  </span>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder={practiceMode === 'dogruyanlis' ? 'Doğru veya yanlış; gerekçenizi kısaca yazın...' : 'Giriş / sorun tespiti, kural, uygulama, sonuç...'}
                    rows={8}
                    className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-white dark:bg-slate-800 shadow-sm transition-colors"
                    disabled={loadingEvaluate}
                  />
                </label>
                <button
                  type="submit"
                  disabled={loadingEvaluate || !userAnswer.trim()}
                  className="px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                  {loadingEvaluate ? 'Değerlendiriliyor...' : 'Cevabı değerlendir'}
                </button>
                {loadingEvaluate && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                    Kaynaklar taranıyor, cevap analiz ediliyor…
                  </p>
                )}
              </form>
            </>
          )}

          {loadingEvaluate && !evaluation && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark space-y-4 animate-pulse">
              <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-600" />
              <div className="h-5 w-full rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-5 w-5/6 rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-5 w-3/4 rounded bg-slate-100 dark:bg-slate-700" />
            </div>
          )}

          {evaluation && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark space-y-4 animate-fade-in-up">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Değerlendirme</h3>
                {evaluation.confidence && <ConfidenceBadge level={evaluation.confidence} />}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Puan:</span>
                <span className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>
                  {evaluation.score}/100
                </span>
              </div>
              {evaluation.problemIdentification && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-1">Hukuki sorun tespiti</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{evaluation.problemIdentification}</p>
                </div>
              )}
              {evaluation.ruleApplication && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-1">Doğru kural uygulaması</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">{evaluation.ruleApplication}</p>
                </div>
              )}
              {(evaluation.generalAssessment || evaluation.summary) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Genel değerlendirme</h4>
                  <p className="text-slate-700 dark:text-slate-300 text-sm border-l-4 border-teal-200 dark:border-teal-600 pl-3 py-1 whitespace-pre-wrap">
                    {evaluation.generalAssessment || evaluation.summary}
                  </p>
                </div>
              )}
              {evaluation.strongPoints && evaluation.strongPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-1">Güçlü yönler</h4>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-0.5">
                    {evaluation.strongPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvePoints && evaluation.improvePoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Eksikler</h4>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-0.5">
                    {evaluation.improvePoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.legalErrors && evaluation.legalErrors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">Hukuki hatalar</h4>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-0.5">
                    {evaluation.legalErrors.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.missedPoints && evaluation.missedPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Atlanan noktalar</h4>
                  <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-0.5">
                    {evaluation.missedPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(evaluation.suggestionForHigherGrade || evaluation.howToImprove) && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-1">Sınavda daha iyi nasıl yazılır</h4>
                  <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap">
                    {evaluation.suggestionForHigherGrade || evaluation.howToImprove}
                  </div>
                </div>
              )}
              {evaluation.exampleSkeleton && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-1">Örnek güçlü cevap iskeleti</h4>
                  <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600">
                    {evaluation.exampleSkeleton}
                  </div>
                </div>
              )}
              <details className="mt-2">
                <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">Tüm geri bildirim</summary>
                <div
                  className="mt-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: evaluation.feedback.replace(/\n/g, '<br />') }}
                />
              </details>
              {evaluation.sourcesUsed && evaluation.sourcesUsed.length > 0 && (
                <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Değerlendirmede kullanılan güncel kaynaklar</p>
                  <ul className="space-y-1">
                    {evaluation.sourcesUsed.map((s, i) => (
                      <li key={`${s}-${i}`} className="text-xs text-slate-500 dark:text-slate-400 break-all">{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PratikCozPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Yükleniyor…</div>}>
      <PratikCozPageInner />
    </Suspense>
  )
}
