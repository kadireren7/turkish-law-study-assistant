'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/components/ChatMessage'
import { sendChatMessage } from '@/lib/api'

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; sources?: string[]; sourceLabels?: string[]; lastChecked?: string | null; lowConfidence?: boolean; warnings?: string[] }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      const { reply, sources, sourceLabels, lastChecked, lowConfidence, warnings } = await sendChatMessage(newMessages)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, sources, sourceLabels, lastChecked, lowConfidence, warnings },
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
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Sohbet</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Ders ve sınav çalışırken sorularınızı sorun; tanım, ilgili madde, açıklama ve sınav notu formatında yanıt alın.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-8">
          {messages.length === 0 && (
            <div className="text-center py-16 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center text-2xl mx-auto mb-4">
                ⚖️
              </div>
              <p className="font-medium text-slate-700">Merhaba, hukuk öğrencisi.</p>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Ders ve sınavlara hazırlanırken yanınızdayız. Konu sorun, madde arayın, olay çözün veya sınav pratiği yapın.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i}>
              <ChatMessage role={msg.role} content={msg.content} />
              {msg.role === 'assistant' && ((msg.sourceLabels?.length ?? msg.sources?.length ?? 0) > 0) && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="font-medium text-slate-600">Kullanılan kaynak:</span>{' '}
                    {(msg.sourceLabels && msg.sourceLabels.length > 0) ? msg.sourceLabels.join(', ') : msg.sources!.join(', ')}
                    {msg.lastChecked && (
                      <>
                        {' · '}
                        <span className="text-slate-500">
                          Son kontrol:{' '}
                          {(() => {
                            try {
                              return new Date(msg.lastChecked!.slice(0, 10)).toLocaleDateString('tr-TR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })
                            } catch {
                              return msg.lastChecked
                            }
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
              {msg.role === 'assistant' && msg.lowConfidence && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-1">
                    Bu yanıt yerel kaynaklarda eşleşme bulunamadığı için daha düşük güvenle verilmiştir.
                  </p>
                </div>
              )}
              {msg.role === 'assistant' && (msg.warnings?.length ?? 0) > 0 && (
                <div className="flex gap-3 mt-1">
                  <div className="shrink-0 w-9" />
                  <div className="flex flex-col gap-1 mt-1">
                    {msg.warnings!.map((w, j) => (
                      <p key={j} className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-600" />
              <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-white border border-slate-200 text-slate-500 text-sm">
                Yanıt hazırlanıyor...
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white p-3 sm:p-4">
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
              placeholder="Konu veya madde sor (örn: TBK 77 nedir?)"
              rows={1}
              className="flex-1 min-h-[48px] max-h-32 rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y bg-white disabled:opacity-60"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 h-12 px-6 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
