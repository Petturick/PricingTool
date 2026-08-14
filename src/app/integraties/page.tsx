export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { safeDatabaseQuery } from '@/lib/safe-database'
import { formatDate } from '@/lib/format'

function Status({ ready, label }: { ready: boolean; label?: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'}`}>{label ?? (ready ? 'Geconfigureerd' : 'Configuratie nodig')}</span>
}

export default async function IntegrationsPage() {
  const monitorReady = Boolean(process.env.PRICE_MONITOR_API_KEY)
  const feedReady = Boolean(process.env.DATA_FEED_API_KEY)
  const webhookReady = Boolean(process.env.ALERT_WEBHOOK_URL)
  const databasePassword = process.env.PRICING_DB_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD
  const databaseProjectId = process.env.PRICING_DB_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID
  const databaseReady = Boolean(databasePassword && databaseProjectId)
  const syntrxResult = await safeDatabaseQuery(
    () => prisma.feedSource.findUnique({ where: { sourceKey: 'syntrx:cieqifmizthutfvfgfny:4cd85d1b-f834-4e68-b26d-1eae649b4c1f' } }),
    null,
  )
  const syntrx = syntrxResult.data

  const cards = [
    { title: 'Syntrx PIM', description: 'Engels Group producten kunnen vanuit Syntrx rechtstreeks naar PricingTool worden gesynchroniseerd. De Syntrx sessie en organisatiebevoegdheid worden server-side gevalideerd.', ready: Boolean(syntrx), detail: syntrx ? `Laatste synchronisatie ${formatDate(syntrx.lastRunAt)}, ${syntrx.lastItemCount} regels, status ${syntrx.lastRunStatus}.` : 'Endpoint gereed op /api/integraties/syntrx. Activeer daarna de PricingTool koppeling in Syntrx.' },
    { title: 'Automatische prijscontroles', description: 'De scheduler kan gematchte concurrentie URLs periodiek controleren en schrijft geldige prijzen, voorraad en historie direct weg.', ready: monitorReady, detail: 'Vereist PRICE_MONITOR_API_KEY en de meegeleverde GitHub Actions scheduler.' },
    { title: 'Productfeed API', description: 'ERP, Magento, PIM of een andere bron kan eigen producten, prijzen en voorraad via een beveiligde JSON feed synchroniseren.', ready: feedReady, detail: 'POST naar /api/integraties/product-feed met Bearer DATA_FEED_API_KEY. De bron verschijnt daarna ook onder Feeds.' },
    { title: 'PricingTool database', description: 'De applicatie gebruikt het toegewezen Supabase project via de server-side Supavisor databaseverbinding.', ready: databaseReady && syntrxResult.available, detail: `Project xmedaatjwxkmwkjmwuuz, regio eu-west-2. ${databaseReady ? 'Runtime variabelen gevonden.' : 'PRICING_DB_PASSWORD moet nog als Bolt secret worden gezet.'}` },
    { title: 'Alert webhook', description: 'Nieuwe prijs, voorraad en opportunity signalen kunnen direct naar een externe workflow, Teams, Slack of mailservice worden doorgestuurd.', ready: webhookReady, detail: 'Vereist ALERT_WEBHOOK_URL. De webhook ontvangt JSON met type, titel, melding en gekoppelde IDs.' },
  ]

  return (
    <div className="space-y-5">
      <section className="surface-card p-5 sm:p-6"><p className="eyebrow">Integraties</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[#161a26]">Van losse import naar continue datastroom</h1><p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#697386]">Productdata komt via Feedbeheer of rechtstreeks vanuit Syntrx binnen en is daarna direct terug te zien onder Producten, inclusief de bron van ieder product.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/feeds" className="rounded-xl border border-[#d7e4ff] bg-[var(--blue-soft)] px-4 py-2 text-[11px] font-semibold text-[var(--blue)]">Open Feedbeheer</Link><Link href="/producten" className="rounded-xl border border-[var(--border)] px-4 py-2 text-[11px] font-semibold text-[#697386]">Bekijk Producten</Link></div></section>
      <section className="grid gap-4 xl:grid-cols-3">{cards.map((card) => <div key={card.title} className="surface-card p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-[14px] font-semibold text-[#252a37]">{card.title}</h2><Status ready={card.ready} /></div><p className="mt-3 text-[12px] leading-6 text-[#697386]">{card.description}</p><p className="mt-4 border-t border-[var(--border)] pt-4 text-[11px] leading-5 text-[#8790a2]">{card.detail}</p></div>)}</section>
      <section className="surface-card p-5"><h2 className="text-[14px] font-semibold text-[#252a37]">Volgende writeback laag</h2><p className="mt-2 max-w-4xl text-[12px] leading-6 text-[#697386]">Automatische prijswijziging naar Magento of ERP blijft bewust afgeschermd totdat kostprijs, minimale marge, maximumprijs, bevoegdheden en goedkeuringsregels als harde guardrails beschikbaar zijn.</p></section>
    </div>
  )
}
