import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'
import './globals.css'


export const metadata: Metadata = {
  title: 'Engels Group prijsmonitoring',
  description: 'Dashboard voor prijsmonitoring en concurrentie-intelligentie van Engels Group.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-950">
        <div className="flex min-h-screen">
          <div className="hidden lg:block lg:w-72 lg:flex-none">
            <Sidebar />
          </div>
          <div className="flex min-h-screen flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white px-6 py-4 lg:hidden">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">Engels Group</p>
              <h1 className="text-xl font-semibold">Prijsmonitoring</h1>
            </header>
            <main className="flex-1 p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
