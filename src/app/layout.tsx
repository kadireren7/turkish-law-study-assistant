import type { Metadata } from 'next'
import './globals.css'
import { ClientPersistenceInit } from '@/components/ClientPersistenceInit'
import { Sidebar } from '@/components/Sidebar'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'Hukuk Çalışma | Akıllı Hukuk Platformu',
  description: 'Türk hukuku için premium çalışma platformu. Olay çözme, madde arama, pratik soru ve sohbet ile sınav hazırlığı.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg' }],
  },
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning className="light">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('hukuk-theme');if(t==='dark')document.documentElement.classList.add('dark');else if(t==='light')document.documentElement.classList.remove('dark');else if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body className="h-full min-h-0 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 antialiased font-sans transition-colors duration-200">
        <ThemeProvider>
          <ClientPersistenceInit />
          <div className="flex h-full min-h-0">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-0 min-w-0 pt-14 md:pt-0 overflow-y-auto overflow-x-hidden">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
