'use client'

import { useState } from 'react'
import { analyzeCase } from '@/lib/api'

const SECTIONS = [
  { title: 'Olay özeti', sub: '', pattern: /OLAY\s*ÖZETİ\s*:?\s*/i },
  { title: 'Hukuki sorun', sub: '', pattern: /HUKUKİ\s*SORUN\s*:?\s*/i },
  { title: 'İlgili maddeler', sub: '', pattern: /İLGİLİ\s*MADDELER\s*:?\s*/i },
  { title: 'Hukuki değerlendirme', sub: '', pattern: /HUKUKİ\s*DEĞERLENDİRME\s*:?\s*/i },
  { title: 'Sonuç', sub: '', pattern: /SONUÇ\s*:?\s*/i },
  { title: 'Sınavda böyle yazılabilir', sub: '', pattern: /SINAVDA\s*BÖYLE\s*YAZILABİLİR\s*:?\s*/i },
] as const

function parseAnalysis(text: string): { title: string; sub: string; content: string }[] {
  const normalized = text.replace(/\*\*/g, '')
  const result: { title: string; sub: string; content: string }[] = []

  for (let i = 0; i < SECTIONS.length; i++) {
    const current = SECTIONS[i]
    const next = SECTIONS[i + 1]
    const match = normalized.match(current.pattern)
    if (!match || match.index === undefined) continue
    const start = match.index + match[0].length
    const nextMatch = next ? normalized.slice(start).match(next.pattern) : null
    const end = nextMatch && nextMatch.index !== undefined ? start + nextMatch.index : undefined
    const content = (end !== undefined ? normalized.slice(start, end) : normalized.slice(start)).trim()
    if (content) result.push({ title: current.title, sub: current.sub, content })
  }
  if (result.length === 0) return [{ title: 'Hukuki Analiz', sub: '', content: text }]
  return result
}

export default function CaseSolverPage() {
  const [caseText, setCaseText] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caseText.trim() || loading) return
    setLoading(true)
    setAnalysis('')
    setError('')
    try {
      const result = await analyzeCase(caseText.trim())
      setAnalysis(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analiz yüklenirken bir hata oluştu.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const sections = analysis ? parseAnalysis(analysis) : []

  return (
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Olay Analizi</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Olay çözme yöntemini adım adım öğrenin. Vakayı yazın; olay özeti, hukuki sorun, ilgili maddeler, değerlendirme, sonuç ve sınavda nasıl yazılır örneği alın.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Olay / vaka metni</span>
            <p className="text-xs text-slate-500 mt-0.5 mb-1">Vakayı yapıştırın veya yazın; olay çözme yöntemiyle adım adım analiz ve sınav cevabı örneği alırsınız.</p>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Örn: A, B'ye sattığı arabayı teslim etmemiştir. B ödemeyi yapmıştır. B, A'dan hem teslim hem tazminat istiyor. A, maddi imkânsızlık nedeniyle teslim edemediğini iddia ediyor..."
              rows={8}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y bg-white shadow-sm"
              disabled={loading}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !caseText.trim()}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {loading ? 'Çözülüyor...' : 'Olayı çöz'}
          </button>
        </form>

        {error && (
          <div className="max-w-3xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        {analysis && (
          <div className="max-w-3xl mx-auto mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Olay çözme analizi</h3>
            {sections.map((section, i) => (
              <div
                key={i}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <h4 className="text-sm font-semibold text-teal-700">
                  {section.title}
                  {section.sub && <span className="font-normal text-slate-500 ml-2">({section.sub})</span>}
                </h4>
                <div
                  className="prose-law text-slate-700 text-sm whitespace-pre-wrap mt-2"
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
  )
}
