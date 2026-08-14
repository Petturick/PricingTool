import { cn } from '@/lib/format'

export function PrySightMark({ className = '' }: { className?: string }) {
  return (
    <svg className={cn('shrink-0', className)} viewBox="0 0 64 64" role="img" aria-label="PrySight">
      <defs>
        <linearGradient id="prysightMarkGradient" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C8FDB" />
          <stop offset="1" stopColor="#7E77C8" />
        </linearGradient>
      </defs>
      <path d="M10 13.5C10 9.36 13.36 6 17.5 6H43c2.2 0 4.22.96 5.6 2.64l6.11 7.46a7.5 7.5 0 0 1 1.69 4.7v25.7A7.5 7.5 0 0 1 48.9 54H17.5A7.5 7.5 0 0 1 10 46.5v-33Z" fill="url(#prysightMarkGradient)" />
      <circle cx="43.5" cy="17" r="4" fill="white" fillOpacity=".92" />
      <path d="M17 41.5 25.5 33l6.7 5.7L45.5 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m40.2 24 5.8-.4-.6 5.7" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 46v-5M28 46v-8M36 46V34M44 46V29" stroke="#62C7A6" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M8.5 48.5c10.5 7 33.8 7.9 47 0" fill="none" stroke="#69C5C2" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function PrySightLogo({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="PrySight Pricing Intelligence">
      <PrySightMark className={compact ? 'h-8 w-8' : 'h-10 w-10'} />
      <div className="min-w-0">
        <div className={cn('font-semibold tracking-[-0.035em] text-[var(--brand-navy)]', compact ? 'text-[17px]' : 'text-[20px]')}>PrySight</div>
        {!compact && <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Pricing Intelligence</div>}
      </div>
    </div>
  )
}
