'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { sendExploreQuery, type ExploreResponse, type PoliticalHistoryMode } from '@/lib/api'

const MODE_LABELS: Record<ExploreResponse['mode'], string> = {
  law_search: 'Madde Arama',
  news: 'Güncel Gelişme',
  event_analysis: 'Olay Analizi',
  political_history: 'Siyasi Tarih',
}

const TAB_IDS = ['auto', 'news', 'history'] as const
type ExploreTab = (typeof TAB_IDS)[number]

const HISTORY_MODES: { id: PoliticalHistoryMode; label: string }[] = [
  { id: 'timeline', label: 'Zaman çizelgesi' },
  { id: 'cause_effect', label: 'Neden–sonuç' },
  { id: 'practice', label: 'Pratik' },
]

function dataRouteLabel(r?: string): string | null {
  if (r === 'local') return 'yerel veri'
  if (r === 'live') return 'canlı arama'
  if (r === 'static') return 'genel'
  return null
}

function KesfetPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<ExploreTab>('auto')
  const [historyMode, setHistoryMode] = useState<PoliticalHistoryMode>('timeline')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ExploreResponse | null>(null)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'news' || t === 'history') setTab(t)
    else setTab('auto')
  }, [searchParams])

  const setTabInUrl = useCallback(
    (next: ExploreTab) => {
      setTab(next)
      const q = new URLSearchParams(searchParams.toString())
      if (next === 'auto') q.delete('tab')
      else q.set('tab', next)
      router.replace(`/kesfet?${q.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      let data: ExploreResponse
      if (tab === 'news') {
        data = await sendExploreQuery(query, { forceMode: 'news' })
      } else if (tab === 'history') {
        data = await sendExploreQuery(query, { politicalHistoryMode: historyMode })
      } else {
        data = await sendExploreQuery(query)
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yanıt alınamadı.')
    } finally {
      setLoading(false)
    }
  }

  const placeholder =
    tab === 'news'
      ? 'Örn: Son yargı paketi / güncel mevzuat değişikliği…'
      : tab === 'history'
        ? 'Örn: 1961 ve 1982 anayasaları farkı / çok partili hayata geçiş…'
        : 'Örn: TCK 81 / Bu olayda hangi hukuki sorunlar var?'

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-[var(--background)]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-8 pb-12 md:pt-10">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Keşfet</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Madde arama, olay analizi, haber özeti ve siyasi tarih — tek akış; önce yerel veri, gerektiğinde canlı arama.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { id: 'auto' as const, label: 'Otomatik' },
              { id: 'news' as const, label: 'Haber / güncel' },
              { id: 'history' as const, label: 'Siyasi tarih' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTabInUrl(id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === id
                  ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
          <Link
            href="/haberler"
            className="rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
          >
            Haber listesi (RSS)
          </Link>
        </div>

        {tab === 'history' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {HISTORY_MODES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setHistoryMode(id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  historyMode === id
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              rows={4}
              disabled={loading}
              className="w-full rounded-2xl bg-transparent px-4 py-3 text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus:outline-none"
            />
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-500">
                Önce law-data; gerekirse kısa web; sonra özet.
              </span>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-sm font-medium disabled:opacity-40 shrink-0"
              >
                {loading ? 'Hazırlanıyor...' : 'Sor'}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        {result && (
          <section className="mt-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{result.structured.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                  {MODE_LABELS[result.mode]}
                </span>
                {result.dataRoute && dataRouteLabel(result.dataRoute) && (
                  <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                    {dataRouteLabel(result.dataRoute)}
                  </span>
                )}
                {result.freshnessClass && (
                  <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                    {result.freshnessClass === 'requires_live_data' ? 'güncellik: canlı' : 'güncellik: statik'}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{result.shortAnswer}</p>

            <ul className="mt-4 space-y-2">
              {result.structured.points.map((p, i) => (
                <li key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
                  {p}
                </li>
              ))}
            </ul>

            {result.structured.practicalNote && (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Pratik not:</span> {result.structured.practicalNote}
              </p>
            )}
            {result.uncertainty && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Belirsizlik:</span> {result.uncertainty}
              </p>
            )}
            {result.followUp && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">Devam:</span> {result.followUp}
              </p>
            )}
            {result.sources.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kaynaklar</p>
                <ul className="mt-1 space-y-1">
                  {result.sources.map((s, i) => (
                    <li key={`${s}-${i}`} className="text-xs text-slate-500 dark:text-slate-400 break-all">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">Yükleniyor…</div>}>
      <KesfetPageInner />
    </Suspense>
  )
}
