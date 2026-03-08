'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/components/ChatMessage'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { ExplanationModeSwitcher, type ExplanationMode } from '@/components/ExplanationModeSwitcher'
import { sendChatMessage } from '@/lib/api'
import { stripConfidenceFromReplyContent, type ConfidenceLevel } from '@/lib/confidence'

const ROTATING_PLACEHOLDERS = [
  'Bir olay yaz, birlikte çözelim...',
  'TCK 21\'i örnek olayla açıkla',
  'Mülkiyet konusunda pratik soru üret',
  'Ehliyet türlerini karşılaştır',
  'Bu olayı sınav cevabı gibi değerlendir',
  'Bir madde, kavram veya olay sor...',
  'Sınav için kısa olay sorusu üret',
]

const PLACEHOLDER_INTERVAL_MS = 3500

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/25 dark:to-emerald-500/25 flex items-center justify-center">
        <span className="text-lg">⚖️</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1.5 min-h-[52px]">
          <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400" />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">Yanıt hazırlanıyor…</span>
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; sources?: string[]; sourceLabels?: string[]; lastChecked?: string | null; lowConfidence?: boolean; warnings?: string[]; confidence?: ConfidenceLevel; queryType?: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')
  const bottomRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % ROTATING_PLACEHOLDERS.length)
    }, PLACEHOLDER_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const newMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...messages,
      { role: 'user', content: userMessage },
    ]
    setMessages(newMessages)
    setLoading(true)
    try {
      const { reply, sources, sourceLabels, lastChecked, lowConfidence, warnings, confidence, queryType } = await sendChatMessage(newMessages, { explanationMode })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, sources, sourceLabels, lastChecked, lowConfidence, warnings, confidence, queryType },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.'
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: message },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Sohbet</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Olay çözün, kavram karşılaştırın; takip soruları ve mini pratikle çalışma ortağı gibi yanıt alın.
            </p>
          </div>
          <ExplanationModeSwitcher
            value={explanationMode}
            onChange={setExplanationMode}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-16 max-w-md mx-auto animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-500/20 dark:to-emerald-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">
                ⚖️
              </div>
              <p className="font-medium text-slate-700 dark:text-slate-200">Merhaba, hukuk öğrencisi.</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Bir olay yazıp birlikte çözelim, madde sorun veya pratik soru isteyin. Takip soruları ve mini vakalarla sınav mantığını pekiştirin.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i}>
              <ChatMessage role={msg.role} content={msg.role === 'assistant' ? stripConfidenceFromReplyContent(msg.content) : msg.content} />
              {msg.role === 'assistant' && (msg.sourceLabels?.length ?? 0) > 0 && msg.queryType && msg.queryType !== 'sohbet_genel' && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span className="font-medium text-slate-600 dark:text-slate-300">Kullanılan kaynak:</span>{' '}
                    {msg.sourceLabels!.join(', ')}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (msg.confidence || msg.lowConfidence) && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {msg.confidence && <ConfidenceBadge level={msg.confidence} />}
                    {msg.lowConfidence && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Yerel kaynaklarda eşleşme bulunamadı.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && (msg.warnings?.length ?? 0) > 0 && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <div className="flex flex-col gap-1 mt-1">
                    {msg.warnings!.map((w, j) => (
                      <p key={j} className="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-2">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4">
        <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  formRef.current?.requestSubmit()
                }
              }}
              placeholder={ROTATING_PLACEHOLDERS[placeholderIndex]}
              rows={1}
              className="flex-1 min-h-[48px] max-h-32 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y bg-white dark:bg-slate-800 disabled:opacity-60 transition-all duration-200 shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-primary shrink-0 h-12 px-6 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            >
              Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
