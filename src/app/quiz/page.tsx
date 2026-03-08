'use client'

import { useState } from 'react'
import { generateQuiz } from '@/lib/api'
import { printQuizSet, slugForFilename, dateSlugForFilename } from '@/lib/export-questions'

type Question = {
  question: string
  options: string[]
  correct: string
  explanation: string
}

const LAW_SUBJECTS = [
  { value: 'Anayasa Hukuku – temel haklar ve özgürlükler', label: 'Anayasa Hukuku – temel haklar' },
  { value: 'Anayasa Hukuku – devlet organları', label: 'Anayasa Hukuku – devlet organları' },
  { value: 'Borçlar Hukuku – sözleşme', label: 'Borçlar Hukuku – sözleşme' },
  { value: 'Borçlar Hukuku – sebepsiz zenginleşme', label: 'Borçlar Hukuku – sebepsiz zenginleşme' },
  { value: 'Borçlar Hukuku – haksız fiil', label: 'Borçlar Hukuku – haksız fiil' },
  { value: 'Ceza Hukuku – kast ve taksir', label: 'Ceza Hukuku – kast ve taksir' },
  { value: 'Ceza Hukuku – suçun unsurları', label: 'Ceza Hukuku – suçun unsurları' },
  { value: 'Medeni Hukuk – kişiler ve aile', label: 'Medeni Hukuk – kişiler ve aile' },
  { value: 'Medeni Hukuk – eşya hukuku', label: 'Medeni Hukuk – eşya hukuku' },
  { value: 'İdare Hukuku – idari işlem', label: 'İdare Hukuku – idari işlem' },
  { value: 'other', label: 'Diğer (aşağıda yazın)' },
] as const

const letters = ['A', 'B', 'C', 'D']

function getScoreFeedback(correctCount: number, total: number): string {
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
  if (pct >= 80) return 'Çok iyi! Bu konuda oldukça hazırsınız.'
  if (pct >= 60) return 'İyi gidiyorsunuz. Yanlış cevapların açıklamalarını tekrar edin.'
  if (pct >= 40) return 'Konuyu tekrar çalışmanız faydalı olacaktır.'
  return 'Konuya bir kez daha göz atıp tekrar deneyin.'
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20] as const

