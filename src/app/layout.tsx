import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Hukuk Çalışma Asistanı',
  description: 'Türk hukuku öğrencileri için ders ve sınav çalışma asistanı. Sohbet, madde arama, olay analizi, sınav pratiği.',
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
