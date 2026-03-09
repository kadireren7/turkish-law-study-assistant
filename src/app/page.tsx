'use client'

import Link from 'next/link'
import { StudySummary } from '@/components/StudySummary'

const features = [
  {
    href: '/sohbet',
    title: 'Sohbet',
    description: 'Olay çözün, kavram karşılaştırın; takip soruları ve mini pratikle çalışma ortağı gibi yanıt alın.',
    icon: '💬',
    delay: 0,
  },
  {
    href: '/law-search',
    title: 'Madde Ara',
    description: 'TCK, TMK, TBK, Anayasa, CMK, HMK madde metni ve kısa açıklama.',
    icon: '🔍',
    delay: 50,
  },
  {
    href: '/case-solver',
    title: 'Olay Analizi',
    description: 'Vakayı yazın; olay özeti, hukuki sorun, maddeler ve sınavda nasıl yazılır örneği.',
    icon: '⚖️',
    delay: 100,
  },
  {
    href: '/karar-analizi',
    title: 'Karar Analizi',
    description: 'Mahkeme kararı veya özetini yapıştırın; özet, olay, hukuki sorun, dayanılan kurallar ve sınavda kullanımı.',
    icon: '📋',
    delay: 125,
  },
  {
    href: '/mini-sozlu',
    title: 'Mini Sözlü Yoklama',
    description: 'Hoca gibi kısa sözlü sorular; cevaba göre düzeltme ve sonraki soru. Final ve sözlü sınav hazırlığı.',
    icon: '🎤',
    delay: 132,
  },
  {
    href: '/pratik-coz',
    title: 'Sınav Pratiği',
    description: 'Olay sorusu oluşturup cevabınızı yazın; puan ve detaylı geri bildirim alın.',
    icon: '✏️',
    delay: 150,
  },
  {
    href: '/haberler',
    title: 'Haberler',
    description: 'Hukuk haberleri ve mevzuat gündemi ile güncel kalın.',
    icon: '📰',
    delay: 200,
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col min-h-0 bg-slate-50/90 dark:bg-slate-900/95 transition-colors">
      <div className="flex-1 px-4 sm:px-6 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 text-center tracking-tight animate-fade-in-up">
            Türk hukuku için akıllı çalışma platformu
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mt-4 max-w-xl mx-auto text-lg animate-fade-in-up" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
            Olay çözme, madde arama, pratik soru çözümü ve sohbet ile ders ve sınav hazırlığınızı güçlendirin.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((card, i) => (
              <Link
                key={card.href}
                href={card.href}
                className="card-premium flex flex-col p-6 text-left group animate-fade-in-up hover:border-teal-200/80 dark:hover:border-teal-500/40"
                style={{ animationDelay: `${card.delay}ms`, animationFillMode: 'backwards' }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/20 dark:to-emerald-500/20 text-teal-600 dark:text-teal-400 text-2xl group-hover:from-teal-100 group-hover:to-emerald-100 dark:group-hover:from-teal-500/30 dark:group-hover:to-emerald-500/30 transition-all duration-250">
                  {card.icon}
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-800 dark:group-hover:text-teal-300 transition-colors">
                  {card.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {card.description}
                </p>
                <span className="mt-4 text-sm font-medium text-teal-600 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-300 flex items-center gap-1 transition-colors">
                  Başla
                  <span className="inline-block group-hover:translate-x-0.5 transition-transform">→</span>
                </span>
              </Link>
            ))}
          </div>

          <StudySummary variant="compact" />

          <section className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
              Olay çözme, issue spotting, sınav mantığı ve karşılaştırmalı düşünmeyi tek platformda bir araya getiriyoruz.
            </p>
          </section>
        </div>
      </div>

      <footer className="shrink-0 py-8 text-center border-t border-slate-200/80 dark:border-slate-700/80 bg-white/50 dark:bg-slate-800/30 transition-colors">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Bu platform yalnızca eğitim amaçlıdır; hukuki danışmanlık değildir.
        </p>
      </footer>
    </div>
  )
}
