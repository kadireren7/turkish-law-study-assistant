'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { searchLawArticle, type LawSearchResult, type WebSearchItem } from '@/lib/api'
import { parseLawQuery, buildRelatedArticleQueries } from '@/lib/law-search-query'
import { highlightLawReferencesHtml } from '@/lib/search/highlightHtml'
import { loadRecentLawQueries, pushRecentLawQuery } from '@/lib/search/recentLawQueries'
import { ApiLoading } from '@/components/ui/ApiLoading'
import { ApiErrorBox } from '@/components/ui/ApiErrorBox'

const QUICK = ['TBK 2', 'TCK 81', 'Anayasa 10', 'CMK 90', 'HMK 119'] as const
const DEBOUNCE_MS = 420

function ResultBlock({ title, children, html }: { title: string; children?: React.ReactNode; html?: string }) {
  if (!children && !html) return null
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-card-hover dark:border-slate-700 dark:bg-slate-800 dark:shadow-card-dark dark:hover:shadow-card-hover-dark">
      <h4 className="mb-2 text-sm font-semibold text-teal-700 dark:text-teal-400">{title}</h4>
      {html ? (
        <div
          className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 [&_mark]:rounded [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">{children}</div>
      )}
    </div>
  )
}

export default function LawSearchPage() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [result, setResult] = useState<LawSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    setRecent(loadRecentLawQueries())
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setResult(null)
    try {
      const data = await searchLawArticle(trimmed, ac.signal)
      if (ac.signal.aborted) return
      setResult(data)
      if (data.found || data.message) pushRecentLawQuery(trimmed)
      setRecent(loadRecentLawQueries())
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
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
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = debounced.trim()
    if (t.length < 4) return
    if (!parseLawQuery(t)) return
    void runSearch(t)
  }, [debounced, runSearch])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    await runSearch(query)
  }

  const related =
    result?.found && result.lawCode && result.article
      ? buildRelatedArticleQueries(result.lawCode, result.article, 3)
      : []

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/80 transition-colors dark:bg-slate-900/95">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:px-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Madde Ara</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          Kanun ve madde numarası yazın; tanınan sorgularda arama gecikmeli olarak da başlar (ör. TBK 2).
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={handleSearch} className="animate-fade-in-up mx-auto max-w-2xl">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Örn. tbk 2, TCK m.81, Anayasa 10"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
              disabled={loading}
              aria-label="Madde veya kanun ara"
              aria-busy={loading}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="min-h-[48px] shrink-0 rounded-xl bg-teal-600 px-6 py-3 font-medium text-white shadow-sm transition-all duration-200 hover:bg-teal-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-teal-500 dark:hover:bg-teal-600"
              aria-label={loading ? 'Aranıyor' : 'Ara'}
            >
              {loading ? 'Aranıyor...' : 'Ara'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="w-full text-xs font-medium text-slate-500 dark:text-slate-400">Hızlı</span>
            {QUICK.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s)
                  void runSearch(s)
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {s}
              </button>
            ))}
          </div>
          {recent.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="w-full text-xs font-medium text-slate-500 dark:text-slate-400">Son aramalar</span>
              {recent.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s)
                    void runSearch(s)
                  }}
                  className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </form>

        {loading && (
          <div className="mx-auto mt-8 max-w-2xl">
            <ApiLoading message="Madde aranıyor…" />
          </div>
        )}

        {result && !loading && (
          <div className="animate-fade-in-up mx-auto mt-8 max-w-2xl space-y-4">
            {related.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/50">
                <span className="w-full text-xs font-medium text-slate-500 dark:text-slate-400">İlgili maddeler</span>
                {related.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s)
                      void runSearch(s)
                    }}
                    className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {result.message && !result.found && !result.webResults?.length && (
              <ApiErrorBox message={result.message} onRetry={() => setResult(null)} />
            )}
            {result.found && (
              <>
                {result.maddeBasligi != null && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 dark:shadow-card-dark">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {result.lawLabel} · Madde {result.article}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-slate-100">{result.maddeBasligi}</h3>
                  </div>
                )}

                <ResultBlock
                  title="Madde metni"
                  html={result.maddeMetni ? highlightLawReferencesHtml(result.maddeMetni) : undefined}
                />
                <ResultBlock title="Basit açıklama">{result.basitAciklama}</ResultBlock>
                <ResultBlock title="Bu maddenin amacı">{result.maddeninAmaci}</ResultBlock>
                <ResultBlock title="Kısa örnek">{result.kisaOrnek}</ResultBlock>
                <ResultBlock title="Sınavda dikkat">{result.sinavdaDikkat}</ResultBlock>

                {result.guncellikNotu && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Güncellik notu:</span> {result.guncellikNotu}
                  </div>
                )}
                {result.fromWeb && result.webResults && result.webResults.length > 0 && (
                  <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                    <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400">
                      Kaynaklar (isteğe bağlı)
                    </summary>
                    <ul className="mt-3 space-y-2 text-sm">
                      {result.webResults.map((r: WebSearchItem, i: number) => (
                        <li key={i}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:underline dark:text-teal-400"
                          >
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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <p>
                  <strong className="text-slate-700 dark:text-slate-200">{result.lawLabel}</strong> için Madde {result.article}{' '}
                  bilgi tabanında yer almıyor. Resmî metin için Resmî Gazete veya mevzuat portallarını kullanın.
                </p>
              </div>
            )}

            {!result.found && result.webResults && result.webResults.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-700 dark:bg-slate-800 dark:shadow-card-dark">
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                  Yerel veritabanında bu madde yok; web kaynaklarından özet şu an derlenemedi. Aşağıdaki linklerden resmî metni
                  kontrol edebilirsiniz.
                </p>
                <ul className="space-y-2">
                  {result.webResults.map((r: WebSearchItem, i: number) => (
                    <li key={i}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-teal-700 hover:underline dark:text-teal-300"
                      >
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
