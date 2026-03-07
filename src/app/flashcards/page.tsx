'use client'

import { useState } from 'react'
import { generateFlashcards } from '@/lib/api'

export default function FlashcardsPage() {
  const [topic, setTopic] = useState('')
  const [cards, setCards] = useState<{ front: string; back: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim() || loading) return
    setLoading(true)
    setCards([])
    setError('')
    setIndex(0)
    setFlipped(false)
    try {
      const data = await generateFlashcards(topic.trim())
      setCards(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilgi kartları oluşturulamadı.')
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  const current = cards[index]
  const hasCards = cards.length > 0

  return (
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Bilgi Kartları</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Konuya göre soru–cevap kartları oluşturulur. Ek çalışma için.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleGenerate} className="max-w-xl mx-auto flex gap-3 mb-8">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Örn. Borçlar Hukuku – sözleşme, Ceza Hukuku – kast"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !topic.trim()}
            className="shrink-0 min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
          </button>
        </form>

        {error && (
          <div className="max-w-xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {hasCards && (
          <div className="max-w-xl mx-auto">
            <div
              className="min-h-[240px] rounded-2xl border-2 border-slate-200 bg-white shadow-lg flex flex-col items-center justify-center p-8 cursor-pointer select-none transition-all hover:border-teal-300"
              onClick={() => setFlipped((f) => !f)}
            >
              <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                {flipped ? 'Arka: Cevap' : 'Ön: Soru'}
              </p>
              <p className="text-lg text-slate-800 text-center font-medium leading-relaxed">
                {flipped ? current.back : current.front}
              </p>
              <p className="text-xs text-slate-400 mt-4">Çevirmek için tıklayın</p>
            </div>
            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i <= 0 ? cards.length - 1 : i - 1))
                  setFlipped(false)
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                ← Önceki
              </button>
              <span className="text-sm text-slate-500">
                {index + 1} / {cards.length}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIndex((i) => (i >= cards.length - 1 ? 0 : i + 1))
                  setFlipped(false)
                }}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
