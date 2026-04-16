'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { sendOralExamMessage } from '@/lib/api'
import { ORAL_EXAM_TOPICS, type OralExamTopicId } from '@/lib/oral-exam-prompt'
import { recordOralTopic } from '@/lib/study-engine'

export default function MiniSozluPage() {
  const [topic, setTopic] = useState<OralExamTopicId | ''>('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleStart() {
    if (!topic || loading) return
    setLoading(true)
    setError('')
    setMessages([])
    setStarted(true)
    try {
      const { reply } = await sendOralExamMessage(topic, [])
      setMessages([{ role: 'assistant', content: reply }])
      recordOralTopic(topic)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İlk soru alınamadı.')
      setStarted(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!topic || !input.trim() || loading) return
    const userAnswer = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userAnswer }]
    setMessages(newMessages)
    setLoading(true)
    setError('')
    try {
      const { reply } = await sendOralExamMessage(topic, newMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      recordOralTopic(topic)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yanıt alınamadı.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setMessages([])
    setInput('')
    setStarted(false)
    setError('')
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Mini Sözlü Yoklama</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Hoca tek tek soru sorar; siz cevaplarsınız. Her cevaptan sonra kısa düzeltme ve cevabınıza göre uyarlanmış bir sonraki soru. Kavram ve pratik sorular; zorluk kademeli artabilir. Final ve sözlü sınavlara hazırlık.
            </p>
          </div>
          {started && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Yeni yoklama
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-6">
          {!started ? (
            <div className="animate-fade-in-up">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Konu seçin</p>
              <div className="flex flex-wrap gap-2">
                {ORAL_EXAM_TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTopic(t.id)}
                    className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      topic === t.id
                        ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={handleStart}
                disabled={!topic || loading}
                className="mt-6 min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                {loading ? 'İlk soru hazırlanıyor...' : 'Başla'}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <span>Konu:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {ORAL_EXAM_TOPICS.find((t) => t.id === topic)?.label ?? topic}
                  </span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Bir soru sorulur; cevabınızı yazın. Hoca cevabınızı değerlendirir, kısa düzeltme yapar ve bir sonraki soruyu sorar.
                </p>
              </div>
              {messages.map((msg, i) => (
                <div key={i}>
                  <ChatMessage role={msg.role} content={msg.content} />
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 animate-fade-in">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/25 dark:to-emerald-500/25 flex items-center justify-center text-lg">
                    ⚖️
                  </div>
                  <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 min-h-[52px]">
                    <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
                    <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} className="h-2" />
            </>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm animate-fade-in">
              {error}
            </div>
          )}
        </div>
      </div>

      {started && !loading && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Cevabınızı yazın..."
                rows={2}
                className="flex-1 min-h-[48px] max-h-32 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 resize-y transition-colors shadow-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 h-12 px-6 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                Gönder
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
