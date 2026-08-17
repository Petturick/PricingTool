export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { verifyBearerSecret } from '@/lib/api-auth'
import { withDatabaseRoute } from '@/lib/database-route'
import { prisma } from '@/lib/prisma'

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: Request) {
  const access = verifyBearerSecret(request, 'DATA_FEED_API_KEY')
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })

  const url = new URL(request.url)
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json'
  const countryCode = url.searchParams.get('country')?.trim().toUpperCase() || null

  return withDatabaseRoute(async () => {
    const country = countryCode
      ? await prisma.country.findFirst({ where: { code: countryCode, isActive: true }, select: { id: true, code: true, name: true, currency: true } })
      : null
    if (countryCode && !country) {
      return NextResponse.json({ error: `Land ${countryCode} bestaat niet of is niet actief.` }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        markets: country ? { some: { countryId: country.id, isActive: true } } : undefined,
      },
      include: {
        productGroup: true,
        markets: {
          where: country ? { countryId: country.id, isActive: true } : { isActive: true },
          include: { country: true },
          orderBy: { country: { code: 'asc' } },
        },
      },
      orderBy: { articleNumber: 'asc' },
    })

    if (format === 'json') {
      const rows = products.map((product) => ({
        articleNumber: product.articleNumber,
        ean: product.ean,
        gtin: product.gtin,
        name: product.name,
        productGroup: product.productGroup.name,
        packagingUnit: product.packagingUnit,
        packagingQty: product.packagingQty,
        markets: product.markets.map((market) => ({
          countryCode: market.country.code,
          country: market.country.name,
          ownPrice: market.ownPrice?.toString() ?? null,
          currency: market.currency,
          stockStatus: market.stockStatus,
          ownUrl: market.ownUrl,
          updatedAt: market.updatedAt.toISOString(),
        })),
        updatedAt: product.updatedAt.toISOString(),
      }))
      return NextResponse.json({ generatedAt: new Date().toISOString(), market: country?.code ?? 'ALL', count: rows.length, products: rows })
    }

    const rows = products.flatMap((product) => product.markets.map((market) => ({
      articleNumber: product.articleNumber,
      ean: product.ean,
      gtin: product.gtin,
      name: product.name,
      productGroup: product.productGroup.name,
      countryCode: market.country.code,
      country: market.country.name,
      ownPrice: market.ownPrice?.toString() ?? null,
      currency: market.currency,
      stockStatus: market.stockStatus,
      ownUrl: market.ownUrl,
      packagingUnit: product.packagingUnit,
      packagingQty: product.packagingQty,
      updatedAt: market.updatedAt.toISOString(),
    })))
    const headers = ['articleNumber', 'ean', 'gtin', 'name', 'productGroup', 'countryCode', 'country', 'ownPrice', 'currency', 'stockStatus', 'ownUrl', 'packagingUnit', 'packagingQty', 'updatedAt'] as const
    const csv = [headers.map(csvEscape).join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n')
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="prysight-products-${country?.code?.toLowerCase() ?? 'all-markets'}.csv"` } })
  })
}
