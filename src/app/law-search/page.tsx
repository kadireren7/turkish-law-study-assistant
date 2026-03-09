'use client'

import { useState } from 'react'
import { searchLawArticle, type LawSearchResult, type WebSearchItem } from '@/lib/api'
import { ApiLoading } from '@/components/ApiLoading'
import { ApiErrorBox } from '@/components/ApiErrorBox'

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark transition-all duration-200 hover:shadow-card-hover dark:hover:shadow-card-hover-dark">
      <h4 className="text-sm font-semibold text-teal-700 dark:text-teal-400 mb-2">{title}</h4>
      <div className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export default function LawSearchPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<LawSearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    setResult(null)
    try {
      const data = await searchLawArticle(query.trim())
      setResult(data)
    } catch {
      setResult({
        found: false,
        lawCode: '',
        lawLabel: '',
        article: 0,
        maddeBasligi: null,
        maddeMetni: null,
        basitAciklama: null,
        maddeninAmaci: null,
        kisaOrnek: null,
        sinavdaDikkat: null,
        guncellikNotu: null,
        message: 'Arama sırasında hata oluştu.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Madde Ara</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Bir madde, kavram veya kanun arayın. TCK, TMK, TBK, CMK, HMK, Anayasa veya İdare.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Örn. tbk 2, TBK m.2, Türk Borçlar Kanunu 2, Anayasa 10, TMK 472, cmk 100, hmk 119"
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-slate-800 shadow-sm transition-colors"
              disabled={loading}
              aria-label="Madde veya kanun ara"
              aria-busy={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 dark:bg-teal-500 text-white font-medium hover:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
              aria-label={loading ? 'Aranıyor' : 'Ara'}
            >
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="max-w-2xl mx-auto mt-8">
            <ApiLoading message="Madde aranıyor…" />
          </div>
        )}

        {result && !loading && (
          <div className="max-w-2xl mx-auto mt-8 space-y-4 animate-fade-in-up">
            {result.message && !result.found && !result.webResults?.length && (
              <ApiErrorBox
                message={result.message}
                onRetry={() => setResult(null)}
              />
            )}
            {result.found && (
              <>
                {result.maddeBasligi != null && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {result.lawLabel} · Madde {result.article}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {result.maddeBasligi}
                    </h3>
                  </div>
                )}

                <ResultBlock title="Madde metni">{result.maddeMetni}</ResultBlock>
                <ResultBlock title="Basit açıklama">{result.basitAciklama}</ResultBlock>
                <ResultBlock title="Bu maddenin amacı">{result.maddeninAmaci}</ResultBlock>
                <ResultBlock title="Kısa örnek">{result.kisaOrnek}</ResultBlock>
                <ResultBlock title="Sınavda dikkat">{result.sinavdaDikkat}</ResultBlock>

                {result.guncellikNotu && (
                  <div className="p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Güncellik notu:</span>{' '}
                    {result.guncellikNotu}
                  </div>
                )}
                {result.fromWeb && result.webResults && result.webResults.length > 0 && (
                  <details className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <summary className="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                      Kaynaklar (isteğe bağlı)
                    </summary>
                    <ul className="mt-3 space-y-2 text-sm">
                      {result.webResults.map((r: WebSearchItem, i: number) => (
                        <li key={i}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 hover:underline">
                            {r.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </>
            )}

            {!result.found && result.lawLabel && result.article > 0 && (!result.webResults || result.webResults.length === 0) && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
                <p>
                  <strong className="text-slate-700 dark:text-slate-200">{result.lawLabel}</strong> için Madde {result.article} bilgi tabanında yer almıyor. Resmî metin için Resmî Gazete veya mevzuat portallarını kullanın.
                </p>
              </div>
            )}

            {!result.found && result.webResults && result.webResults.length > 0 && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-card dark:shadow-card-dark">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Yerel veritabanında bu madde yok; web kaynaklarından özet şu an derlenemedi. Aşağıdaki linklerden resmî metni kontrol edebilirsiniz.
                </p>
                <ul className="space-y-2">
                  {result.webResults.map((r: WebSearchItem, i: number) => (
                    <li key={i}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-teal-700 dark:text-teal-300 hover:underline">
                        {r.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
