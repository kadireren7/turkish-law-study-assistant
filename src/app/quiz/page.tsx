'use client'

import { useState } from 'react'
import { generateQuiz } from '@/lib/api'

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

export default function QuizPage() {
  const [subject, setSubject] = useState<string>(LAW_SUBJECTS[0].value)
  const [customTopic, setCustomTopic] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [reveal, setReveal] = useState<Record<number, boolean>>({})

  const topic = subject === 'other' ? customTopic.trim() : subject

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || loading) return
    setLoading(true)
    setQuestions([])
    setError('')
    setSelected({})
    setReveal({})
    try {
      const data = await generateQuiz(topic)
      setQuestions(data.questions ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test oluşturulamadı.')
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  function toggleReveal(index: number) {
    setReveal((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Çoktan Seçmeli Test</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Konu seçin; 5 çoktan seçmeli soru üretilir. Ek çalışma için.
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
          <button
            type="submit"
            disabled={loading || !topic}
            className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Oluşturuluyor...' : '5 soru oluştur'}
          </button>
        </form>

        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-8">
          {questions.map((q, i) => (
            <div
              key={i}
              className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm"
            >
              <p className="font-medium text-slate-800 mb-4">
                Soru {i + 1}: {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, j) => (
                  <label
                    key={j}
                    className={`flex items-center gap-3 p-3 min-h-[48px] rounded-lg border cursor-pointer transition-colors ${
                      selected[i] === opt
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={opt}
                      checked={selected[i] === opt}
                      onChange={() => setSelected((prev) => ({ ...prev, [i]: opt }))}
                      className="text-teal-600"
                    />
                    <span className="text-slate-700">
                      {letters[j]}) {opt}
                    </span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggleReveal(i)}
                className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {reveal[i] ? 'Cevabı gizle' : 'Doğru cevabı göster'}
              </button>
              {reveal[i] && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm border border-slate-100">
                  <p className="font-medium text-slate-700">
                    Doğru cevap: {q.correct}
                  </p>
                  <p className="text-slate-600 mt-2"><span className="font-medium text-slate-700">Açıklama:</span> {q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
