import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingChrome } from '@/components/MarketingChrome'
import { PrySightMark } from '@/components/PrySightLogo'

export const metadata: Metadata = {
  title: 'About us',
  description: 'Lees waar PrySight voor staat: clarity, confidence, control en momentum in pricing intelligence.',
}

const principles = [
  ['Clarity', 'Complexe marktdata moet eindigen in een begrijpelijke volgende stap.'],
  ['Confidence', 'Prijsbesluiten horen aantoonbaar gebaseerd te zijn op actuele data en duidelijke context.'],
  ['Control', 'Monitoring moet problemen en kansen zichtbaar maken voordat ze commerciële impact krijgen.'],
  ['Momentum', 'Inzicht heeft pas waarde wanneer het leidt tot gerichte actie en betere pricingprocessen.'],
]

export default function AboutUsPage() {
  return (
    <MarketingChrome>
      <main>
        <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)]">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div><PrySightMark className="h-16 w-16" /><p className="eyebrow mt-6">About us</p><h1 className="mt-4 text-[42px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--brand-navy)] sm:text-[52px]">Built for clearer pricing decisions.</h1></div>
            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8"><p className="text-[15px] leading-7 text-[#5f6b80]">PrySight is ontwikkeld vanuit één simpele overtuiging: pricingteams hebben niet méér dashboards nodig, maar een rustigere manier om marktdata te begrijpen en om te zetten in commerciële beslissingen.</p><p className="mt-5 text-[13px] leading-7 text-[#748096]">Daarom combineert PrySight monitoring, concurrentie-informatie, productmatching, alerts, feeds en prijsadvies in één consistente workflow. De interface en merkstijl zijn bewust terughoudend: data en beslissingen staan centraal.</p></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <p className="eyebrow">Our principles</p><h2 className="mt-3 max-w-2xl text-[30px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">The way PrySight should feel in every interaction.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-2">{principles.map(([title,text], index) => <article key={title} className="surface-card p-6"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-blue-soft)] text-[10px] font-semibold text-[var(--brand-blue)]">0{index + 1}</span><h3 className="text-[17px] font-semibold text-[var(--brand-navy)]">{title}</h3></div><p className="mt-4 text-[12px] leading-6 text-[#748096]">{text}</p></article>)}</div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface-soft)]"><div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_1fr] lg:items-center"><div><p className="eyebrow">Brand promise</p><h2 className="mt-3 text-[32px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">See the market.<br/>Price with confidence.</h2></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-[11px] font-semibold text-[var(--brand-navy)]">Calm by design</p><p className="mt-2 text-[10px] leading-5 text-[#7d8799]">Navy en wit domineren. Kleur wordt alleen ingezet wanneer die informatie ondersteunt.</p></div><div className="rounded-2xl border border-[var(--border)] bg-white p-5"><p className="text-[11px] font-semibold text-[var(--brand-navy)]">Actionable by default</p><p className="mt-2 text-[10px] leading-5 text-[#7d8799]">Elke analyse moet duidelijk maken wat er veranderde, waarom dat telt en wat de volgende stap kan zijn.</p></div></div></div></section>

        <section id="request-demo" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20"><div className="rounded-[26px] bg-[var(--brand-navy)] p-7 text-white sm:p-10"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9fb2d4]">See PrySight in context</p><h2 className="mt-3 text-[30px] font-semibold tracking-[-0.04em]">Want to see how PrySight fits your pricing workflow?</h2><p className="mt-3 max-w-2xl text-[12px] leading-6 text-[#b9c5d8]">We lopen door assortiment, markten, concurrentiebronnen, gewenste monitoringfrequentie en de integraties die voor uw organisatie relevant zijn.</p></div><Link href="/request-demo" className="inline-flex rounded-xl bg-white px-5 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">Request demo</Link></div></div></section>
      </main>
    </MarketingChrome>
  )
}
