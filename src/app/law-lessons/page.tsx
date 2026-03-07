'use client'

import { useState } from 'react'
import { getLesson } from '@/lib/api'
import { LESSON_SUBJECTS } from '@/lib/lesson-prompt'

const SECTIONS = [
  { title: 'Tanım', pattern: /(?:^|\n)\s*\*\*Tanım\*\*[:\s]*/i },
  { title: 'İlgili kanun maddesi', pattern: /(?:^|\n)\s*\*\*İlgili kanun maddesi\*\*[:\s]*/i },
  { title: 'Açıklama', pattern: /(?:^|\n)\s*\*\*Açıklama\*\*[:\s]*/i },
  { title: 'Örnek olay', pattern: /(?:^|\n)\s*\*\*Örnek olay\*\*[:\s]*/i },
  { title: 'Sınav notu', pattern: /(?:^|\n)\s*\*\*Sınav notu\*\*[:\s]*/i },
]

function parseLesson(text: string): { title: string; content: string }[] {
  const result: { title: string; content: string }[] = []
  for (let i = 0; i < SECTIONS.length; i++) {
    const current = SECTIONS[i]
    const next = SECTIONS[i + 1]
    const match = text.match(current.pattern)
    if (!match || match.index === undefined) continue
    const start = match.index + match[0].length
    const nextMatch = next ? text.slice(start).match(next.pattern) : null
    const end = nextMatch && nextMatch.index !== undefined ? start + nextMatch.index : undefined
    const content = (end !== undefined ? text.slice(start, end) : text.slice(start)).trim()
    if (content) result.push({ title: current.title, content })
  }
  if (result.length === 0) return [{ title: 'Ders', content: text }]
  return result
}

export default function LawLessonsPage() {
  const [subject, setSubject] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subjectLabel = subject ? LESSON_SUBJECTS.find((s) => s.id === subject)?.label : null
    if (!subjectLabel || !topic.trim() || loading) return
    setLoading(true)
    setError('')
    setContent('')
    try {
      const result = await getLesson(subjectLabel, topic.trim())
      setContent(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ders yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const sections = content ? parseLesson(content) : []

  return (
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Konu Anlatımı</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Ders alanı ve konu seçin; sade ve sınav odaklı anlatım alın.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-sm font-medium text-slate-700">Ders / alan</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {LESSON_SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubject(s.id)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    subject === s.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Konu</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Örn. Kasten öldürme, sebepsiz zenginleşme, temel haklar..."
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm"
                disabled={loading}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !subject || !topic.trim()}
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? 'Hazırlanıyor...' : 'Anlatımı al'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
              {error}
            </div>
          )}

          {content && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">
                {LESSON_SUBJECTS.find((s) => s.id === subject)?.label} — {topic}
              </h3>
              {sections.map((section, i) => (
                <div
                  key={i}
                  className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm"
                >
                  <h4 className="text-sm font-semibold text-teal-700 mb-2">{section.title}</h4>
                  <div
                    className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: section.content.replace(/\n/g, '<br />'),
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
