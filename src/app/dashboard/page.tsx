import Link from 'next/link'
import { MatchStatus } from '@/generated/prisma'
import { DataTable } from '@/components/DataTable'
import { StatCard } from '@/components/StatCard'
import { getDashboardSnapshot } from '@/lib/dashboard'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const filters: { countryId?: string; productGroupId?: string; competitorId?: string; matchStatus?: MatchStatus | '' } = {
    countryId: readParam(params.land),
    productGroupId: readParam(params.productgroep),
    competitorId: readParam(params.concurrent),
    matchStatus: (readParam(params.matchstatus) as MatchStatus | undefined) ?? '',
  }

  const snapshot = await getDashboardSnapshot(filters)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Overzicht</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Dashboard prijsmonitoring</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">Live overzicht van productdekking, marktpositie en prijscontroles voor Engels Group.</p>
        </div>
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
          <select name="land" defaultValue={filters.countryId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Alle landen</option>
            {snapshot.filterOptions.countries.map((country) => (
              <option key={country.id} value={country.id}>{country.name}</option>
            ))}
          </select>
          <select name="productgroep" defaultValue={filters.productGroupId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Alle productgroepen</option>
            {snapshot.filterOptions.productGroups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
          <select name="concurrent" defaultValue={filters.competitorId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Alle concurrenten</option>
            {snapshot.filterOptions.competitors.map((competitor) => (
              <option key={competitor.id} value={competitor.id}>{competitor.name}</option>
            ))}
          </select>
          <select name="matchstatus" defaultValue={filters.matchStatus} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Alle matchstatussen</option>
            {Object.values(MatchStatus).map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white md:col-span-4">Filters toepassen</button>
        </form>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Aantal gemonitorde producten" value={formatNumber(snapshot.kpis.monitoredProducts)} />
        <StatCard title="Actieve concurrentieaanbiedingen" value={formatNumber(snapshot.kpis.activeOffers)} />
        <StatCard title="Producten met geldige match" value={formatNumber(snapshot.kpis.validMatches)} />
        <StatCard title="Matches voor controle" value={formatNumber(snapshot.kpis.reviewMatches)} accent="Review" />
        <StatCard title="Producten zonder concurrentieprijs" value={formatNumber(snapshot.kpis.withoutCompetitorPrice)} />
        <StatCard title="Engels laagste prijs" value={formatNumber(snapshot.kpis.engelsLowest)} />
        <StatCard title="Engels duurder" value={formatNumber(snapshot.kpis.engelsHigher)} />
        <StatCard title="Gemiddelde prijsindex" value={snapshot.kpis.averagePriceIndex ? `${formatNumber(snapshot.kpis.averagePriceIndex, 1)}` : '—'} helper="100 = gelijk aan laagste marktprijs" />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Grootste prijsstijgingen</h2>
            <Link href="/producten" className="text-sm font-medium text-sky-700">Naar producten</Link>
          </div>
          <DataTable
            columns={[
              { key: 'product', header: 'Product' },
              { key: 'concurrent', header: 'Concurrent' },
              { key: 'van', header: 'Van' },
              { key: 'naar', header: 'Naar' },
              { key: 'delta', header: 'Verschil' },
            ]}
            rows={snapshot.biggestIncreases.map((item) => ({
              product: item.productName,
              concurrent: item.competitor,
              van: formatCurrency(item.previousPrice),
              naar: formatCurrency(item.latestPrice),
              delta: formatCurrency(item.delta),
            }))}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Grootste prijsdalingen</h2>
          <DataTable
            columns={[
              { key: 'product', header: 'Product' },
              { key: 'concurrent', header: 'Concurrent' },
              { key: 'van', header: 'Van' },
              { key: 'naar', header: 'Naar' },
              { key: 'delta', header: 'Verschil' },
            ]}
            rows={snapshot.biggestDecreases.map((item) => ({
              product: item.productName,
              concurrent: item.competitor,
              van: formatCurrency(item.previousPrice),
              naar: formatCurrency(item.latestPrice),
              delta: formatCurrency(item.delta),
            }))}
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Mislukte prijscontroles</h2>
          <DataTable
            columns={[
              { key: 'concurrent', header: 'Concurrent' },
              { key: 'product', header: 'Product' },
              { key: 'melding', header: 'Melding' },
              { key: 'tijd', header: 'Gecontroleerd' },
            ]}
            rows={snapshot.failedChecks.map((check) => ({
              concurrent: check.competitorOffer.competitor.name,
              product: check.competitorOffer.productMatch?.product.name ?? 'Ongekoppeld',
              melding: check.errorMessage ?? 'Onbekende fout',
              tijd: formatDate(check.checkedAt),
            }))}
          />
        </div>
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Verouderde prijsgegevens</h2>
          <DataTable
            columns={[
              { key: 'concurrent', header: 'Concurrent' },
              { key: 'product', header: 'Product' },
              { key: 'prijs', header: 'Prijs' },
              { key: 'laatsteControle', header: 'Laatste controle' },
            ]}
            rows={snapshot.staleOffers.map((offer) => ({
              concurrent: offer.competitor.name,
              product: offer.productMatch?.product.name ?? 'Ongekoppeld',
              prijs: formatCurrency(offer.normalizedPrice),
              laatsteControle: formatDate(offer.lastCheckedAt),
            }))}
          />
        </div>
      </div>
    </div>
  )
}
