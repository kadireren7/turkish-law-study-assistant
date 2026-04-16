'use client'

import { useState, useRef, useEffect } from 'react'
import { ChatMessage } from '@/components/chat/ChatMessage'
import { ConfidenceBadge } from '@/components/exam/ConfidenceBadge'
import { sendChatMessage, type ChatMessage as ChatMsg } from '@/lib/api'
import { stripConfidenceFromReplyContent, type ConfidenceLevel } from '@/lib/confidence'
import type { ExplanationMode } from '@/components/exam/ExplanationModeSwitcher'

const CHAT_SESSION_KEY = 'studylaw:chat:session:v1'

const STUDY_TOPICS = [
  'Ceza hukuku',
  'Borçlar hukuku',
  'Medeni hukuk',
  'Anayasa hukuku',
  'İdare hukuku',
  'Usul hukuku',
] as const

type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  sourceLabels?: string[]
  lastChecked?: string | null
  lowConfidence?: boolean
  warnings?: string[]
  confidence?: ConfidenceLevel
  queryType?: string
}

function TypingMinimal() {
  return (
    <div className="flex justify-start animate-fade-in" role="status" aria-live="polite" aria-label="Yanıt hazırlanıyor">
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/80 px-4 py-3 flex items-center gap-1">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
      </div>
    </div>
  )
}

function AssistantMeta({ msg }: { msg: Msg }) {
  const displayLabels = (msg.sourceLabels ?? []).filter(
    (l) =>
      !(
        l &&
        (l.includes('law-data') || l.includes('data/core') || l.endsWith('.md') || l.endsWith('.json'))
      )
  )
  const showSources = displayLabels.length > 0 && msg.queryType && msg.queryType !== 'sohbet_genel'

  return (
    <div className="max-w-[min(100%,42rem)] space-y-1.5 pl-0">
      {showSources && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          <span className="font-medium text-slate-600 dark:text-slate-400">Kaynak:</span> {displayLabels.join(', ')}
        </p>
      )}
      {(msg.confidence || msg.lowConfidence) && (
        <div className="flex flex-wrap items-center gap-2">
          {msg.confidence && <ConfidenceBadge level={msg.confidence} />}
          {msg.lowConfidence && (
            <span className="text-[11px] text-amber-700 dark:text-amber-300">Yerel kaynakta eşleşme zayıf.</span>
          )}
        </div>
      )}
      {(msg.warnings?.length ?? 0) > 0 &&
        msg.warnings!.map((w, j) => (
          <p
            key={j}
            className="text-[11px] text-amber-900 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-lg px-2.5 py-1.5"
          >
            {w}
          </p>
        ))}
    </div>
  )
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [studyTopic, setStudyTopic] = useState<string | null>(null)
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')
  const bottomRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const hasConversation = messages.length > 0

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHAT_SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        messages?: Msg[]
        input?: string
        studyTopic?: string | null
        explanationMode?: ExplanationMode
      }
      if (Array.isArray(parsed.messages)) setMessages(parsed.messages.slice(-40))
      if (typeof parsed.input === 'string') setInput(parsed.input)
      if (typeof parsed.studyTopic === 'string' || parsed.studyTopic === null) setStudyTopic(parsed.studyTopic ?? null)
      if (parsed.explanationMode === 'ogrenci' || parsed.explanationMode === 'uyap') setExplanationMode(parsed.explanationMode)
    } catch {
      // ignore malformed session state
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        CHAT_SESSION_KEY,
        JSON.stringify({
          messages: messages.slice(-40),
          input,
          studyTopic,
          explanationMode,
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [messages, input, studyTopic, explanationMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    const isFirst = messages.length === 0
    const displayMessages: Msg[] = [...messages, { role: 'user', content: userMessage }]
    setMessages(displayMessages)
    setLoading(true)

    const apiMessages: ChatMsg[] = displayMessages.map((m, i) => {
      if (m.role === 'user' && i === displayMessages.length - 1 && studyTopic && isFirst) {
        return {
          role: 'user',
          content: `[Çalışma konusu: ${studyTopic}]\n\n${m.content}`,
        }
      }
      return { role: m.role, content: m.content }
    })

    try {
      const { reply, sources, sourceLabels, lastChecked, lowConfidence, warnings, confidence, queryType } =
        await sendChatMessage(apiMessages, { explanationMode })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, sources, sourceLabels, lastChecked, lowConfidence, warnings, confidence, queryType },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sunucu tarafında bir hata oluştu. Lütfen tekrar deneyin.'
      setMessages((prev) => [...prev, { role: 'assistant', content: message }])
    } finally {
      setLoading(false)
    }
  }

  const composer = (
    <form ref={formRef} onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-none focus-within:ring-2 focus-within:ring-slate-300 dark:focus-within:ring-slate-600 focus-within:border-transparent transition-shadow">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              formRef.current?.requestSubmit()
            }
          }}
          placeholder="Sorunuzu yazın…"
          rows={hasConversation ? 2 : 5}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none min-h-[52px] max-h-40 rounded-2xl"
          disabled={loading}
        />
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800/80 p-0.5" role="group" aria-label="Anlatım tonu">
            {(['ogrenci', 'uyap'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setExplanationMode(m)}
                disabled={loading}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  explanationMode === m
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {m === 'ogrenci' ? 'Sade' : 'Resmî'}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Gönder
          </button>
        </div>
      </div>
    </form>
  )

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--background)]">
      {!hasConversation ? (
        <div className="flex flex-1 flex-col min-h-0 items-center justify-center px-4 pb-8 pt-2 md:pt-6">
          <div className="w-full max-w-2xl text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Ne çalışmak istersiniz?</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">İsteğe bağlı konu seçin; ilk mesajınızda modele iletilir.</p>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {STUDY_TOPICS.map((t) => {
                const on = studyTopic === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStudyTopic(on ? null : t)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                )
              })}
            </div>

            {studyTopic && (
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-500">
                Seçili konu: <span className="font-medium text-slate-700 dark:text-slate-300">{studyTopic}</span>
                {' · '}
                <button type="button" onClick={() => setStudyTopic(null)} className="underline underline-offset-2 hover:text-slate-800 dark:hover:text-slate-200">
                  Kaldır
                </button>
              </p>
            )}

            <div className="mt-10">{composer}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <ChatMessage
                    variant="minimal"
                    role={msg.role}
                    content={msg.role === 'assistant' ? stripConfidenceFromReplyContent(msg.content) : msg.content}
                  />
                  {msg.role === 'assistant' && <AssistantMeta msg={msg} />}
                </div>
              ))}
              {loading && <TypingMinimal />}
              <div ref={bottomRef} className="h-px" />
            </div>
          </div>
          <div className="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-[var(--background)] pt-3 pb-4 md:pb-6 px-4">
            {composer}
          </div>
        </>
      )}
    </div>
  )
}
