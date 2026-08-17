export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { runPriceCheckAction } from '@/app/actions/catalogActions'
import { CompetitorOfferForm, ProductMarketForm } from '@/components/CatalogForms'
import { DatabaseNotice } from '@/components/DatabaseNotice'
import { DataTable } from '@/components/DataTable'
import { PriceChart } from '@/components/PriceChart'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { safeDatabaseQuery } from '@/lib/safe-database'

async function loadProduct(id: string) {
  const [product, countries] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        productGroup: true,
        markets: { include: { country: true }, orderBy: { country: { name: 'asc' } } },
        ownPriceHistory: { include: { country: true }, orderBy: { recordedAt: 'asc' } },
        matches: {
          include: {
            competitorOffer: {
              include: {
                competitor: { include: { country: true } },
                priceHistory: { orderBy: { recordedAt: 'asc' } },
                priceChecks: { orderBy: { checkedAt: 'desc' }, take: 5 },
              },
            },
          },
        },
      },
    }),
    prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
  ])
  return { product, countries }
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProductDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const result = await safeDatabaseQuery<Awaited<ReturnType<typeof loadProduct>> | null>(() => loadProduct(id), null)

  if (!result.available || !result.data) {
    return <div className="space-y-4"><DatabaseNotice /><Link href="/producten" className="text-sm font-semibold text-sky-700">Terug naar producten</Link></div>
  }

  const { product, countries } = result.data
  if (!product) notFound()

  const requestedCountryId = readParam(query.land)
  const selectedMarket = product.markets.find((market) => market.id === requestedCountryId || market.countryId === requestedCountryId) ?? product.markets.find((market) => market.isActive) ?? product.markets[0] ?? null
  const selectedCurrency = selectedMarket?.currency ?? product.currency
  const selectedCountryId = selectedMarket?.countryId ?? null
  const marketMatches = selectedCountryId
    ? product.matches.filter((match) => match.competitorOffer.competitor.countryId === selectedCountryId && (match.competitorOffer.currency ?? selectedCurrency).toUpperCase() === selectedCurrency.toUpperCase())
    : []
  const marketOwnHistory = product.ownPriceHistory.filter((entry) => entry.countryId === selectedCountryId || (!entry.countryId && !selectedCountryId))
  const chartData = marketOwnHistory.map((entry) => {
    const competitorPoints = marketMatches
      .flatMap((match) => match.competitorOffer.priceHistory)
      .filter((history) => history.currency.toUpperCase() === selectedCurrency.toUpperCase() && history.recordedAt.toDateString() === entry.recordedAt.toDateString())
      .map((history) => Number(history.normalizedPrice ?? history.price))
    return {
      date: entry.recordedAt.toLocaleDateString('nl-NL'),
      ownPrice: Number(entry.price),
      competitorPrice: competitorPoints.length ? Math.min(...competitorPoints) : null,
    }
  })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Productdetail</p>
            <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
            <p className="mt-2 text-sm text-slate-600">Artikel {product.articleNumber} · {product.productGroup.name}</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600">
            <p>Markten: <span className="font-semibold text-slate-950">{product.markets.filter((market) => market.isActive).length}</span></p>
            <p>Geselecteerde markt: <span className="font-semibold text-slate-950">{selectedMarket?.country.name ?? 'Geen markt'}</span></p>
            <p>Eigen marktprijs: <span className="font-semibold text-slate-950">{formatCurrency(selectedMarket?.ownPrice ?? null, selectedCurrency)}</span></p>
          </div>
        </div>
      </div>

      {product.markets.length > 0 ? (
        <div className="surface-card p-4">
          <p className="text-[11px] font-semibold text-[#687184]">Marktcontext voor grafiek en concurrentiedata</p>
          <div className="mt-3 flex flex-wrap gap-2">{product.markets.map((market) => <Link key={market.id} href={`/producten/${product.id}?land=${market.countryId}`} className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${selectedMarket?.countryId === market.countryId ? 'border-[#d9e6ff] bg-[var(--blue-soft)] text-[var(--blue)]' : 'border-[var(--border)] bg-white text-[#667085]'}`}>{market.country.code} · {market.country.name}</Link>)}</div>
        </div>
      ) : null}

      <DataTable
        columns={[
          { key: 'land', header: 'Land' },
          { key: 'eigenPrijs', header: 'Eigen prijs' },
          { key: 'voorraad', header: 'Voorraad' },
          { key: 'url', header: 'Webshop URL' },
          { key: 'status', header: 'Status' },
        ]}
        rows={product.markets.map((market) => ({
          land: market.country.name,
          eigenPrijs: formatCurrency(market.ownPrice, market.currency),
          voorraad: market.stockStatus ?? '—',
          url: market.ownUrl ? <Link href={market.ownUrl} target="_blank" rel="noreferrer" className="text-sky-700">Product openen</Link> : '—',
          status: market.isActive ? 'Actief' : 'Inactief',
        }))}
      />

      <ProductMarketForm productId={product.id} countries={countries} />
      <CompetitorOfferForm productId={product.id} countries={countries} />

      {selectedMarket ? (
        <div className="space-y-2"><p className="text-[11px] text-[#7d8698]">Prijsontwikkeling · {selectedMarket.country.name} · {selectedCurrency}</p><PriceChart data={chartData} /></div>
      ) : null}

      <DataTable
        columns={[
          { key: 'concurrent', header: 'Concurrent' },
          { key: 'land', header: 'Land' },
          { key: 'prijs', header: 'Prijs' },
          { key: 'genormaliseerd', header: 'Per verpakkingseenheid' },
          { key: 'match', header: 'Match' },
          { key: 'score', header: 'Score' },
          { key: 'voorraad', header: 'Voorraad' },
          { key: 'laatsteControle', header: 'Laatste controle' },
          { key: 'actie', header: 'Actie' },
        ]}
        rows={marketMatches.map((match) => ({
          concurrent: match.competitorOffer.competitor.name,
          land: match.competitorOffer.competitor.country.name,
          prijs: formatCurrency(match.competitorOffer.rawPrice, match.competitorOffer.currency),
          genormaliseerd: formatCurrency(match.competitorOffer.normalizedPrice, match.competitorOffer.currency),
          match: match.matchStatus,
          score: `${formatNumber(match.confidenceScore)} / 100`,
          voorraad: match.competitorOffer.stockStatus ?? '—',
          laatsteControle: formatDate(match.competitorOffer.lastCheckedAt),
          actie: (
            <form action={runPriceCheckAction.bind(null, match.competitorOffer.id, product.id)}>
              <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700">Nu controleren</button>
            </form>
          ),
        }))}
      />

      <DataTable
        columns={[
          { key: 'tijd', header: 'Controlemoment' },
          { key: 'concurrent', header: 'Concurrent' },
          { key: 'methode', header: 'Methode' },
          { key: 'status', header: 'Status' },
          { key: 'prijs', header: 'Prijs' },
          { key: 'melding', header: 'Melding' },
        ]}
        rows={marketMatches.flatMap((match) =>
          match.competitorOffer.priceChecks.map((check) => ({
            tijd: formatDate(check.checkedAt),
            concurrent: match.competitorOffer.competitor.name,
            methode: check.checkMethod,
            status: check.isSuccess ? 'Succes' : `Fout ${check.statusCode ?? '—'}`,
            prijs: formatCurrency(check.foundPrice, check.currency),
            melding: check.errorMessage ?? '—',
          })),
        )}
      />
    </div>
  )
}
