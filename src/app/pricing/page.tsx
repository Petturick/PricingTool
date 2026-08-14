import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingChrome } from '@/components/MarketingChrome'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'PrySight pricing is afgestemd op assortiment, markten, monitoringfrequentie, feeds, integraties en commerciële workflow.',
}

const plans = [
  {
    name: 'Core',
    label: 'Start monitoring',
    description: 'Voor teams die gestructureerd willen starten met prijsmonitoring en concurrentie-inzicht.',
    items: ['Prijsmonitoring en dashboard', 'Producten en concurrenten', 'Productmatching', 'Alerts en rapportages', 'Bestands- en feedimport'],
  },
  {
    name: 'Growth',
    label: 'Most relevant',
    description: 'Voor organisaties die meerdere markten monitoren en pricing structureel in de commerciële workflow opnemen.',
    items: ['Alles uit Core', 'Meer markten en assortiment', 'Uitgebreidere feedflows', 'Prijsstrategie en simulatie', 'Integraties en API-workflows'],
  },
  {
    name: 'Scale',
    label: 'Complex environments',
    description: 'Voor grotere assortimentsomgevingen met hogere monitoringvolumes, meerdere databronnen en maatwerkprocessen.',
    items: ['Alles uit Growth', 'Schaalbare monitoring', 'Geavanceerde integraties', 'Datakwaliteit en governance', 'Implementatie- en onboardingafspraken'],
  },
]

export default function PricingPage() {
  return (
    <MarketingChrome>
      <main>
        <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)]">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
            <p className="eyebrow">Pricing</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><h1 className="max-w-2xl text-[42px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--brand-navy)] sm:text-[52px]">Pricing that follows your market complexity.</h1><div><p className="max-w-xl text-[14px] leading-7 text-[#6d788d]">PrySight wordt afgestemd op het aantal producten, markten, concurrentiebronnen, gewenste controlefrequentie en integraties. Daardoor betaalt u voor de scope die u daadwerkelijk nodig hebt.</p><Link href="/request-demo" className="mt-6 inline-flex rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white">Request pricing & demo</Link></div></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-4 lg:grid-cols-3">{plans.map((plan, index) => <article key={plan.name} className={`relative rounded-[22px] border bg-white p-6 ${index === 1 ? 'border-[#b9caeb] shadow-[0_18px_50px_rgba(65,105,201,0.10)]' : 'border-[var(--border)] shadow-[var(--shadow-soft)]'}`}><div className="flex items-center justify-between gap-3"><h2 className="text-[22px] font-semibold tracking-[-0.035em] text-[var(--brand-navy)]">{plan.name}</h2><span className={`rounded-full px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${index === 1 ? 'bg-[var(--brand-blue)] text-white' : 'bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]'}`}>{plan.label}</span></div><p className="mt-4 min-h-[72px] text-[12px] leading-6 text-[#707c91]">{plan.description}</p><div className="mt-5 border-t border-[var(--border)] pt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-[#8a94a6]">Included scope</p><div className="mt-4 space-y-3">{plan.items.map((item) => <div key={item} className="flex items-start gap-2.5 text-[11px] leading-5 text-[#5f6b80]"><span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--brand-mint-soft)] text-[9px] font-bold text-[var(--brand-mint)]">✓</span><span>{item}</span></div>)}</div></div><Link href="/request-demo" className={`mt-7 flex w-full items-center justify-center rounded-xl px-4 py-3 text-[11px] font-semibold ${index === 1 ? 'bg-[var(--brand-blue)] text-white' : 'border border-[var(--border-strong)] text-[var(--brand-navy)]'}`}>Discuss this plan</Link></article>)}</div>
          <p className="mt-6 text-center text-[10px] leading-5 text-[#8b95a7]">Exacte prijsstelling wordt bepaald op basis van scope en implementatie. Zo voorkomen we fictieve pakketten die niet aansluiten op monitoringvolume of integratiebehoefte.</p>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface-soft)]"><div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8"><div className="grid gap-5 md:grid-cols-4">{[['Products','Hoeveel artikelen moeten actief worden gevolgd?'],['Markets','In hoeveel landen of markten wordt gemonitord?'],['Frequency','Hoe vaak moeten prijzen en voorraad worden gecontroleerd?'],['Integrations','Welke feeds, PIM-, ERP- of API-koppelingen zijn nodig?']].map(([title,text]) => <div key={title} className="rounded-2xl border border-[var(--border)] bg-white p-5"><h3 className="text-[12px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-2 text-[10px] leading-5 text-[#7b8598]">{text}</p></div>)}</div></div></section>
      </main>
    </MarketingChrome>
  )
}
