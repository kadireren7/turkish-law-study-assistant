'use client'

import { useState } from 'react'
import { getLesson, sendLessonDiscuss, type LessonResult } from '@/lib/api'
import { ConfidenceBadge } from '@/components/exam/ConfidenceBadge'
import { LESSON_SUBJECTS } from '@/lib/lesson-prompt'
import { ExplanationModeSwitcher, type ExplanationMode } from '@/components/exam/ExplanationModeSwitcher'

/** Section patterns for parsing professor-style output (8-section structure + legacy variants). */
const SECTIONS = [
  { title: 'Konunun özeti', pattern: /(?:^|\n)\s*\*\*Konunun özeti\*\*[:\s]*/i },
  { title: 'Temel kavramlar', pattern: /(?:^|\n)\s*\*\*Temel kavramlar\*\*[:\s]*/i },
  { title: 'Kurallar / ilkeler', pattern: /(?:^|\n)\s*\*\*Kurallar\s*\/\s*ilkeler\*\*[:\s]*/i },
  { title: 'İlgili kanun maddesi / Kurallar', pattern: /(?:^|\n)\s*\*\*İlgili kanun maddesi\s*\/\s*Kurallar\*\*[:\s]*/i },
  { title: 'İlgili kanun maddesi', pattern: /(?:^|\n)\s*\*\*İlgili kanun maddesi\*\*[:\s]*/i },
  { title: 'Önemli ayrımlar', pattern: /(?:^|\n)\s*\*\*Önemli ayrımlar\*\*[:\s]*/i },
  { title: 'Örnek olay', pattern: /(?:^|\n)\s*\*\*Örnek olay\*\*[:\s]*/i },
  { title: 'Sınavda nasıl yazılır', pattern: /(?:^|\n)\s*\*\*Sınavda nasıl yazılır\*\*[:\s]*/i },
  { title: 'Farklı bakış açıları / öğretide farklı görüşler', pattern: /(?:^|\n)\s*\*\*Farklı bakış açıları\s*\/\s*öğretide farklı görüşler\*\*[:\s]*/i },
  { title: 'Öğretideki görüşler ve uygulama', pattern: /(?:^|\n)\s*\*\*Öğretideki görüşler ve uygulama\*\*[:\s]*/i },
  { title: 'Farklı bakış açıları', pattern: /(?:^|\n)\s*\*\*Farklı bakış açıları\*\*[:\s]*/i },
  { title: 'Kullanılan kaynak', pattern: /(?:^|\n)\s*\*\*Kullanılan kaynak\*\*[:\s]*/i },
  { title: 'Bu derste öğrenecekleriniz', pattern: /(?:^|\n)\s*\*\*Bu derste öğrenecekleriniz\*\*[:\s]*/i },
  { title: 'Kısa sınav notu', pattern: /(?:^|\n)\s*\*\*Kısa sınav notu\*\*[:\s]*/i },
]

function parseLesson(text: string): { title: string; content: string }[] {
  const result: { title: string; content: string }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < SECTIONS.length; i++) {
    const current = SECTIONS[i]
    const next = SECTIONS[i + 1]
    const match = text.match(current.pattern)
    if (!match || match.index === undefined || seen.has(current.title)) continue
    const start = match.index + match[0].length
    const nextMatch = next ? text.slice(start).match(next.pattern) : null
    const end = nextMatch && nextMatch.index !== undefined ? start + nextMatch.index : undefined
    const content = (end !== undefined ? text.slice(start, end) : text.slice(start)).trim()
    if (content) {
      seen.add(current.title)
      result.push({ title: current.title, content })
    }
  }
  if (result.length === 0) return [{ title: 'Ders', content: text }]
  return result
}

