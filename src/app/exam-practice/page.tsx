'use client'

import { useState } from 'react'
import { generateExamQuestion, evaluateExamAnswer, type ExamEvaluation } from '@/lib/api'

const EXAM_TOPICS = [
  { value: 'Anayasa Hukuku – temel haklar ve özgürlükler', label: 'Anayasa Hukuku – temel haklar' },
  { value: 'Anayasa Hukuku – devlet organları', label: 'Anayasa Hukuku – devlet organları' },
  { value: 'Borçlar Hukuku – sözleşme ve ifa', label: 'Borçlar Hukuku – sözleşme' },
  { value: 'Borçlar Hukuku – sebepsiz zenginleşme', label: 'Borçlar Hukuku – sebepsiz zenginleşme' },
  { value: 'Borçlar Hukuku – haksız fiil', label: 'Borçlar Hukuku – haksız fiil' },
  { value: 'Ceza Hukuku – kast ve taksir', label: 'Ceza Hukuku – kast ve taksir' },
  { value: 'Ceza Hukuku – suçun unsurları', label: 'Ceza Hukuku – suçun unsurları' },
  { value: 'Ceza Hukuku – kasten öldürme', label: 'Ceza Hukuku – kasten öldürme' },
  { value: 'Medeni Hukuk – kişiler ve aile', label: 'Medeni Hukuk – kişiler ve aile' },
  { value: 'Medeni Hukuk – eşya hukuku', label: 'Medeni Hukuk – eşya hukuku' },
  { value: 'İdare Hukuku – idari işlem ve idari yargı', label: 'İdare Hukuku – idari işlem' },
  { value: 'other', label: 'Diğer (aşağıda yazın)' },
] as const

export default function ExamPracticePage() {
  const [topicSelect, setTopicSelect] = useState<string>(EXAM_TOPICS[0].value)
  const [customTopic, setCustomTopic] = useState('')
  const [question, setQuestion] = useState('')
  const [userAnswer, setUserAnswer] = useState('')
  const [evaluation, setEvaluation] = useState<ExamEvaluation | null>(null)
  const [loadingGenerate, setLoadingGenerate] = useState(false)
  const [loadingEvaluate, setLoadingEvaluate] = useState(false)
  const [error, setError] = useState('')

  const topic = topicSelect === 'other' ? customTopic.trim() : topicSelect

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || loadingGenerate) return
    setLoadingGenerate(true)
    setError('')
    setQuestion('')
    setUserAnswer('')
    setEvaluation(null)
    try {
      const q = await generateExamQuestion(topic)
      setQuestion(q)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Soru oluşturulamadı.')
    } finally {
      setLoadingGenerate(false)
    }
  }

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault()
    if (!question || !userAnswer.trim() || loadingEvaluate) return
    setLoadingEvaluate(true)
    setError('')
    setEvaluation(null)
    try {
      const result = await evaluateExamAnswer(question, userAnswer.trim(), topic || undefined)
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
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Sınav Pratiği</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Kısa cevaplı ve klasik hukuk sınav soruları üretilir. Cevabınızı yazın; puan, güçlü yönler, eksikler ve nasıl daha iyi yazılır geri bildirimi alın.
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
            <button
              type="submit"
              disabled={loadingGenerate || !topic}
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loadingGenerate ? 'Soru hazırlanıyor...' : 'Soru oluştur'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {question && (
            <>
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-teal-700 mb-2">Soru</h3>
                <p className="text-slate-800 whitespace-pre-wrap">{question}</p>
              </div>

              <form onSubmit={handleEvaluate} className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Cevabınız</span>
                  <textarea
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Cevabınızı sınavda yazar gibi buraya yazın..."
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
              {evaluation.summary && (
                <p className="text-slate-700 text-sm border-l-4 border-teal-200 pl-3 py-1">
                  {evaluation.summary}
                </p>
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
              {evaluation.howToImprove && (
                <div>
                  <h4 className="text-sm font-semibold text-teal-700 mb-1">Nasıl daha iyi yazılır</h4>
                  <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {evaluation.howToImprove}
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
