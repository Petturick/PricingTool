'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/format'

const items = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/producten', label: 'Producten' },
  { href: '/concurrenten', label: 'Concurrenten' },
  { href: '/productmatches', label: 'Productmatches' },
  { href: '/waarschuwingen', label: 'Waarschuwingen' },
  { href: '/rapportages', label: 'Rapportages' },
  { href: '/import', label: 'Import' },
  { href: '/beheer', label: 'Beheer' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-full max-w-72 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Engels Group</p>
        <h1 className="mt-2 text-xl font-semibold">Prijsmonitoring</h1>
        <p className="mt-2 text-sm text-slate-400">Concurrentie-intelligentie voor sales, inkoop en pricing.</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-slate-800 hover:text-white',
                active && 'bg-slate-800 text-white shadow-lg shadow-slate-950/20',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-slate-800 px-6 py-4 text-xs text-slate-400">
        Geoptimaliseerd voor wekelijkse prijsanalyses en signalering.
      </div>
    </aside>
  )
}
