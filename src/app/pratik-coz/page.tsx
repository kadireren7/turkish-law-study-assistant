'use client'

import { useState, useEffect } from 'react'
import { generateExamQuestion, generateExamQuestions, evaluateExamAnswer, type ExamEvaluation } from '@/lib/api'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { ExplanationModeSwitcher, type ExplanationMode } from '@/components/ExplanationModeSwitcher'
import { recordPractice } from '@/lib/study-engine'
import { PRACTICE_TOPICS, QUESTION_TYPES, DIFFICULTY_LEVELS } from '@/lib/exam-practice-prompt'
import { printPracticeSet, slugForFilename, dateSlugForFilename } from '@/lib/export-questions'

export default function PratikCozPage() {
  const [topic, setTopic] = useState<string>(PRACTICE_TOPICS[0].value)
  const [questionType, setQuestionType] = useState<string>('olay')
  const [difficulty, setDifficulty] = useState<string>('karisik')
  const [questionCount, setQuestionCount] = useState<number>(1)
  const [question, setQuestion] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingEvaluate, setLoadingEvaluate] = useState(false)
  const [error, setError] = useState('')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')

  const displayQuestion = questions.length > 0 ? questions[questionIndex] ?? questions[0] : question
  const hasMultiple = questions.length > 1

  useEffect(() => {
    if (hasMultiple && questions.length > 0) {
      setUserAnswer('')
      setEvaluation(null)
    }
  }, [questionIndex])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (loadingGenerate) return
    setLoadingGenerate(true)
    setError('')
    setQuestion('')
    setQuestions([])
    setQuestionIndex(0)
    setUserAnswer('')
    setEvaluation(null)
    try {
      const opts = {
        questionType: questionType as 'olay' | 'madde' | 'klasik' | 'coktan' | 'dogruyanlis' | 'karma',
        difficulty: difficulty as 'kolay' | 'orta' | 'zor' | 'karisik',
      }
      if (questionCount > 1) {
        const list = await generateExamQuestions(topic, questionCount, opts)
        setQuestions(list)
        setQuestion(list[0] ?? '')
      } else {
        const q = await generateExamQuestion(topic, opts)
        setQuestion(q)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pratik soru oluşturulamadı.')
    } finally {
      setLoadingGenerate(false)
    }
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!displayQuestion || !userAnswer.trim() || loadingEvaluate) return
    setLoadingEvaluate(true)
    setError('')
    setEvaluation(null)
    try {
      const result = await evaluateExamAnswer(displayQuestion, userAnswer.trim(), topic, { explanationMode })
      setEvaluation(result)
      recordPractice({
        topic,
        score: result.score,
        improvePoints: result.improvePoints,
        missedPoints: result.missedPoints,
        legalErrors: result.legalErrors,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Değerlendirme yapılamadı.')
    } finally {
      setLoadingEvaluate(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-teal-600 dark:text-teal-400'
    if (score >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Pratik Çöz</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Hukuk pratiği motoru: pratik sorular oluştur, cevabınızı yazın; sorun tespiti, kural seçimi, uygulama, sonuç ve yazım gücüne göre değerlendirme alın.
            </p>
          </div>
          <ExplanationModeSwitcher
            value={explanationMode}
            onChange={setExplanationMode}
            disabled={loadingEvaluate}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark space-y-4 animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Konu</span>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-colors"
                  disabled={loadingGenerate}
                >
                  {PRACTICE_TOPICS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Soru tipi</span>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-colors"
                  disabled={loadingGenerate}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Zorluk</span>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-colors"
                  disabled={loadingGenerate}
                >
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Soru sayısı</span>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm transition-colors"
                  disabled={loadingGenerate}
                >
                  {[1, 2, 3, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} soru
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={loadingGenerate}
              className="px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              {loadingGenerate ? 'Pratik soru(lar) hazırlanıyor...' : questionCount > 1 ? `${questionCount} pratik soru oluştur` : 'Pratik soru oluştur'}
            </button>
          </form>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {(displayQuestion || questions.length > 0) && (
            <>
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark animate-fade-in-up">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                    {questionType === 'olay' ? 'Olay' : questionType === 'klasik' ? 'Soru' : 'Pratik soru'}
                    {hasMultiple && (
                      <span className="ml-2 text-slate-500 dark:text-slate-400 font-normal">
                        ({questionIndex + 1} / {questions.length})
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
                        onClick={() => setQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                        disabled={questionIndex >= questions.length - 1}
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
                    const questionList = questions.length > 0 ? questions : question ? [question] : []
                    if (questionList.length === 0) return
                    const topicLabel = PRACTICE_TOPICS.find((t) => t.value === topic)?.label ?? topic
                    const typeLabel = QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType
                    const diffLabel = DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty
                    printPracticeSet({
                      title: 'Pratik Çöz – Soru Seti',
                      topic: topicLabel,
                      questionType: typeLabel,
                      difficulty: diffLabel,
                      date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
                      questions: questionList,
                    })
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600"
                >
                  PDF olarak kaydet (Yazdır)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const questionList = questions.length > 0 ? questions : question ? [question] : []
                    if (questionList.length === 0) return
                    const topicLabel = PRACTICE_TOPICS.find((t) => t.value === topic)?.label ?? topic
                    try {
                      const res = await fetch('/api/exam-practice/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: 'Pratik Çöz – Soru Seti',
                          topic: topicLabel,
                          questionType,
                          difficulty,
                          questions: questionList,
                        }),
                      })
                      if (!res.ok) throw new Error('Dışa aktarma başarısız')
                      const blob = await res.blob()
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `pratik-coz-${slugForFilename(topicLabel)}-${dateSlugForFilename()}.docx`
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
              </div>

              <form onSubmit={handleEvaluate} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cevabınız (IRAC: sorun → kural → uygulama → sonuç)</span>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Giriş / sorun tespiti, kural, uygulama, sonuç..."
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
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
