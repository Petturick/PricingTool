'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/app/actions/authActions'
import { cn } from '@/lib/format'
import { roleLabel, type AppRole } from '@/lib/roles'

type IconName = 'dashboard' | 'products' | 'competitors' | 'matches' | 'alerts' | 'strategy' | 'reports' | 'feeds' | 'import' | 'integrations' | 'settings'

type SidebarUser = {
  name?: string | null
  email?: string | null
  role?: AppRole | null
}

const groups: Array<{ label: string; items: Array<{ href: string; label: string; icon: IconName }> }> = [
  { label: 'Prijsmonitoring', items: [
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/producten', label: 'Producten', icon: 'products' },
    { href: '/concurrenten', label: 'Concurrenten', icon: 'competitors' },
  ] },
  { label: 'Analyse en actie', items: [
    { href: '/productmatches', label: 'Productmatches', icon: 'matches' },
    { href: '/waarschuwingen', label: 'Waarschuwingen', icon: 'alerts' },
    { href: '/prijsstrategie', label: 'Prijsstrategie', icon: 'strategy' },
    { href: '/rapportages', label: 'Rapportages', icon: 'reports' },
  ] },
  { label: 'Data en beheer', items: [
    { href: '/feeds', label: 'Feeds', icon: 'feeds' },
    { href: '/import', label: 'Import', icon: 'import' },
    { href: '/integraties', label: 'Integraties', icon: 'integrations' },
    { href: '/beheer', label: 'Beheer', icon: 'settings' },
  ] },
]

function NavIcon({ name }: { name: IconName }) {
  const common = 'h-[18px] w-[18px]'
  if (name === 'dashboard') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>
  if (name === 'products') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m4 7 8-4 8 4-8 4-8-4Z" /><path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" /></svg>
  if (name === 'competitors') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3.5 19c.6-3.1 2.5-5 5.5-5s5 1.9 5.5 5M14.5 15c2.7.1 4.4 1.5 5 4" /></svg>
  if (name === 'matches') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9.5 7H7a4 4 0 0 0 0 8h2.5M14.5 7H17a4 4 0 1 1 0 8h-2.5M8.5 12h7" /></svg>
  if (name === 'alerts') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 9a6 6 0 0 1 12 0c0 6 2 6 2 8H4c0-2 2-2 2-8Z" /><path d="M10 20h4" /></svg>
  if (name === 'strategy') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 18V6M4 18h16" /><path d="m7 15 4-4 3 2 5-6" /></svg>
  if (name === 'reports') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6M9 7h3" /></svg>
  if (name === 'feeds') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 18a1 1 0 1 0 0 .01M4 11a9 9 0 0 1 9 9M4 5a15 15 0 0 1 15 15" /><path d="M14 6h5v5" /></svg>
  if (name === 'import') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 14v6h14v-6" /></svg>
  if (name === 'integrations') return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 7V3M16 7V3M7 7h10v4a5 5 0 0 1-5 5v5" /><path d="M9 21h6" /></svg>
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.7 1L5 6 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.5-1a8 8 0 0 0 1.7 1l.3 3h5l.3-3a8 8 0 0 0 1.7-1l2.5 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z" /></svg>
}

export function Sidebar({ user }: { user?: SidebarUser | null }) {
  const pathname = usePathname()
  const initials = user?.name?.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'U'

  return (
    <aside className="flex h-full w-full max-w-[272px] flex-col border-r border-[var(--border)] bg-white text-[#202536]">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 17 9 12l3 3 7-8" /><path d="M15 7h4v4" /></svg></div>
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a94a6]">Engels Group</p><h1 className="mt-0.5 text-[17px] font-semibold tracking-[-0.01em] text-[#171b28]">PrySight</h1></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex === 0 ? '' : 'mt-6'}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98a2b3]">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return <Link key={item.href} href={item.href} className={cn('focus-ring flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-medium text-[#596174] transition-colors hover:bg-[#f8f9fc] hover:text-[#202536]', active && 'border-[#ffd7dd] bg-[var(--accent-soft)] text-[var(--accent)]')}><span className={cn('text-[#8b95a7]', active && 'text-[var(--accent)]')}><NavIcon name={item.icon} /></span><span>{item.label}</span></Link>
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        {user ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[#fbfcfe] p-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef1f6] text-xs font-bold text-[#4b5565]">{initials}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#303647]">{user.name || user.email}</p>
                <p className="mt-0.5 truncate text-[11px] text-[#7b8497]">{roleLabel(user.role)}</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-3">
              <button type="submit" className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs font-semibold text-[#596174] transition hover:bg-[#f5f7fa] hover:text-[#202536]">Uitloggen</button>
            </form>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
