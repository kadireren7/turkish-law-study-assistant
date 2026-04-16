import Link from 'next/link'
import { getHaberlerPageData } from '@/lib/haberler'
import type { HaberItem } from '@/lib/haberler'
import { SitePageSurface } from '@/components/layout/SitePageSurface'
import { HaberlerAutoUpdate } from './HaberlerAutoUpdate'
import { HaberlerNewsControls } from './HaberlerNewsControls'

export const dynamic = 'force-dynamic'

function formatTarih(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso.slice(0, 10)).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function formatTarihKisa(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso.slice(0, 10)).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function HaberCard({ item }: { item: HaberItem }) {
  const hasImage = item.imageUrl && item.imageUrl.trim().length > 0
  const content = (
    <>
      {/* Büyük kapak görseli */}
      <div className="relative w-full aspect-[16/9] bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-700">
            <span className="text-5xl opacity-40" aria-hidden>📰</span>
          </div>
        )}
        {/* Kategori çipi görselin üzerinde */}
        {item.kategori && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 shadow-sm backdrop-blur-sm">
            {item.kategori}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 min-h-0">
        {/* Kaynak ve tarih satırı */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
          {item.kaynak && (
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.kaynak}</span>
          )}
          {item.tarih && (
            <span className="text-slate-400 dark:text-slate-500">{formatTarihKisa(item.tarih)}</span>
          )}
        </div>

        {/* Güçlü başlık */}
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight mt-0 mb-3 line-clamp-3 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
          {item.baslik}
        </h3>

        {/* Kısa özet */}
        {item.kisaOzet && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 flex-1">
            {item.kisaOzet}
          </p>
        )}
      </div>
    </>
  )

  const cardClass =
    'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/85 bg-white/95 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-500/20 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/75 dark:hover:border-slate-600'

  if (item.link && item.link.trim()) {
    return (
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {content}
      </a>
    )
  }
  return <article className={cardClass}>{content}</article>
}

function SectionLabel({ isExample }: { isExample: boolean }) {
  if (!isExample) return null
  return (
    <p className="text-sm text-amber-800 bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-3 mb-6">
      Bu içerik örnek veridir; henüz gerçek güncel kaynaklardan çekilmemiştir.
    </p>
  )
}

export default async function HaberlerPage() {
  const data = await getHaberlerPageData()

  return (
    <SitePageSurface>
      <header className="shrink-0 border-b border-teal-500/15 bg-white/80 backdrop-blur-md dark:border-teal-500/10 dark:bg-slate-900/75">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Haberler
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Hukuk haberleri · En yeni önce · RSS ile birkaç saatte bir yenilenebilir
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <HaberlerNewsControls />
              <Link
                href="/"
                className="inline-flex shrink-0 items-center justify-center text-sm font-medium text-teal-600 transition-colors hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
              >
                ← Ana sayfa
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200/80 py-3 text-xs text-slate-500 dark:border-slate-800 sm:text-sm dark:text-slate-400">
            <span>
              Bugün: <strong className="text-slate-700 dark:text-slate-300">{data.currentDateFormatted}</strong>
            </span>
            {data.lastSuccessfulUpdate ? (
              <span>Son güncelleme: {formatTarihKisa(data.lastSuccessfulUpdate.slice(0, 10))}</span>
            ) : null}
            <HaberlerAutoUpdate lastSuccessfulUpdate={data.lastSuccessfulUpdate} />
            {!data.hasRealUpdate && (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Henüz canlı veri güncellemesi yapılmadı
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Hukuk Haberleri */}
        <section className="mb-14 sm:mb-16">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              Hukuk Haberleri
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Resmî ve hukuki kaynaklara dayalı güncel gelişmeler
            </p>
          </div>
          <SectionLabel isExample={data.hukukMeta.isExampleData} />
          {data.hukukHaberleri.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300/90 bg-white/80 p-8 text-center text-sm text-slate-600 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
              Listelenecek hukuk haberi yok.{' '}
              <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">npm run news:update:law</code> ile güncelleyebilirsiniz.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 list-none p-0 m-0">
              {data.hukukHaberleri.map((item, i) => (
                <li key={i}>
                  <HaberCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Veri kaynağı */}
        <section className="mt-12 rounded-2xl border border-teal-500/15 bg-white/70 p-5 text-sm text-slate-700 backdrop-blur-sm dark:border-teal-500/10 dark:bg-slate-900/60 dark:text-slate-300">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Veri kaynağı</p>
          <p className="mt-1.5">
            Hukuk haberleri RSS ile çekilir; sayfa açılışında veri yaklaşık 45 dakikadan eskiyse arka planda yenilenir. Sunucuda zamanlanmış görev için{' '}
            <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-xs dark:bg-slate-700">npm run daily:update</code> kullanılabilir.
          </p>
        </section>
      </main>
    </SitePageSurface>
  )
}
