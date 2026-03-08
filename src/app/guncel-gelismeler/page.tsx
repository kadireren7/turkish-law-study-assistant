import Link from 'next/link'
import { getGuncelGelismeler } from '@/lib/guncel-gelismeler'

export const dynamic = 'force-dynamic'

export default async function GuncelGelismelerPage() {
  const data = await getGuncelGelismeler()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80 dark:bg-slate-900/95 transition-colors">
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Güncel Hukuk Gelişmeleri</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Son mevzuat değişiklikleri ve önemli kararlar — ders ve sınav hazırlığınız için özet bilgi.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300"
          >
            ← Ana sayfa
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-10">
        {data.sonGuncelleme && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Veriler son güncellendi: {data.sonGuncelleme}. Resmî ve güncel metin için Resmî Gazete ve ilgili mahkeme kaynaklarını kullanınız.
          </p>
        )}

        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Son mevzuat değişiklikleri</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Kanun ve mevzuatta yerel bilgi tabanına yansıyan, otomatik çekilen (Mevzuat.Net RSS) veya manuel eklenen değişiklik özetleri. Sınavda güncel metin sorulabileceği için takip etmeniz faydalıdır.
          </p>
          {data.mevzuatDegisiklikleri.length === 0 ? (
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
              Şu an listelenecek mevzuat değişikliği yok. Otomatik çekim için <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run amendments:fetch</code> ardından <code className="text-xs bg-slate-200 dark:bg-slate-700 px-1 rounded">npm run legal:update</code> çalıştırılabilir; yoksa Resmî Gazete özetleri manuel eklenebilir.
            </div>
          ) : (
            <ul className="space-y-4">
              {data.mevzuatDegisiklikleri.map((m, i) => (
                <li key={i} className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{m.baslik}</h3>
                  {m.tarih && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.tarih}</p>
                  )}
                  {m.degisenMaddeler && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Değişen maddeler:</span> {m.degisenMaddeler}
                    </p>
                  )}
                  {m.ozet && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{m.ozet}</p>
                  )}
                  {m.kaynak && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Kaynak: {m.kaynak}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-400">Öğrenci için neden önemli?</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{m.ogrenciIcinOnem}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">Önemli yeni kararlar</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Yargıtay ve Anayasa Mahkemesi başta olmak üzere, ders konularıyla ilişkili önemli içtihat özetleri. Sınav ve vaka çözümlerinde emsal olarak karşınıza çıkabilir.
          </p>
          {data.onemliKararlar.length === 0 ? (
            <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm">
              Şu an listelenecek karar özeti yok. Güncel gelişmeler (Yargıtay / AYM karar özetleri) yönetici tarafından eklenebilir.
            </div>
          ) : (
            <ul className="space-y-4">
              {data.onemliKararlar.map((k, i) => (
                <li key={i} className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{k.baslik}</h3>
                  {k.tarih && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{k.tarih}</p>
                  )}
                  {k.konu && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                      <span className="font-medium text-slate-600 dark:text-slate-400">Konu:</span> {k.konu}
                    </p>
                  )}
                  {k.ozet && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{k.ozet}</p>
                  )}
                  {k.kaynak && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Kaynak: {k.kaynak}</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-400">Öğrenci için neden önemli?</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{k.ogrenciIcinOnem}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="p-4 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300">
          <p className="font-medium text-slate-800 dark:text-slate-100">Not</p>
          <p className="mt-1">
            Bu sayfa eğitim amaçlı özet bilgi sunar. Kesin ve güncel metin için Resmî Gazete, mevzuat portalları ve mahkeme karar veritabanlarını kullanınız.
          </p>
        </section>
      </main>
    </div>
  )
}