export default function QuizPage() {
  const [subject, setSubject] = useState<string>(LAW_SUBJECTS[0].value)
  const [customTopic, setCustomTopic] = useState('')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [testEnded, setTestEnded] = useState(false)
  const [resultsRevealed, setResultsRevealed] = useState(false)

  const topic = subject === 'other' ? customTopic.trim() : subject

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || loading) return
    setLoading(true)
    setQuestions([])
    setError('')
    setSelected({})
    setTestEnded(false)
    setResultsRevealed(false)
    try {
      const data = await generateQuiz(topic, questionCount)
      setQuestions(data.questions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test oluşturulamadı.')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  function handleFinishTest() {
    setTestEnded(true)
  }

  function handleCheckResults() {
    setResultsRevealed(true)
  }

  const correctCount = questions.filter((q, i) => selected[i] === q.correct).length
  const total = questions.length
  const showResults = resultsRevealed && testEnded

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Çoktan Seçmeli Test</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Konu ve soru sayısını seçin; çoktan seçmeli sorular üretilir. Cevaplarınızı verin, testi bitirin, sonra kontrol edin.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleGenerate} className="max-w-2xl mx-auto space-y-4 mb-8">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ders konusu</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
              disabled={loading}
            >
              {LAW_SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {subject === 'other' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Özel konu</span>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Örn. İş hukuku – kıdem tazminatı"
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                disabled={loading}
              />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Soru sayısı</span>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent shadow-sm"
              disabled={loading}
            >
              {QUESTION_COUNT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} soru
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading || !topic}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Oluşturuluyor...' : `${questionCount} soru oluştur`}
          </button>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {questions.length > 0 && (
          <>
            {/* Export + Testi Bitir / Kontrol Et bar */}
            <div className="max-w-2xl mx-auto mb-6 flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={() =>
                  printQuizSet({
                    title: 'Çoktan Seçmeli Test',
                    topic,
                    date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
                    questions: questions.map((q) => ({ question: q.question, options: q.options, correct: q.correct, explanation: q.explanation })),
                    showAnswers: false,
                  })
                }
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                PDF olarak kaydet (Yazdır)
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/quiz/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        topic,
                        questions: questions.map((q) => ({
                          question: q.question,
                          options: q.options,
                          correct: q.correct,
                          explanation: q.explanation,
                        })),
                        includeAnswers: true,
                      }),
                    })
                    if (!res.ok) throw new Error('Dışa aktarma başarısız')
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `coktan-secmeli-${slugForFilename(topic)}-${dateSlugForFilename()}.docx`
                    a.click()
                    URL.revokeObjectURL(url)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Word dışa aktarma başarısız')
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
              >
                Word (.docx) indir
              </button>
              {!testEnded && (
                <button
                  type="button"
                  onClick={handleFinishTest}
                  className="px-5 py-2.5 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Testi Bitir
                </button>
              )}
              {testEnded && !resultsRevealed && (
                <button
                  type="button"
                  onClick={handleCheckResults}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Kontrol Et
                </button>
              )}
            </div>

            {/* Score and feedback (only after Kontrol Et) */}
            {showResults && (
              <div className="max-w-2xl mx-auto mb-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-2xl font-bold text-slate-800">
                    {correctCount} / {total}
                  </span>
                  <span className="text-slate-600">
                    (%{total > 0 ? Math.round((correctCount / total) * 100) : 0})
                  </span>
                </div>
                <p className="mt-3 text-slate-600 text-sm">
                  {getScoreFeedback(correctCount, total)}
                </p>
              </div>
            )}

            {/* Questions list */}
            <div className="max-w-2xl mx-auto space-y-8">
              {questions.map((q, i) => {
                const userChoice = selected[i]
                const isCorrect = userChoice === q.correct
                const showCorrectAndExplanation = showResults

                return (
                  <div
                    key={i}
                    className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm"
                  >
                    <p className="font-medium text-slate-800 mb-4">
                      Soru {i + 1}: {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, j) => {
                        const isUserPick = userChoice === opt
                        const isCorrectOption = opt === q.correct
                        const showRightWrong =
                          showCorrectAndExplanation && (isUserPick || isCorrectOption)

                        return (
                          <label
                            key={j}
                            className={`flex items-center gap-3 p-3 min-h-[48px] rounded-lg border cursor-pointer transition-colors ${
                              !showCorrectAndExplanation
                                ? selected[i] === opt
                                  ? 'border-teal-500 bg-teal-50'
                                  : 'border-slate-200 hover:bg-slate-50'
                                : showRightWrong
                                  ? isCorrectOption
                                    ? 'border-emerald-500 bg-emerald-50'
                                    : isUserPick
                                      ? 'border-red-400 bg-red-50'
                                      : 'border-slate-200 bg-slate-50'
                                  : 'border-slate-200 bg-slate-50 opacity-80'
                            } ${testEnded ? 'pointer-events-none' : ''}`}
                          >
                            <input
                              type="radio"
                              name={`q-${i}`}
                              value={opt}
                              checked={selected[i] === opt}
                              onChange={() =>
                                setSelected((prev) => ({ ...prev, [i]: opt }))
                              }
                              disabled={testEnded}
                              className="text-teal-600"
                            />
                            <span className="text-slate-700 flex-1">
                              {letters[j]}) {opt}
                            </span>
                            {showCorrectAndExplanation && isCorrectOption && (
                              <span className="text-xs font-medium text-emerald-600">
                                Doğru
                              </span>
                            )}
                            {showCorrectAndExplanation && isUserPick && !isCorrectOption && (
                              <span className="text-xs font-medium text-red-600">
                                Sizin cevabınız
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>

                    {/* Correct answer + explanation (only after Kontrol Et) */}
                    {showCorrectAndExplanation && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
                        <p className="font-medium text-slate-700">
                          Doğru cevap: {q.correct}
                        </p>
                        <p className="text-slate-600 mt-2">
                          <span className="font-medium text-slate-700">Açıklama:</span>{' '}
                          {q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