export default function LawLessonsPage() {
  const [subject, setSubject] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')
  const [discussMessage, setDiscussMessage] = useState('')
  const [discussReply, setDiscussReply] = useState('')
  const [loadingDiscuss, setLoadingDiscuss] = useState(false)
  const [discussError, setDiscussError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subjectLabel = subject ? LESSON_SUBJECTS.find((s) => s.id === subject)?.label : null
    if (!subjectLabel || !topic.trim() || loading) return
    setLoading(true)
    setError('')
    setLessonResult(null)
    try {
      const result = await getLesson(subjectLabel, topic.trim(), { explanationMode })
      setLessonResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ders yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const content = lessonResult?.content ?? ''
  const sections = content ? parseLesson(content) : []

  async function handleDiscussSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content || !discussMessage.trim() || loadingDiscuss) return
    setLoadingDiscuss(true)
    setDiscussError('')
    setDiscussReply('')
    try {
      const subjectLabel = subject ? LESSON_SUBJECTS.find((s) => s.id === subject)?.label : undefined
      const { reply } = await sendLessonDiscuss(content, discussMessage.trim(), {
        subject: subjectLabel ?? undefined,
        topic: topic.trim() || undefined,
      })
      setDiscussReply(reply)
    } catch (err) {
      setDiscussError(err instanceof Error ? err.message : 'Yanıt alınamadı.')
    } finally {
      setLoadingDiscuss(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Konu Anlatımı</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              1) Ders alanını seçin. 2) Konu yazın (örn. kasten öldürme, sebepsiz zenginleşme). 3) Anlatımı alın. Anlatımdan sonra aşağıda soru sorup tartışabilirsiniz; platform yerel ve web kaynaklarından en doğru bilgiyi kullanır.
            </p>
          </div>
          <ExplanationModeSwitcher
            value={explanationMode}
            onChange={setExplanationMode}
            disabled={loading}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ders / alan</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {LESSON_SUBJECTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSubject(s.id)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    subject === s.id
                      ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Konu</span>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Örn. Kasten öldürme, sebepsiz zenginleşme, temel haklar, idari işlem unsurları..."
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 shadow-sm"
                disabled={loading}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !subject || !topic.trim()}
              className="px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? 'Anlatım hazırlanıyor...' : 'Anlatımı al'}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {loading && !content && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-pulse">
              <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-600" />
              <div className="h-5 w-full rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-5 w-5/6 rounded bg-slate-100 dark:bg-slate-700" />
              <div className="h-5 w-4/6 rounded bg-slate-100 dark:bg-slate-700" />
            </div>
          )}

          {content && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {LESSON_SUBJECTS.find((s) => s.id === subject)?.label} — {topic}
                </h3>
                {lessonResult?.confidence && <ConfidenceBadge level={lessonResult.confidence} />}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anlatım yerel mevzuat, konu notları ve (varsa) web kaynaklarından derlenir; platform içinde en doğru bilgi gösterilir. Son bölümde kullanılan kaynak listelenir.
              </p>
              {sections.map((section, i) => (
                <div
                  key={i}
                  className={`p-5 rounded-2xl border shadow-sm transition-colors ${
                    section.title === 'Konunun özeti'
                      ? 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 border-l-4 border-l-teal-500'
                      : section.title === 'Kullanılan kaynak'
                        ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-2">{section.title}</h4>
                  <div
                    className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: section.content.replace(/\n/g, '<br />'),
                    }}
                  />
                </div>
              ))}

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-2">Tartışma / soru sor</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Bu konu hakkında soru sorun veya düşüncenizi yazın; yanıt yukarıdaki anlatıma göre verilir.
                </p>
                <form onSubmit={handleDiscussSubmit} className="space-y-3">
                  <textarea
                    value={discussMessage}
                    onChange={(e) => setDiscussMessage(e.target.value)}
                    placeholder="Örn. Bu olayda kast ile taksir nasıl ayrılır? / Sebepsiz zenginleşmede iade yükümlülüğü ne zaman doğar?"
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 text-sm"
                    disabled={loadingDiscuss}
                  />
                  <button
                    type="submit"
                    disabled={loadingDiscuss || !discussMessage.trim()}
                    className="px-4 py-2 rounded-xl bg-teal-600 dark:bg-teal-500 text-white text-sm font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50"
                  >
                    {loadingDiscuss ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </form>
                {discussError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{discussError}</p>
                )}
                {discussReply && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Yanıt</p>
                    <p className="text-slate-700 dark:text-slate-200 text-sm whitespace-pre-wrap">{discussReply}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
