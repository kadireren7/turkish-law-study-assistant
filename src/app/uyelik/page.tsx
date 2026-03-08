'use client'

import Link from 'next/link'

const PLANS = [
  {
    id: 'free',
    name: 'Ücretsiz',
    price: '0',
    period: 'ay',
    description: 'Temel çalışma araçlarıyla tanışın.',
    features: [
      'Günlük sınırlı kullanım',
      'Sohbet ile soru-cevap',
      'Madde arama (TCK, TBK, TMK, Anayasa)',
      'Olay analizi (temel)',
      'Sınav pratiği (sınırlı soru)',
    ],
    cta: 'Ücretsiz başla',
    href: '/sohbet',
    highlighted: false,
  },
  {
    id: 'standart',
    name: 'Standart',
    price: '49',
    period: 'ay',
    description: 'Düzenli çalışan öğrenciler için.',
    features: [
      'Günlük kullanım hakkı',
      'Dilekçe oluşturma aracı',
      'UYAP uyumlu çıktı',
      'Karar arama (Yargıtay / AYM özet)',
      'Literatür arama',
      'Sınırsız olay sorusu üretimi',
      'Pratik Çöz modu',
    ],
    cta: 'Standart seç',
    href: '/sohbet',
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99',
    period: 'ay',
    description: 'Derin araştırma ve sınav odaklı hazırlık.',
    features: [
      'Standart planın tüm özellikleri',
      'Derin araştırma modu',
      'Öğretide farklı görüşler / tartışmalar',
      'UYAP uyumlu dilekçe şablonu',
      'Resmî başvuru dili çıktısı',
      'Öncelikli destek',
      'Sınav modu (zamanlı pratik)',
    ],
    cta: 'Pro\'ya geç',
    href: '/sohbet',
    highlighted: false,
  },
]

export default function UyelikPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/90">
      <header className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 sm:px-6 py-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800">Üyelik planları</h1>
        <p className="text-slate-500 mt-1 text-sm max-w-xl">
          İhtiyacınıza uygun planı seçin. Tüm planlar Türk hukuku öğrencileri için tasarlandı.
        </p>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${
                  plan.highlighted
                    ? 'border-teal-400 ring-2 ring-teal-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-teal-600 text-white text-xs font-medium">
                    Önerilen
                  </div>
                )}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">{plan.name}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-800">{plan.price} ₺</span>
                    <span className="text-slate-500 text-sm">/ {plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="shrink-0 mt-0.5 text-teal-600" aria-hidden>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`btn-primary block w-full py-3 px-4 text-center text-sm font-medium rounded-xl transition-all ${
                    plan.highlighted
                      ? 'gradient-teal text-white shadow-sm hover:shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 max-w-lg mx-auto">
            Ödeme entegrasyonu bu aşamada simüle edilmiştir. Tüm özellikler demo amaçlı kullanılabilir.
          </p>
        </div>
      </div>
    </div>
  )
}
