import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Engels Group pricing intelligence',
  description: 'Prijsmonitoring, concurrentie-intelligentie en prijsadvies voor Engels Group.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex min-h-screen">
          <div className="hidden lg:block lg:w-[272px] lg:flex-none"><div className="fixed inset-y-0 w-[272px]"><Sidebar /></div></div>
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <header className="border-b border-[var(--border)] bg-white px-5 py-4 lg:hidden"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#98a2b3]">Engels Group</p><h1 className="mt-1 text-lg font-semibold text-[#171b28]">Pricing intelligence</h1></header>
            <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 2xl:px-10"><div className="mx-auto w-full max-w-[1680px]">{children}</div></main>
          </div>
        </div>
      </body>
    </html>
  )
}
