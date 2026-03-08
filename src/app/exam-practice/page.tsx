'use client'

import { useState } from 'react'
import { generateExamQuestions, evaluateExamAnswer, type ExamEvaluation, type ExamGenerateOptions } from '@/lib/api'
import { printPracticeSet, slugForFilename, dateSlugForFilename } from '@/lib/export-questions'

const QUESTION_COUNTS = [5, 10, 15, 25, 50] as const

const QUESTION_TYPES = [
  { value: 'olay', label: 'Olay sorusu' },
  { value: 'madde', label: 'Madde sorusu' },
  { value: 'klasik', label: 'Klasik soru' },
  { value: 'coktan', label: 'Çoktan seçmeli' },
  { value: 'dogruyanlis', label: 'Doğru / Yanlış' },
  { value: 'karma', label: 'Karma' },
] as const

const DIFFICULTIES = [
  { value: 'kolay', label: 'Kolay' },
  { value: 'orta', label: 'Orta' },
  { value: 'zor', label: 'Zor' },
  { value: 'karisik', label: 'Karışık' },
] as const

const EXAM_TOPICS = [
  { value: 'Ceza Hukuku – kast, taksir, suçun unsurları', label: 'Ceza' },
  { value: 'Medeni Hukuk – kişiler, ehliyet, aile, mülkiyet', label: 'Medeni' },
  { value: 'Borçlar Hukuku – sözleşme, ifa, haksız fiil', label: 'Borçlar' },
  { value: 'Anayasa Hukuku – temel haklar, devlet organları', label: 'Anayasa' },
  { value: 'İdare Hukuku – idari işlem, idari yargı', label: 'İdare' },
  { value: 'Ceza Muhakemesi Kanunu – CMK temel usul', label: 'CMK' },
  { value: 'Hukuk Muhakemeleri Kanunu – HMK temel usul', label: 'HMK' },
  { value: 'Ceza, Medeni, Borçlar, Usul karışık', label: 'Karma' },
  { value: 'other', label: 'Diğer (aşağıda yazın)' },
] as const

