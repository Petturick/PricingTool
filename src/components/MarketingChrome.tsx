'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PrySightLogo } from '@/components/PrySightLogo'
import { cn } from '@/lib/format'

const navItems = [
  { href: '/', label: 'PrySight' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about-us', label: 'About us' },
]

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-white text-[var(--brand-navy)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link href="/" className="focus-ring rounded-xl" aria-label="PrySight home">
            <PrySightLogo />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Hoofdnavigatie">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'focus-ring rounded-lg px-1 py-2 text-[12px] font-semibold transition-colors hover:text-[var(--brand-blue)]',
                    active ? 'text-[var(--brand-blue)]' : 'text-[#5f6b80]',
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link href="/dashboard" className="focus-ring rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-2.5 text-[11px] font-semibold text-[var(--brand-navy)] transition-colors hover:border-[#b9c7df] hover:bg-[var(--surface-soft)] sm:px-4">
              Login
            </Link>
            <Link href="/request-demo" className="focus-ring rounded-xl bg-[var(--brand-blue)] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_22px_rgba(65,105,201,0.16)] transition-transform hover:-translate-y-0.5 sm:px-4">
              Request demo
            </Link>
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-5 pb-3 sm:px-8 lg:hidden" aria-label="Mobiele hoofdnavigatie">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors',
                  active ? 'bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]' : 'text-[#657187] hover:bg-[var(--surface-soft)]',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      {children}

      <footer className="border-t border-white/10 bg-[var(--brand-navy)] text-white">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <PrySightLogo className="[&_div]:text-white" />
            <p className="mt-4 max-w-md text-[11px] leading-6 text-[#b6c1d4]">Pricing intelligence voor teams die concurrentieprijzen, marktpositie en commerciële ruimte willen vertalen naar beter onderbouwde prijsbeslissingen.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-medium text-[#c7d0df] md:justify-end">
            {navItems.map((item) => <Link key={item.href} href={item.href} className="hover:text-white">{item.label}</Link>)}
          </div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-5 py-5 text-[9px] text-[#95a3ba] sm:px-8 md:flex-row md:items-center md:justify-between"><span>© 2026 PrySight</span><span>See the market. Price with confidence.</span></div></div>
      </footer>
    </div>
  )
}
