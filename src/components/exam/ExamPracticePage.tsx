'use client'

import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useExamGenerator } from '@/lib/exam/useExamGenerator'
import { ExamPracticeHero } from '@/components/exam/ExamPracticeHero'
import { PracticeControls } from '@/components/exam/PracticeControls'
import { GenerateButton } from '@/components/exam/GenerateButton'
import { SmartTips } from '@/components/exam/SmartTips'
import { PracticeLoading } from '@/components/exam/PracticeLoading'
import { EmptyPracticeState } from '@/components/exam/EmptyPracticeState'
import { QuestionCard } from '@/components/exam/QuestionCard'
import { PracticeEvaluationCard } from '@/components/exam/PracticeEvaluationCard'
import { printPracticeSet, slugForFilename, dateSlugForFilename } from '@/lib/export-questions'
import { QUESTION_TYPE_OPTIONS, DIFFICULTY_OPTIONS } from '@/lib/exam/exam.types'
import { QUESTION_STYLES } from '@/lib/pratik-topic-config'

export function ExamPracticePage() {
  const exam = useExamGenerator()

  const {
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
    professorStyle,
    setProfessorStyle,
    mainTopics,
    subtopics,
    questionStyles,
    topicLabel,
    topicForApi,
    effectiveQuestionStyle,
    effectiveQuestionType,
    scenario,
    subQuestions,
    questions,
    currentIndex,
    setCurrentIndex,
    resultMode,
    displayQuestion,
    hasResults,
    userAnswer,
    setUserAnswer,
    evaluation,
    loadingGenerate,
    loadingEvaluate,
    error,
    setError,
    generate,
    evaluate,
    copyAll,
    copyVisible,
    exportMarkdown,
    saveCurrent,
    resultsRef,
  } = exam

  const qtLabel = useMemo(
    () => QUESTION_TYPE_OPTIONS.find((t) => t.value === effectiveQuestionType)?.label ?? effectiveQuestionType,
    [effectiveQuestionType]
  )
  const dfLabel = useMemo(
    () => DIFFICULTY_OPTIONS.find((d) => d.value === difficulty)?.label ?? difficulty,
    [difficulty]
  )
  const styleLabel = useMemo(
    () => QUESTION_STYLES.find((s) => s.value === effectiveQuestionStyle)?.label ?? effectiveQuestionStyle,
    [effectiveQuestionStyle]
  )

  const courseShortLabel = useMemo(() => {
    const m = mainTopics.find((x) => x.id === mainTopicId)
    const label = m?.label ?? 'Konu'
    return label.length > 18 ? `${label.slice(0, 16)}…` : label
  }, [mainTopics, mainTopicId])

  const handleGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await generate()
    },
    [generate]
  )

  const handleEvaluate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await evaluate()
    },
    [evaluate]
  )

  const handlePrintPdf = useCallback(() => {
    printPracticeSet({
      title: 'Sınav Pratiği – Soru Seti',
      topic: topicLabel,
      questionType: qtLabel,
      difficulty: dfLabel,
      date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
      questions: resultMode === 'scenario' ? subQuestions : questions,
      scenario: resultMode === 'scenario' ? scenario : undefined,
    })
  }, [topicLabel, qtLabel, dfLabel, resultMode, subQuestions, questions, scenario])

  const handleExportWord = useCallback(async () => {
    try {
      const bodyQuestions =
        resultMode === 'scenario' ? [`SENARYO\n\n${scenario}`, ...subQuestions] : questions
      const res = await fetch('/api/exam-practice/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicLabel,
          questionType: effectiveQuestionType,
          difficulty,
          questions: bodyQuestions,
        }),
      })
      if (!res.ok) throw new Error('Dışa aktarma başarısız')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sinav-pratik-${slugForFilename(topicLabel)}-${dateSlugForFilename()}.docx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Word dışa aktarma başarısız')
    }
  }, [resultMode, scenario, subQuestions, questions, topicLabel, effectiveQuestionType, difficulty, setError])

  const canSubmit = Boolean(topicForApi.trim())

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/80 dark:bg-slate-950/80">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-3xl space-y-6"
        >
          <ExamPracticeHero />

          <form onSubmit={handleGenerate} className="space-y-6">
            <PracticeControls
              mainTopicId={mainTopicId}
              onMainTopicId={setMainTopicId}
              mainTopics={mainTopics}
              subtopic={subtopic}
              onSubtopic={setSubtopic}
              subtopics={subtopics}
              customTopic={customTopic}
              onCustomTopic={setCustomTopic}
              useOnlyCustomTopic={useOnlyCustomTopic}
              onUseOnlyCustomTopic={setUseOnlyCustomTopic}
              questionType={questionType}
              onQuestionType={setQuestionType}
              difficulty={difficulty}
              onDifficulty={setDifficulty}
              questionStyle={questionStyle}
              onQuestionStyle={setQuestionStyle}
              questionStyles={questionStyles}
              questionCount={questionCount}
              onQuestionCount={setQuestionCount}
              professorStyle={professorStyle}
              onProfessorStyle={setProfessorStyle}
              loading={loadingGenerate}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <GenerateButton loading={loadingGenerate} disabled={!canSubmit} />
            </div>
          </form>

          <SmartTips />

          {error && (
            <div
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          )}

          <section ref={resultsRef} className="scroll-mt-4 space-y-4" aria-label="Üretilen sorular">
            {loadingGenerate && <PracticeLoading />}
            {!loadingGenerate && !hasResults && <EmptyPracticeState />}
            {!loadingGenerate && hasResults && (
              <QuestionCard
                mode={resultMode}
                courseShortLabel={courseShortLabel}
                difficultyLabel={dfLabel}
                styleLabel={styleLabel}
                scenario={scenario}
                subQuestions={subQuestions}
                questions={questions}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
                onCopyVisible={copyVisible}
                onCopyAll={copyAll}
                onExportMarkdown={exportMarkdown}
                onRegenerate={generate}
                onSave={saveCurrent}
                onPrintPdf={handlePrintPdf}
                onExportWord={handleExportWord}
                loading={loadingGenerate}
              />
            )}
          </section>

          {!loadingGenerate && hasResults && (
            <form onSubmit={handleEvaluate} className="space-y-4">
              <div className="card-premium p-5 dark:bg-slate-800/90">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Cevabınız</span>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Olay özeti, hukuki sorun, uygulanacak kurallar, değerlendirme ve sonuç şeklinde yazabilirsiniz..."
                    rows={8}
                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    disabled={loadingEvaluate}
                  />
                </label>
                <motion.button
                  type="submit"
                  whileHover={loadingEvaluate ? undefined : { scale: 1.01 }}
                  whileTap={loadingEvaluate ? undefined : { scale: 0.99 }}
                  disabled={loadingEvaluate || !userAnswer.trim() || !displayQuestion.trim()}
                  className="btn-primary gradient-teal mt-4 w-full px-6 py-3 text-[15px] font-semibold shadow-md disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {loadingEvaluate ? 'Değerlendiriliyor...' : 'Cevabı değerlendir'}
                </motion.button>
              </div>
            </form>
          )}

          {evaluation && <PracticeEvaluationCard evaluation={evaluation} />}
        </motion.div>
      </div>
    </div>
  )
}
