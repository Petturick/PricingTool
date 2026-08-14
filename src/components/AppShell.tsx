'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { PrySightLogo } from '@/components/PrySightLogo'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const marketing = pathname === '/'

  if (marketing) return <>{children}</>

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block lg:w-[272px] lg:flex-none"><div className="fixed inset-y-0 w-[272px]"><Sidebar /></div></div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="border-b border-[var(--border)] bg-white px-5 py-3.5 lg:hidden">
          <PrySightLogo compact />
        </header>
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7 2xl:px-10"><div className="mx-auto w-full max-w-[1680px]">{children}</div></main>
      </div>
    </div>
  )
}
