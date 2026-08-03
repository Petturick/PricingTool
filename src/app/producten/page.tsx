import Link from 'next/link'
import { DataTable } from '@/components/DataTable'
import { deriveProductMetrics, getFilterOptions, getFilteredProducts } from '@/lib/dashboard'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ProductenPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const filters = {
    q: readParam(params.q),
    productGroupId: readParam(params.productgroep),
    countryId: readParam(params.land),
    competitorId: readParam(params.concurrent),
  }
  const page = Math.max(Number(readParam(params.pagina) ?? '1') || 1, 1)
  const pageSize = 12

  const [products, filterOptions] = await Promise.all([getFilteredProducts(filters), getFilterOptions()])
  const rows = products.map((product) => deriveProductMetrics(product, filters))
  const paged = rows.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Producten</h1>
        <p className="mt-2 text-sm text-slate-600">Alle gemonitorde artikelen met actuele marktpositie, verschillen en trends.</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
        <input name="q" defaultValue={filters.q} placeholder="Zoek op artikel, EAN of naam" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
        <select name="productgroep" defaultValue={filters.productGroupId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Alle productgroepen</option>
          {filterOptions.productGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
        <select name="land" defaultValue={filters.countryId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Alle landen</option>
          {filterOptions.countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
        </select>
        <select name="concurrent" defaultValue={filters.competitorId} className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
          <option value="">Alle concurrenten</option>
          {filterOptions.competitors.map((competitor) => <option key={competitor.id} value={competitor.id}>{competitor.name}</option>)}
        </select>
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white md:col-span-5">Filteren</button>
      </form>

      <DataTable
        columns={[
          { key: 'artikelnummer', header: 'Artikelnummer' },
          { key: 'ean', header: 'EAN' },
          { key: 'productnaam', header: 'Productnaam' },
          { key: 'groep', header: 'Productgroep' },
          { key: 'eigenPrijs', header: 'Eigen prijs' },
          { key: 'laagste', header: 'Laagste concurrentieprijs' },
          { key: 'gemiddeld', header: 'Gem. concurrent prijs' },
          { key: 'verschilEuro', header: 'Verschil €' },
          { key: 'verschilPct', header: 'Verschil %' },
          { key: 'positie', header: 'Marktpositie' },
          { key: 'aantalConcurrenten', header: 'Aantal concurrenten' },
          { key: 'voorraad', header: 'Voorraad' },
          { key: 'laatsteControle', header: 'Laatste controle' },
          { key: 'trend', header: 'Prijstrend' },
        ]}
        rows={paged.map((item) => ({
          artikelnummer: <Link href={`/producten/${item.product.id}`} className="font-medium text-sky-700">{item.product.articleNumber}</Link>,
          ean: item.product.ean ?? '—',
          productnaam: item.product.name,
          groep: item.product.productGroup.name,
          eigenPrijs: formatCurrency(item.ownPrice, item.product.currency),
          laagste: formatCurrency(item.lowestPrice),
          gemiddeld: formatCurrency(item.averagePrice),
          verschilEuro: formatCurrency(item.difference.diff),
          verschilPct: item.difference.pctDiff ? `${formatNumber(Number(item.difference.pctDiff), 1)}%` : '—',
          positie: item.marketPosition,
          aantalConcurrenten: formatNumber(item.offerCount),
          voorraad: item.product.stockStatus ?? '—',
          laatsteControle: formatDate(item.lastCheckedAt),
          trend: item.trendDelta === null ? '—' : `${item.trendDelta >= 0 ? '+' : ''}${formatCurrency(item.trendDelta)}`,
        }))}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
        <p>Pagina {page} van {totalPages}</p>
        <div className="flex gap-2">
          <Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)).map(([key, value]) => [key === 'productGroupId' ? 'productgroep' : key === 'countryId' ? 'land' : key === 'competitorId' ? 'concurrent' : key, value as string])), pagina: String(Math.max(page - 1, 1)) }).toString()}`} className="rounded-lg border border-slate-300 px-3 py-2">Vorige</Link>
          <Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(filters).filter(([, value]) => Boolean(value)).map(([key, value]) => [key === 'productGroupId' ? 'productgroep' : key === 'countryId' ? 'land' : key === 'competitorId' ? 'concurrent' : key, value as string])), pagina: String(Math.min(page + 1, totalPages)) }).toString()}`} className="rounded-lg border border-slate-300 px-3 py-2">Volgende</Link>
        </div>
      </div>
    </div>
  )
}
