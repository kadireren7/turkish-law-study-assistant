'use client'

/**
 * Olay Analizi – tek istek, tek sonuç.
 * Çift çıktı önlemi: (1) submitInFlightRef ile aynı anda yalnızca bir istek.
 * (2) requestIdRef ile gelen yanıt yalnızca "en güncel" isteğe aitse state güncellenir; eski yanıtlar yok sayılır.
 */

import { useState, useRef } from 'react'
import { analyzeCase, type CaseAnalysisResult } from '@/lib/api'
import { ConfidenceBadge } from '@/components/exam/ConfidenceBadge'
import { ExplanationModeSwitcher, type ExplanationMode } from '@/components/exam/ExplanationModeSwitcher'
import { recordCaseAnalysis } from '@/lib/study-engine'

const SECTIONS = [
  // Multi-issue format (match first so "Genel olay özeti" is used instead of "Olay özeti")
  { title: 'Genel olay özeti', sub: '', pattern: /GENEL\s*OLAY\s*ÖZETİ\s*:?\s*/i },
  { title: 'Tespit edilen hukuki sorunlar', sub: '', pattern: /TESPİT\s*EDİLEN\s*HUKUKİ\s*SORUNLAR\s*:?\s*/i },
  { title: 'Her sorun için ayrı değerlendirme', sub: '', pattern: /HER\s*SORUN\s*İÇİN\s*AYRI\s*DEĞERLENDİRME\s*:?\s*/i },
  { title: 'Genel sonuç', sub: '', pattern: /GENEL\s*SONUÇ\s*:?\s*/i },
  { title: 'Sınavda puan getiren noktalar', sub: '', pattern: /SINAVDA\s*PUAN\s*GETİREN\s*NOKTALAR\s*:?\s*/i },
  // Single-issue format
  { title: 'Olay özeti', sub: '', pattern: /OLAY\s*ÖZETİ\s*:?\s*/i },
  { title: 'Hukuki Sorun', sub: '', pattern: /HUKUKİ\s*SORUN\s*:?\s*/i },
  { title: 'Kural', sub: '', pattern: /(?:KURAL|İLGİLİ\s*MADDELER)\s*:?\s*/i },
  { title: 'Uygulama', sub: '', pattern: /(?:UYGULAMA|HUKUKİ\s*DEĞERLENDİRME)\s*:?\s*/i },
  { title: 'Sonuç', sub: '', pattern: /SONUÇ\s*:?\s*/i },
  { title: 'Örnek güçlü cevap iskeleti', sub: '', pattern: /ÖRNEK\s*GÜÇLÜ\s*CEVAP\s*İSKELETİ\s*:?\s*/i },
  { title: 'Sınavda böyle yazılabilir', sub: '', pattern: /SINAVDA\s*BÖYLE\s*YAZILABİLİR\s*:?\s*/i },
  { title: 'Alternatif görüş / tartışma', sub: '', pattern: /ALTERNATİF\s*GÖRÜŞ\s*\/\s*TARTIŞMA\s*:?\s*/i },
  { title: 'Kullanılan kaynak', sub: '', pattern: /KULLANILAN\s*KAYNAK\s*:?\s*/i },
] as const

/** Olay özeti / Genel olay özeti gibi tekrarları tek bölümde birleştir. */
function deduplicateSections(sections: { title: string; sub: string; content: string }[]): { title: string; sub: string; content: string }[] {
  const seen = new Set<string>()
  const out: { title: string; sub: string; content: string }[] = []
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 80)
  for (const s of sections) {
    const key = s.title.toLowerCase().replace(/\s+/g, '_')
    const contentKey = normalize(s.content)
    if (key === 'olay_özeti' && seen.has('genel_olay_özeti')) continue
    if (key === 'genel_olay_özeti') seen.add('genel_olay_özeti')
    if (key === 'olay_özeti') seen.add('olay_özeti')
    if (contentKey && out.some((o) => normalize(o.content) === contentKey)) continue
    out.push(s)
  }
  return out
}

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
  return deduplicateSections(result)
}

export default function CaseSolverPage() {
  const [caseText, setCaseText] = useState('')
  const [result, setResult] = useState<CaseAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('ogrenci')
  const submitInFlightRef = useRef(false)
  const requestIdRef = useRef(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caseText.trim() || loading) return
    if (submitInFlightRef.current) return
    submitInFlightRef.current = true
    const requestId = ++requestIdRef.current
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const data = await analyzeCase(caseText.trim(), { explanationMode })
      if (requestIdRef.current !== requestId) return
      setResult(data)
      recordCaseAnalysis(data.classification?.category)
    } catch (err) {
      if (requestIdRef.current !== requestId) return
      const msg = err instanceof Error ? err.message : 'Analiz yüklenirken bir hata oluştu.'
      setError(msg)
    } finally {
      if (requestIdRef.current === requestId) setLoading(false)
      submitInFlightRef.current = false
    }
  }

  const analysis = result?.analysis ?? ''
  const sections = analysis ? parseAnalysis(analysis) : []

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Olay Analizi</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Olay çözme yöntemini adım adım öğrenin. Vakayı yazın; olay özeti, hukuki sorun, ilgili maddeler, değerlendirme, sonuç ve sınavda nasıl yazılır örneği alın.
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
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Olay / vaka metni</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-1">Vakayı yazın veya yapıştırın; olay özeti, hukuki sorun, ilgili maddeler ve sınavda nasıl yazılır örneği alırsınız.</p>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Bir olay yazın veya yapıştırın... Örn: A, B'ye sattığı arabayı teslim etmemiştir. B ödemeyi yapmıştır. B, A'dan hem teslim hem tazminat istiyor..."
              rows={8}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y bg-white dark:bg-slate-800 shadow-sm transition-colors"
              disabled={loading}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !caseText.trim()}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            {loading ? 'Çözülüyor...' : 'Olayı çöz'}
          </button>
        </form>

        {error && (
          <div className="max-w-3xl mx-auto mt-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {analysis && (
          <div className="max-w-3xl mx-auto mt-8 space-y-4 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Olay çözme analizi</h3>
              {result?.confidence && <ConfidenceBadge level={result.confidence} />}
            </div>
            {sections.map((section, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark transition-all duration-200"
              >
                <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                  {section.title}
                  {section.sub && <span className="font-normal text-slate-500 dark:text-slate-400 ml-2">({section.sub})</span>}
                </h4>
                <div
                  className="prose-law text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap mt-2"
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
