'use client'

import { useState } from 'react'
import { searchLawArticle, type LawSearchResult } from '@/lib/api'

function ResultBlock({ title, children }: { title: string; children: React.ReactNode }) {
  if (!children) return null
  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h4 className="text-sm font-semibold text-teal-700 mb-2">{title}</h4>
      <div className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
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
    <div className="flex flex-col h-screen bg-slate-50/80">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-800">Madde Ara</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          TCK, TMK, TBK, Anayasa veya İdare madde metnini arayın. Örnek: TCK 21, TBK 77, TMK 472, Anayasa 10
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Örn. TCK 21, TBK 77, TMK 472, Anayasa 10"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 min-h-[48px] px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>
        </form>

        {result && (
          <div className="max-w-2xl mx-auto mt-8 space-y-4">
            {result.message && !result.found && (
              <div className="p-4 rounded-xl text-sm bg-amber-50 text-amber-800 border border-amber-200">
                {result.message}
              </div>
            )}

            {result.found && (
              <>
                {result.maddeBasligi != null && (
                  <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      {result.lawLabel} · Madde {result.article}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-800">
                      {result.maddeBasligi}
                    </h3>
                  </div>
                )}

                <ResultBlock title="Madde metni">
                  {result.maddeMetni}
                </ResultBlock>

                <ResultBlock title="Basit açıklama">
                  {result.basitAciklama}
                </ResultBlock>

                <ResultBlock title="Bu maddenin amacı">
                  {result.maddeninAmaci}
                </ResultBlock>

                <ResultBlock title="Kısa örnek">
                  {result.kisaOrnek}
                </ResultBlock>

                <ResultBlock title="Sınavda dikkat">
                  {result.sinavdaDikkat}
                </ResultBlock>

                {result.guncellikNotu && (
                  <div className="p-4 rounded-xl text-xs text-slate-600 bg-slate-50 border border-slate-200">
                    <span className="font-semibold text-slate-700">Güncellik notu:</span>{' '}
                    {result.guncellikNotu}
                  </div>
                )}
              </>
            )}

            {!result.found && result.lawLabel && result.article > 0 && (
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 text-sm">
                <p>
                  <strong>{result.lawLabel}</strong> için Madde {result.article} bilgi tabanında yer almıyor. Resmî metin için Resmî Gazete veya mevzuat portallarını kullanın.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
