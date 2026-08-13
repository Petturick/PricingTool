export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { DatabaseNotice } from '@/components/DatabaseNotice'
import { FeedConnectForm } from '@/components/FeedConnectForm'
import { FeedTabs } from '@/components/FeedTabs'
import { formatDate, formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { safeDatabaseQuery } from '@/lib/safe-database'

export default async function FeedsPage() {
  const result = await safeDatabaseQuery(() => prisma.feedSource.findMany({ orderBy: { updatedAt: 'desc' }, take: 6 }), [])
  const sources = result.data
  return (
    <div className="space-y-5">
      {!result.available && <DatabaseNotice />}
      <section className="surface-card overflow-hidden"><div className="px-5 py-5 sm:px-6"><p className="eyebrow">Feeds</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[#161a26]">Feedbeheer</h1><p className="mt-2 text-[12px] leading-6 text-[#697386]">Importeer productdata, koppel een externe bron of synchroniseer producten rechtstreeks vanuit Syntrx PIM.</p></div><FeedTabs /></section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Link href="/import" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--blue-soft)] text-[var(--blue)]">▦</div><h2 className="mt-4 text-[13px] font-semibold text-[#252a37]">Productbestand importeren</h2><p className="mt-1 text-[11px] leading-5 text-[#778195]">Upload CSV of Excel, controleer herkende kolommen en bekijk een veilige preview voordat producten worden bijgewerkt.</p></Link>
        <a href="#externe-feed" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f7efff] text-[#8a3fd1]">↗</div><h2 className="mt-4 text-[13px] font-semibold text-[#252a37]">Externe productfeed koppelen</h2><p className="mt-1 text-[11px] leading-5 text-[#778195]">Gebruik XML, CSV, JSON, Excel of een openbare Google Drive link. Kolommen en producten worden automatisch herkend.</p></a>
        <Link href="/feeds/publicaties" className="surface-card group p-5 transition-transform hover:-translate-y-0.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green-soft)] text-[var(--green)]">◔</div><h2 className="mt-4 text-[13px] font-semibold text-[#252a37]">Uitgaande productfeed</h2><p className="mt-1 text-[11px] leading-5 text-[#778195]">Publiceer de actuele PricingTool productset als beveiligde JSON of CSV voor andere systemen.</p></Link>
      </section>

      <section id="externe-feed" className="surface-card scroll-mt-5 overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-[13px] font-semibold text-[#252a37]">Externe productfeed koppelen</h2><p className="mt-1 text-[11px] text-[#8790a2]">Bron ophalen, kolommen herkennen en producten bijwerken in één begeleide stap.</p></div><Link href="/feeds/map" className="text-[11px] font-semibold text-[var(--blue)]">Bestaande bronfeeds beheren</Link></div><div className="p-5"><FeedConnectForm disabled={!result.available} /></div></section>

      <section className="surface-card p-5"><div className="flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#252a37]">Recente bronfeeds</h2><p className="mt-1 text-[11px] text-[#8790a2]">De laatste bronnen die productdata aan PricingTool hebben geleverd.</p></div><span className="rounded-full bg-[#f5f7fa] px-3 py-1 text-[10px] font-semibold text-[#697386]">{formatNumber(sources.length)} zichtbaar</span></div><div className="mt-4 divide-y divide-[var(--border)]">{sources.length === 0 ? <p className="py-6 text-center text-[11px] text-[#98a2b3]">Nog geen bronfeeds gekoppeld.</p> : sources.map((source) => <div key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-[11px] font-semibold text-[#303647]">{source.name}</p><p className="mt-1 text-[10px] text-[#929bad]">{source.sourceType} · {source.format ?? 'formaat wordt bepaald'} · laatste run {formatDate(source.lastRunAt)}</p></div><div className="text-right"><p className="text-[11px] font-semibold text-[#303647]">{formatNumber(source.lastItemCount)} regels</p><p className={`mt-1 text-[10px] ${source.lastRunStatus === 'FAILED' ? 'text-[#b4233d]' : 'text-[#5f8f70]'}`}>{source.lastRunStatus}</p></div></div>)}</div></section>
    </div>
  )
}