export default function ExamPracticePage() {
  const [topicSelect, setTopicSelect] = useState<string>(EXAM_TOPICS[0].value)
  const [customTopic, setCustomTopic] = useState('')
  const [questionCount, setQuestionCount] = useState<number>(5)
  const [questionType, setQuestionType] = useState<ExamGenerateOptions['questionType']>('olay')
  const [difficulty, setDifficulty] = useState<ExamGenerateOptions['difficulty']>('karisik')
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingEvaluate, setLoadingEvaluate] = useState(false)
  const [error, setError] = useState('')

  const topic = topicSelect === 'other' ? customTopic.trim() : topicSelect
  const topicLabel = EXAM_TOPICS.find((t) => t.value === topicSelect)?.label ?? topic
  const currentQuestion = questions[currentIndex] ?? ''

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || loadingGenerate) return
    setLoadingGenerate(true)
    setError('')
    setQuestions([])
    setCurrentIndex(0)
    setUserAnswer('')
    setEvaluation(null)
    try {
      const list = await generateExamQuestions(topic, questionCount, { questionType, difficulty })
      setQuestions(list)
      setCurrentIndex(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sorular oluşturulamadı.')
    } finally {
      setLoadingGenerate(false)
    }
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!currentQuestion || !userAnswer.trim() || loadingEvaluate) return
    setLoadingEvaluate(true)
    setError('')
    setEvaluation(null)
    try {
      const result = await evaluateExamAnswer(
        currentQuestion,
        userAnswer.trim(),
        topic || undefined
      )
      setEvaluation(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Değerlendirme yapılamadı.')
    } finally {
      setLoadingEvaluate(false)
    }
  }

  function getScoreColor(score: number) {
    if (score >= 70) return 'text-teal-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Sınav Pratiği</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Soru tipi, zorluk ve konu seçin; soruları oluşturup cevabınızı yazın. PDF veya Word olarak dışa aktarabilirsiniz.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6 px-0">
          <form onSubmit={handleGenerate} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Konu</span>
              <select
                value={topicSelect}
                onChange={(e) => setTopicSelect(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                disabled={loadingGenerate}
              >
                {EXAM_TOPICS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            {topicSelect === 'other' && (
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Özel konu</span>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Örn. İş hukuku – kıdem tazminatı"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={loadingGenerate}
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Soru tipi</span>
              <select
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as ExamGenerateOptions['questionType'])}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={loadingGenerate}
              >
                {QUESTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Zorluk</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as ExamGenerateOptions['difficulty'])}
                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={loadingGenerate}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Soru sayısı</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {QUESTION_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuestionCount(n)}
                    disabled={loadingGenerate}
                    className={`min-w-[3rem] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      questionCount === n
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {n} soru
                  </button>
                ))}
              </div>
            </label>
            <button
              type="submit"
              disabled={loadingGenerate || !topic}
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loadingGenerate ? 'Sorular hazırlanıyor...' : 'Soruları oluştur'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {questions.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => {
                    const typeLabel = QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType ?? 'Olay sorusu'
                    const diffLabel = DIFFICULTIES.find((d) => d.value === difficulty)?.label ?? difficulty ?? 'Karışık'
                    printPracticeSet({
                      title: 'Sınav Pratiği – Soru Seti',
                      topic: topicLabel ?? topic,
                      questionType: typeLabel,
                      difficulty: diffLabel,
                      date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' }),
                      questions,
                    })
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  PDF olarak kaydet (Yazdır)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/exam-practice/export', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          topic: topicLabel,
                          questionType,
                          difficulty,
                          questions,
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
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Word (.docx) indir
                </button>
              </div>
              {questions.length > 1 && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <p className="text-sm font-medium text-slate-600 mb-2">Soru seçin</p>
                  <div className="flex flex-wrap gap-2">
                    {questions.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCurrentIndex(i)
                          setEvaluation(null)
                        }}
                        className={`min-w-[2.5rem] px-2 py-1.5 rounded-lg text-sm font-medium ${
                          currentIndex === i ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-teal-700 mb-2">
                  Soru {questions.length > 1 ? `${currentIndex + 1} / ${questions.length}` : ''}
                </h3>
                <p className="text-slate-800 whitespace-pre-wrap">{currentQuestion}</p>
              </div>

              <form onSubmit={handleEvaluate} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Cevabınız</span>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Olay özeti, hukuki sorun, uygulanacak kurallar, değerlendirme ve sonuç şeklinde yazabilirsiniz..."
                    rows={8}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-white shadow-sm"
                    disabled={loadingEvaluate}
                  />
                </label>
                <button
                  type="submit"
                  disabled={loadingEvaluate || !userAnswer.trim()}
                  className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {loadingEvaluate ? 'Değerlendiriliyor...' : 'Cevabı değerlendir'}
                </button>
              </form>
            </>
          )}

          {evaluation && (
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Değerlendirme</h3>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-600">Puan:</span>
                <span className={`text-2xl font-bold ${getScoreColor(evaluation.score)}`}>
                  {evaluation.score}/100
                </span>
              </div>
              {(evaluation.generalAssessment || evaluation.summary) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-1">Genel değerlendirme</h4>
                  <p className="text-slate-700 text-sm border-l-4 border-teal-200 pl-3 py-1 whitespace-pre-wrap">
                    {evaluation.generalAssessment || evaluation.summary}
                  </p>
                </div>
              )}
              {evaluation.problemIdentification && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Hukuki sorun tespiti</h4>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{evaluation.problemIdentification}</p>
                </div>
              )}
              {evaluation.ruleApplication && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Doğru kural uygulaması</h4>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{evaluation.ruleApplication}</p>
                </div>
              )}
              {evaluation.strongPoints && evaluation.strongPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Güçlü yönler</h4>
                  <ul className="list-disc list-inside text-slate-700 text-sm space-y-0.5">
                    {evaluation.strongPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.improvePoints && evaluation.improvePoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-1">Eksikler</h4>
                  <ul className="list-disc list-inside text-slate-700 text-sm space-y-0.5">
                    {evaluation.improvePoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.legalErrors && evaluation.legalErrors.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-1">Hukuki hatalar</h4>
                  <ul className="list-disc list-inside text-slate-700 text-sm space-y-0.5">
                    {evaluation.legalErrors.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.missedPoints && evaluation.missedPoints.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 mb-1">Atlanan noktalar</h4>
                  <ul className="list-disc list-inside text-slate-700 text-sm space-y-0.5">
                    {evaluation.missedPoints.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(evaluation.suggestionForHigherGrade || evaluation.howToImprove) && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Sınavda daha yüksek not için öneri</h4>
                  <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {evaluation.suggestionForHigherGrade || evaluation.howToImprove}
                  </div>
                </div>
              )}
              {evaluation.exampleSkeleton && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Örnek güçlü cevap iskeleti</h4>
                  <div className="text-slate-700 text-sm whitespace-pre-wrap p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {evaluation.exampleSkeleton}
                  </div>
                </div>
              )}
              <details className="mt-2">
                <summary className="text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
                  Tüm geri bildirim metni
                </summary>
                <div
                  className="mt-2 p-4 bg-slate-50 rounded-lg text-slate-700 text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: evaluation.feedback.replace(/\n/g, '<br />'),
                  }}
                />
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
