'use client'

import Link from 'next/link'

const studyCards = [
  {
    href: '/sohbet',
    title: 'Sohbet ile Çalış',
    description: 'Konu sorun, tanım ve madde bazlı yanıtlar alın.',
    icon: '💬',
  },
  {
    href: '/law-search',
    title: 'Madde Ara',
    description: 'TCK, TMK, TBK, Anayasa veya İdare madde metnini bulun.',
    icon: '🔍',
  },
  {
    href: '/case-solver',
    title: 'Olay Analizi Yap',
    description: 'Vakayı yapıştırın, hukuki analiz ve sonuç alın.',
    icon: '⚖️',
  },
  {
    href: '/exam-practice',
    title: 'Sınav Pratiği',
    description: 'Açık uçlu soru çözün, puan ve geri bildirim alın.',
    icon: '📋',
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80">
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 text-center tracking-tight max-w-xl">
          Hukuk öğrencileri için çalışma asistanı
        </h1>
        <p className="text-slate-500 text-center mt-3 max-w-md">
          Ders ve sınav hazırlığınızda yanınızda. Sohbet edin, madde arayın, olay çözün, pratik yapın.
        </p>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl">
          {studyCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-teal-200 hover:shadow-md transition-all duration-200 text-left"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600 text-2xl group-hover:bg-teal-100 transition-colors">
                {card.icon}
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-800">
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {card.description}
              </p>
              <span className="mt-4 text-sm font-medium text-teal-600 group-hover:text-teal-700">
                Başla →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <footer className="shrink-0 py-6 text-center">
        <p className="text-xs text-slate-400">
          Bu platform yalnızca eğitim amaçlıdır.
        </p>
      </footer>
    </div>
  )
}
