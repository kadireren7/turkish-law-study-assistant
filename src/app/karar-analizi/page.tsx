'use client'

import { useState } from 'react'
import { analyzeDecision, type DecisionAnalysisResult } from '@/lib/api'
import { ConfidenceBadge } from '@/components/ConfidenceBadge'
import { ApiLoading } from '@/components/ApiLoading'
import { ApiErrorBox } from '@/components/ApiErrorBox'

const MIN_INPUT_LENGTH = 40

const SECTIONS: { key: keyof DecisionAnalysisResult; title: string; isComment?: boolean }[] = [
  { key: 'kisaOzet', title: 'Kararın kısa özeti' },
  { key: 'olay', title: 'Olay' },
  { key: 'hukukiSorun', title: 'Hukuki sorun' },
  { key: 'mahkemeYaklasimi', title: 'Mahkemenin yaklaşımı' },
  { key: 'dayanilanKurallar', title: 'Dayanılan hukuk kuralları' },
  { key: 'kararinOnemi', title: 'Kararın önemi' },
  { key: 'karardanCikarilabilecekDers', title: 'Karardan çıkarılabilecek ders', isComment: true },
  { key: 'sinavdaNasilKullanilabilir', title: 'Sınavda nasıl kullanılabilir', isComment: true },
  { key: 'farkliYorumIhtimali', title: 'Farklı yorum ihtimali', isComment: true },
  { key: 'kullanilanKaynak', title: 'Kullanılan kaynak' },
]

function hasAnySectionContent(result: DecisionAnalysisResult): boolean {
  return SECTIONS.some(({ key }) => {
    const v = result[key]
    return typeof v === 'string' && v.trim().length > 0
  })
}

export default function KararAnaliziPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<DecisionAnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const trimmed = text.trim()
  const isTooShort = trimmed.length > 0 && trimmed.length < MIN_INPUT_LENGTH
  const canSubmit = trimmed.length >= MIN_INPUT_LENGTH && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) {
      if (trimmed.length < MIN_INPUT_LENGTH && trimmed.length > 0) {
        setError('Metin çok kısa. Analiz için en az birkaç cümle girin.')
      }
      return
    }
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const data = await analyzeDecision(trimmed)
      setResult(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Karar analizi yapılamadı. Lütfen tekrar deneyin.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Karar Analizi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Karar veya özeti yapıştırın; özet, olay, hukuki sorun, mahkemenin yaklaşımı, dayanılan kurallar, karardan çıkarılabilecek ders, sınavda kullanımı ve farklı yorum ihtimali yapılandırılmış şekilde çıkar. Metinde olmayan bilgi uydurulmaz.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4 animate-fade-in-up">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Karar / hukuki metin</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-1">
              Mahkeme kararı metnini veya karar özetini yapıştırın. En az birkaç cümle gerekir. Metinde olmayan tarih veya dosya numarası uydurulmaz.
            </p>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError('')
              }}
              placeholder="Karar metnini veya özetini yapıştırın..."
              rows={10}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y bg-white dark:bg-slate-800 shadow-sm transition-colors"
              disabled={loading}
              aria-invalid={isTooShort ? true : undefined}
              aria-describedby={isTooShort ? 'min-length-hint' : undefined}
              aria-label="Karar veya hukuki metin"
              aria-busy={loading}
            />
            {isTooShort && (
              <p id="min-length-hint" className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                En az {MIN_INPUT_LENGTH} karakter girin (birkaç cümle).
              </p>
            )}
          </label>
          {error && !loading && (
            <ApiErrorBox message={error} onRetry={() => { setError(''); setResult(null); }} />
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
            aria-label={loading ? 'Analiz ediliyor' : 'Analizi başlat'}
          >
            {loading ? 'Analiz ediliyor...' : 'Kararı analiz et'}
          </button>
        </form>

        {loading && (
          <div className="max-w-3xl mx-auto mt-6">
            <ApiLoading message="Karar analiz ediliyor…" />
          </div>
        )}

        {result && (
          <div className="max-w-3xl mx-auto mt-8 space-y-4 animate-fade-in-up">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Karar analizi</h3>
              {result.confidence && <ConfidenceBadge level={result.confidence} />}
            </div>
            {hasAnySectionContent(result) ? (
              <>
                {SECTIONS.map(({ key, title, isComment }) => {
                  const value = result[key]
                  if (typeof value !== 'string' || !value.trim()) return null
                  return (
                    <div
                      key={key}
                      className={`p-5 rounded-2xl border shadow-card dark:shadow-card-dark transition-all duration-200 ${
                        isComment
                          ? 'bg-amber-50/80 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-2">
                        {title}
                        {isComment && (
                          <span className="text-xs font-normal text-amber-700 dark:text-amber-400">(yorum / eğitim amaçlı)</span>
                        )}
                      </h4>
                      <div
                        className="prose-law text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap mt-2"
                        dangerouslySetInnerHTML={{
                          __html: value.trim().replace(/\n/g, '<br />'),
                        }}
                      />
                    </div>
                  )
                })}
              </>
            ) : (
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-card dark:shadow-card-dark">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Analiz (ham çıktı)</p>
                <div
                  className="prose-law text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: (result.analysis || 'Analiz metni alınamadı.').trim().replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            )}
            {result.sourceLabels && result.sourceLabels.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-medium text-slate-700 dark:text-slate-300">Kaynak (mevzuat):</span>{' '}
                {result.sourceLabels.join(' · ')}
                {result.lastChecked && (
                  <span className="block mt-1">Son kontrol: {result.lastChecked}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
