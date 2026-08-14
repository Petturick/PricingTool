import Link from 'next/link'
import { MarketingChrome } from '@/components/MarketingChrome'
import { PrySightMark } from '@/components/PrySightLogo'

const highlights = [
  ['Market visibility', 'Zie hoe uw prijs zich verhoudt tot concurrenten, per product en markt.'],
  ['Margin signals', 'Vind commerciële ruimte zonder pricingbesluiten op onderbuikgevoel te baseren.'],
  ['Continuous monitoring', 'Volg prijsbewegingen, voorraad en brongezondheid vanuit één werkruimte.'],
]

export default function HomePage() {
  return (
    <MarketingChrome>
      <main>
        <section className="overflow-hidden border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)]">
          <div className="mx-auto grid max-w-[1240px] gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dbe4f5] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-mint)]" />Pricing intelligence platform</div>
              <h1 className="mt-7 text-[44px] font-semibold leading-[1.02] tracking-[-0.055em] text-[var(--brand-navy)] sm:text-[58px]">See the market.<br/><span className="text-[var(--brand-blue)]">Price with confidence.</span></h1>
              <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#667085]">PrySight brengt concurrentieprijzen, marktpositie, productmatches en marge-kansen samen in één rustige werkruimte voor beter onderbouwde prijsbeslissingen.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link href="/features" className="focus-ring rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white shadow-[0_10px_28px_rgba(65,105,201,0.18)]">Explore features</Link><Link href="/request-demo" className="focus-ring rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">Request demo</Link></div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-medium text-[#758097]"><span>Prijsmonitoring</span><span>Concurrentieanalyse</span><span>Prijsadvies</span><span>Feeds & integraties</span></div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-[#e2f4ef] blur-3xl" />
              <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full bg-[#ebe9f7] blur-3xl" />
              <div className="relative rounded-[26px] border border-[var(--border)] bg-white p-4 shadow-[0_30px_90px_rgba(15,24,51,0.11)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-4"><div className="flex items-center gap-2.5"><PrySightMark className="h-8 w-8" /><div><p className="text-[12px] font-semibold text-[var(--brand-navy)]">Market overview</p><p className="text-[9px] text-[#8a94a6]">Pricing position at a glance</p></div></div><span className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[9px] text-[#748096]">Last 30 days</span></div>
                <div className="mt-4 grid grid-cols-3 gap-3">{[['1.248','Products tracked'],['47','Margin opportunities'],['3.2 / 10','Avg. price position']].map(([value,label]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3"><p className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--brand-navy)]">{value}</p><p className="mt-1 text-[8px] leading-4 text-[#7d8799]">{label}</p></div>)}</div>
                <div className="mt-3 rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-[var(--brand-navy)]">Price trend</p><div className="flex gap-3 text-[8px] text-[#8590a3]"><span>● Your price</span><span className="text-[var(--brand-cyan)]">● Market avg.</span></div></div><svg viewBox="0 0 480 160" className="mt-4 w-full" aria-hidden="true"><path d="M10 138H470M10 100H470M10 62H470M10 24H470" stroke="#e7ebf2" strokeWidth="1"/><path d="M12 126 76 91 140 105 205 66 270 82 336 48 402 58 468 34" fill="none" stroke="#4169C9" strokeWidth="3" strokeLinecap="round"/><path d="M12 145 76 124 140 132 205 108 270 115 336 91 402 98 468 80" fill="none" stroke="#69C5C2" strokeWidth="2.5" strokeLinecap="round"/></svg></div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <p className="eyebrow">PrySight</p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><h2 className="text-[30px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">Pricing intelligence zonder ruis.</h2><p className="max-w-2xl text-[13px] leading-6 text-[#748096]">De interface volgt het PrySight-brandbook: navy en wit domineren, blauw stuurt actie, mint ondersteunt positieve signalen en coral blijft gereserveerd voor echte fouten.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">{highlights.map(([title,description],index) => <article key={title} className="surface-card p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-blue-soft)] text-[11px] font-semibold text-[var(--brand-blue)]">0{index + 1}</span><h3 className="mt-5 text-[14px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">{description}</p></article>)}</div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface-soft)]"><div className="mx-auto grid max-w-[1240px] gap-5 px-5 py-14 sm:px-8 lg:grid-cols-3"><Link href="/features" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]">Features</p><h3 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Van monitoren naar actie</h3><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">Bekijk alle modules voor monitoring, matching, alerts, feeds, rapportages en prijsstrategie.</p><span className="mt-5 inline-block text-[11px] font-semibold text-[var(--brand-blue)]">View features →</span></Link><Link href="/pricing" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-violet)]">Pricing</p><h3 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Schaal op uw marktdekking</h3><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">Kies een niveau dat past bij assortiment, markten, monitoringfrequentie en integraties.</p><span className="mt-5 inline-block text-[11px] font-semibold text-[var(--brand-blue)]">View pricing →</span></Link><Link href="/about-us" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-cyan)]">About us</p><h3 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Clarity. Confidence. Control.</h3><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">Lees waar PrySight voor staat en hoe de productprincipes doorwerken in iedere beslissing.</p><span className="mt-5 inline-block text-[11px] font-semibold text-[var(--brand-blue)]">About PrySight →</span></Link></div></section>
      </main>
    </MarketingChrome>
  )
}
