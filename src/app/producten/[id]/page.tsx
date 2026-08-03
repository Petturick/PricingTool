import { notFound } from 'next/navigation'
import { DataTable } from '@/components/DataTable'
import { PriceChart } from '@/components/PriceChart'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      productGroup: true,
      ownPriceHistory: { orderBy: { recordedAt: 'asc' } },
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
  })

  if (!product) notFound()

  const chartData = product.ownPriceHistory.map((entry) => {
    const competitorPoints = product.matches
      .flatMap((match) => match.competitorOffer.priceHistory)
      .filter((history) => history.recordedAt.toDateString() === entry.recordedAt.toDateString())
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
            <p>Eigen prijs: <span className="font-semibold text-slate-950">{formatCurrency(product.ownPrice, product.currency)}</span></p>
            <p>Verpakking: <span className="font-semibold text-slate-950">{product.packagingQty} {product.packagingUnit ?? 'stuks'}</span></p>
            <p>Voorraad: <span className="font-semibold text-slate-950">{product.stockStatus ?? 'Onbekend'}</span></p>
          </div>
        </div>
      </div>

      <PriceChart data={chartData} />

      <DataTable
        columns={[
          { key: 'concurrent', header: 'Concurrent' },
          { key: 'land', header: 'Land' },
          { key: 'prijs', header: 'Prijs' },
          { key: 'genormaliseerd', header: 'Genormaliseerd' },
          { key: 'match', header: 'Match' },
          { key: 'score', header: 'Score' },
          { key: 'voorraad', header: 'Voorraad' },
          { key: 'laatsteControle', header: 'Laatste controle' },
        ]}
        rows={product.matches.map((match) => ({
          concurrent: match.competitorOffer.competitor.name,
          land: match.competitorOffer.competitor.country.name,
          prijs: formatCurrency(match.competitorOffer.rawPrice, match.competitorOffer.currency),
          genormaliseerd: formatCurrency(match.competitorOffer.normalizedPrice),
          match: match.matchStatus,
          score: `${formatNumber(match.confidenceScore)} / 100`,
          voorraad: match.competitorOffer.stockStatus ?? '—',
          laatsteControle: formatDate(match.competitorOffer.lastCheckedAt),
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
        rows={product.matches.flatMap((match) =>
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
