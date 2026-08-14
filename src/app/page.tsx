import Link from 'next/link'
import { PrySightLogo, PrySightMark } from '@/components/PrySightLogo'

const capabilities = [
  ['Concurrenten volgen', 'Monitor prijs, voorraad en beweging per product en markt.'],
  ['Prijspositie begrijpen', 'Zie direct waar uw prijs staat ten opzichte van de markt.'],
  ['Marge-kansen vinden', 'Vertaal prijsverschillen naar concrete commerciële ruimte.'],
]

const workflow = [
  ['01', 'Connect', 'Koppel feeds, Syntrx of eigen databronnen.'],
  ['02', 'Monitor', 'Volg prijzen en concurrentiebewegingen continu.'],
  ['03', 'Analyse', 'Combineer marktpositie, matches en prijshistorie.'],
  ['04', 'Act', 'Gebruik prijsadvies als onderbouwde volgende stap.'],
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <PrySightLogo />
          <nav className="hidden items-center gap-7 text-[12px] font-medium text-[#4c566b] md:flex">
            <a href="#platform">Platform</a><a href="#workflow">Werkwijze</a><a href="#brand">Waarom PrySight</a>
          </nav>
          <Link href="/dashboard" className="focus-ring rounded-xl bg-[var(--brand-blue)] px-4 py-2.5 text-[11px] font-semibold text-white shadow-[0_8px_22px_rgba(65,105,201,0.16)]">Open PrySight</Link>
        </div>
      </header>

      <section className="overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fd_100%)]">
        <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe4f5] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-mint)]" />Pricing intelligence platform</div>
            <h1 className="mt-7 text-[44px] font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--brand-navy)] sm:text-[58px]">See the market.<br/><span className="text-[var(--brand-blue)]">Price with confidence.</span></h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#667085]">PrySight brengt concurrentieprijzen, marktpositie, productmatches en marge-kansen samen in één rustige werkruimte voor betere prijsbeslissingen.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/dashboard" className="focus-ring rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white">Verken het platform</Link><a href="#workflow" className="focus-ring rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">Bekijk de werkwijze</a></div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-medium text-[#758097]"><span>Realtime prijsmonitoring</span><span>Concurrentieanalyse</span><span>Prijsadvies</span></div>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-16 h-36 w-36 rounded-full bg-[#dff5ef] blur-3xl" />
            <div className="absolute -right-10 -top-8 h-44 w-44 rounded-full bg-[#e8e7f7] blur-3xl" />
            <div className="relative rounded-[26px] border border-[var(--border)] bg-white p-4 shadow-[0_28px_80px_rgba(15,24,51,0.10)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-4"><div className="flex items-center gap-2.5"><PrySightMark className="h-8 w-8" /><div><p className="text-[12px] font-semibold text-[var(--brand-navy)]">Market overview</p><p className="text-[9px] text-[#8a94a6]">Pricing position at a glance</p></div></div><span className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[9px] text-[#748096]">Last 30 days</span></div>
              <div className="mt-4 grid grid-cols-3 gap-3">{[['1.248','Products tracked'],['47','Margin opportunities'],['3.2 / 10','Avg. price position']].map(([value,label]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--brand-navy)]">{value}</p><p className="mt-1 text-[8px] leading-4 text-[#7d8799]">{label}</p></div>)}</div>
              <div className="mt-3 rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-[var(--brand-navy)]">Price trend</p><div className="flex gap-3 text-[8px] text-[#8590a3]"><span>● Your price</span><span className="text-[var(--brand-cyan)]">● Market avg.</span></div></div><svg viewBox="0 0 480 160" className="mt-4 w-full" aria-hidden="true"><path d="M10 138H470M10 100H470M10 62H470M10 24H470" stroke="#e7ebf2" strokeWidth="1"/><path d="M12 126 76 91 140 105 205 66 270 82 336 48 402 58 468 34" fill="none" stroke="#4169C9" strokeWidth="3" strokeLinecap="round"/><path d="M12 145 76 124 140 132 205 108 270 115 336 91 402 98 468 80" fill="none" stroke="#69C5C2" strokeWidth="2.5" strokeLinecap="round"/></svg></div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20"><p className="eyebrow">Platform</p><h2 className="mt-3 max-w-2xl text-[30px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">Van marktdata naar een concrete prijsbeslissing</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{capabilities.map(([title,description],index) => <article key={title} className="surface-card p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-blue-soft)] text-[12px] font-semibold text-[var(--brand-blue)]">0{index+1}</span><h3 className="mt-5 text-[14px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-2 text-[12px] leading-6 text-[#748096]">{description}</p></article>)}</div></section>

      <section id="workflow" className="border-y border-[var(--border)] bg-[var(--surface-soft)]"><div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20"><p className="eyebrow">Workflow</p><h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">Connect. Monitor. Analyse. Act.</h2><div className="mt-9 grid gap-3 lg:grid-cols-4">{workflow.map(([num,title,description]) => <div key={num} className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-[10px] font-semibold text-[var(--brand-blue)]">{num}</p><h3 className="mt-3 text-[14px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">{description}</p></div>)}</div></div></section>

      <section id="brand" className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center"><div><PrySightMark className="h-14 w-14" /><h2 className="mt-5 text-[30px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">Calm interface. Sharp decisions.</h2><p className="mt-4 text-[13px] leading-6 text-[#748096]">De PrySight huisstijl gebruikt bewust rustige navy- en blauwtinten. Kleur ondersteunt data en status, zodat de prijsinformatie zelf centraal blijft staan.</p></div><div className="grid gap-3 sm:grid-cols-2"><div className="surface-card p-5"><p className="text-[11px] font-semibold text-[var(--brand-navy)]">Duidelijkheid boven decoratie</p><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">Dunne lijnen, veel witruimte en consistente informatiehiërarchie.</p></div><div className="surface-card p-5"><p className="text-[11px] font-semibold text-[var(--brand-navy)]">Kleur met betekenis</p><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">Blauw voor actie, mint voor kansen, amber voor aandacht en coral alleen voor fouten.</p></div></div></section>

      <footer className="border-t border-[var(--border)] bg-[var(--brand-navy)]"><div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-white sm:px-8 md:flex-row md:items-center md:justify-between"><div><p className="text-[18px] font-semibold">PrySight</p><p className="mt-1 text-[9px] uppercase tracking-[0.18em] text-[#bdc8da]">Pricing Intelligence</p></div><p className="text-[10px] text-[#aeb9cb]">See the market. Price with confidence.</p></div></footer>
    </main>
  )
}
