import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingChrome } from '@/components/MarketingChrome'

export const metadata: Metadata = {
  title: 'Features',
  description: 'Ontdek PrySight features voor prijsmonitoring, concurrentieanalyse, productmatching, alerts, feeds, rapportages en prijsstrategie.',
}

const features = [
  { title: 'Price monitoring', label: 'Monitor', description: 'Volg eigen prijzen, concurrentieprijzen, voorraadstatus en recente prijsbewegingen per product en markt.', detail: 'Dashboard, productoverzicht, prijscontroles en prijshistorie.' },
  { title: 'Competitor intelligence', label: 'Compare', description: 'Beheer concurrenten per land en zie direct welke aanbieders prijsdruk of juist commerciële ruimte creëren.', detail: 'Concurrenten, aanbiedingen, bronstatus en marktpositie.' },
  { title: 'Product matching', label: 'Match', description: 'Koppel eigen producten aan vergelijkbare concurrentproducten en beoordeel matches die handmatige controle nodig hebben.', detail: 'Identifier matching, confidence scores en review workflow.' },
  { title: 'Alerts & signals', label: 'Signal', description: 'Breng belangrijke prijsafwijkingen, voorraadwijzigingen en datakwaliteitsproblemen gericht onder de aandacht.', detail: 'Waarschuwingen, failed checks en stale data.' },
  { title: 'Pricing strategy', label: 'Decide', description: 'Vertaal marktdata naar onderbouwde prijsadviezen zonder automatisch prijzen te wijzigen voordat guardrails zijn ingericht.', detail: 'Prijsadvies, simulatie en commerciële beslisondersteuning.' },
  { title: 'Feeds & integrations', label: 'Connect', description: 'Importeer productdata via bestanden of feeds en synchroniseer met systemen zoals Syntrx PIM via gecontroleerde integraties.', detail: 'CSV, Excel, XML, JSON, feedbeheer en API-koppelingen.' },
  { title: 'Reporting', label: 'Report', description: 'Maak markt- en prijsinformatie geschikt voor wekelijkse commerciële opvolging en managementrapportage.', detail: 'Rapportages, exports en managementsamenvattingen.' },
  { title: 'Data health', label: 'Control', description: 'Zie welke bronnen actueel zijn, welke checks mislukken en waar product- of prijsdata aandacht nodig heeft.', detail: 'Brongezondheid, synchronisatiestatus en foutsignalering.' },
]

export default function FeaturesPage() {
  return (
    <MarketingChrome>
      <main>
        <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)]">
          <div className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
            <p className="eyebrow">Features</p>
            <div className="mt-4 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"><h1 className="max-w-2xl text-[42px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--brand-navy)] sm:text-[52px]">Everything needed to see the market clearly.</h1><div><p className="max-w-xl text-[14px] leading-7 text-[#6d788d]">PrySight combineert monitoring, matching, analyse en actie in één consistente pricing workspace. Geen losse dashboards, maar een workflow van brondata naar besluit.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/request-demo" className="rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white">Request demo</Link><Link href="/pricing" className="rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">View pricing</Link></div></div></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-4 md:grid-cols-2">{features.map((feature, index) => <article key={feature.title} className="surface-card p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]">{feature.label}</span><span className="text-[10px] font-semibold text-[#a0a9b8]">0{index + 1}</span></div><h2 className="mt-5 text-[19px] font-semibold tracking-[-0.025em] text-[var(--brand-navy)]">{feature.title}</h2><p className="mt-3 text-[12px] leading-6 text-[#707c91]">{feature.description}</p><div className="mt-5 border-t border-[var(--border)] pt-4 text-[10px] font-medium leading-5 text-[#8a94a6]">{feature.detail}</div></article>)}</div>
        </section>

        <section className="border-y border-[var(--border)] bg-[var(--surface-soft)]"><div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8"><div className="rounded-[24px] border border-[var(--border)] bg-white p-6 sm:p-8"><p className="eyebrow">Workflow</p><h2 className="mt-3 text-[28px] font-semibold tracking-[-0.04em] text-[var(--brand-navy)]">Connect. Monitor. Analyse. Act.</h2><div className="mt-8 grid gap-3 md:grid-cols-4">{[['01','Connect','Koppel productdata en prijsbronnen.'],['02','Monitor','Volg prijzen, voorraad en bronstatus.'],['03','Analyse','Beoordeel positie, matches en trends.'],['04','Act','Vertaal inzicht naar een prijsbesluit.']].map(([num,title,text]) => <div key={num} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><p className="text-[9px] font-semibold text-[var(--brand-blue)]">{num}</p><h3 className="mt-3 text-[13px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-2 text-[10px] leading-5 text-[#7d8799]">{text}</p></div>)}</div></div></div></section>
      </main>
    </MarketingChrome>
  )
}
