export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { verifyBearerSecret } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

type FeedProduct = { articleNumber?: unknown; name?: unknown; productGroup?: unknown; ean?: unknown; gtin?: unknown; ownPrice?: unknown; currency?: unknown; stockStatus?: unknown; packagingUnit?: unknown; packagingQty?: unknown; isActive?: unknown }
function stringValue(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null }
function decimalValue(value: unknown) { if (value === null || value === undefined || value === '') return null; const parsed = Number(String(value).replace(',', '.')); return Number.isFinite(parsed) ? new Prisma.Decimal(parsed) : null }

export async function GET() {
  return NextResponse.json({ endpoint: '/api/integraties/product-feed', method: 'POST', authentication: 'Bearer DATA_FEED_API_KEY', required: ['articleNumber', 'name'], optional: ['productGroup', 'ean', 'gtin', 'ownPrice', 'currency', 'stockStatus', 'packagingUnit', 'packagingQty', 'isActive'] })
}

export async function POST(request: Request) {
  const access = verifyBearerSecret(request, 'DATA_FEED_API_KEY')
  if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status })
  const body = await request.json().catch(() => null) as { products?: FeedProduct[] } | null
  if (!body?.products || !Array.isArray(body.products)) return NextResponse.json({ error: 'Body moet een products array bevatten.' }, { status: 400 })
  if (body.products.length > 2000) return NextResponse.json({ error: 'Maximaal 2000 producten per request.' }, { status: 413 })

  let processed = 0
  const errors: Array<{ index: number; message: string }> = []
  for (const [index, item] of body.products.entries()) {
    try {
      const articleNumber = stringValue(item.articleNumber)
      const name = stringValue(item.name)
      if (!articleNumber || !name) throw new Error('articleNumber en name zijn verplicht.')
      const groupName = stringValue(item.productGroup) ?? 'Onbekend'
      const productGroup = await prisma.productGroup.upsert({ where: { name: groupName }, update: {}, create: { name: groupName, description: 'Automatisch aangemaakt via productfeed.' } })
      const existing = await prisma.product.findUnique({ where: { articleNumber } })
      const ownPrice = decimalValue(item.ownPrice)
      const packagingQty = Number(item.packagingQty ?? 1)
      const product = await prisma.product.upsert({
        where: { articleNumber },
        update: { name, productGroupId: productGroup.id, ean: stringValue(item.ean) ?? undefined, gtin: stringValue(item.gtin) ?? stringValue(item.ean) ?? undefined, ownPrice: ownPrice ?? undefined, currency: stringValue(item.currency) ?? undefined, stockStatus: stringValue(item.stockStatus) ?? undefined, packagingUnit: stringValue(item.packagingUnit) ?? undefined, packagingQty: Number.isFinite(packagingQty) && packagingQty > 0 ? Math.round(packagingQty) : 1, isActive: typeof item.isActive === 'boolean' ? item.isActive : undefined },
        create: { articleNumber, name, productGroupId: productGroup.id, ean: stringValue(item.ean), gtin: stringValue(item.gtin) ?? stringValue(item.ean), ownPrice, currency: stringValue(item.currency) ?? 'EUR', stockStatus: stringValue(item.stockStatus) ?? 'Onbekend', packagingUnit: stringValue(item.packagingUnit) ?? 'stuks', packagingQty: Number.isFinite(packagingQty) && packagingQty > 0 ? Math.round(packagingQty) : 1, isActive: typeof item.isActive === 'boolean' ? item.isActive : true },
      })
      if (ownPrice && (!existing?.ownPrice || !existing.ownPrice.eq(ownPrice))) await prisma.ownPriceHistory.create({ data: { productId: product.id, recordedAt: new Date(), price: ownPrice, currency: product.currency } })
      processed += 1
    } catch (error) {
      errors.push({ index, message: error instanceof Error ? error.message : 'Onbekende fout' })
    }
  }
  return NextResponse.json({ processed, failed: errors.length, errors }, { status: errors.length > 0 ? 207 : 200 })
}
