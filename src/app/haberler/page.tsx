import Link from 'next/link'
import { getHaberlerPageData } from '@/lib/haberler'
import type { HaberItem } from '@/lib/haberler'
import { HaberlerAutoUpdate } from './HaberlerAutoUpdate'

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
      <div className="relative w-full aspect-[16/9] bg-slate-100 overflow-hidden shrink-0">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100">
            <span className="text-5xl opacity-40" aria-hidden>📰</span>
          </div>
        )}
        {/* Kategori çipi görselin üzerinde */}
        {item.kategori && (
          <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/95 text-slate-700 shadow-sm backdrop-blur-sm">
            {item.kategori}
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1 min-h-0">
        {/* Kaynak ve tarih satırı */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mb-3">
          {item.kaynak && (
            <span className="font-medium text-slate-600">{item.kaynak}</span>
          )}
          {item.tarih && (
            <span className="text-slate-400">{formatTarihKisa(item.tarih)}</span>
          )}
        </div>

        {/* Güçlü başlık */}
        <h3 className="text-xl font-bold text-slate-900 leading-tight tracking-tight mt-0 mb-3 line-clamp-3 group-hover:text-teal-700 transition-colors">
          {item.baslik}
        </h3>

        {/* Kısa özet */}
        {item.kisaOzet && (
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">
            {item.kisaOzet}
          </p>
        )}
      </div>
    </>
  )

  const cardClass =
    'group flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5'

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
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Üst bar: portal hissi */}
      <header className="shrink-0 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Haberler
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Hukuk haberleri ve siyaset / mevzuat gündemi · En yeni önce
              </p>
            </div>
            <Link
              href="/"
              className="shrink-0 inline-flex items-center text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            >
              ← Ana sayfa
            </Link>
          </div>
          {/* Tarih / güncelleme bilgisi */}
          <div className="flex flex-wrap items-center gap-4 py-3 border-t border-slate-100 text-xs sm:text-sm text-slate-500">
            <span>
              Bugün: <strong className="text-slate-700">{data.currentDateFormatted}</strong>
            </span>
            {data.lastSuccessfulUpdate ? (
              <span>Son güncelleme: {formatTarihKisa(data.lastSuccessfulUpdate.slice(0, 10))}</span>
            ) : null}
            <HaberlerAutoUpdate lastSuccessfulUpdate={data.lastSuccessfulUpdate} />
            {!data.hasRealUpdate && (
              <span className="text-amber-600 font-medium">
                Henüz canlı veri güncellemesi yapılmadı
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Hukuk Haberleri */}
        <section className="mb-14 sm:mb-16">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              Hukuk Haberleri
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Resmî ve hukuki kaynaklara dayalı güncel gelişmeler
            </p>
          </div>
          <SectionLabel isExample={data.hukukMeta.isExampleData} />
          {data.hukukHaberleri.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-600 text-sm">
              Listelenecek hukuk haberi yok.{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run news:update:law</code> ile güncelleyebilirsiniz.
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

        {/* Siyaset ve Mevzuat Gündemi */}
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
              Siyaset ve Mevzuat Gündemi
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Siyaset ve mevzuat odaklı gündem; güvenilir haber kaynakları
            </p>
          </div>
          <SectionLabel isExample={data.siyasetMeta.isExampleData} />
          {data.siyasetGundemi.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-600 text-sm">
              Listelenecek siyaset gündemi haberi yok.{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run news:update:politics</code> ile güncelleyebilirsiniz.
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 list-none p-0 m-0">
              {data.siyasetGundemi.map((item, i) => (
                <li key={i}>
                  <HaberCard item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Veri kaynağı */}
        <section className="mt-12 rounded-2xl bg-slate-100/80 border border-slate-200/80 p-5 text-sm text-slate-700">
          <p className="font-semibold text-slate-800">Veri kaynağı</p>
          <p className="mt-1.5">
            Hukuk haberleri resmî ve hukuki kaynaklara; siyaset gündemi güvenilir haber kaynaklarına öncelik verir. Canlı veri için <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-xs">npm run news:update</code> kullanın.
          </p>
        </section>
      </main>
    </div>
  )
}
