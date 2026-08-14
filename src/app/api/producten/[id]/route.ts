export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { withDatabaseRoute } from '@/lib/database-route'
import { prisma } from '@/lib/prisma'
import { setProductMarket } from '@/lib/catalog'
import { productSchema } from '@/lib/validators'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withDatabaseRoute(async () => {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { productGroup: true, markets: { include: { country: true } }, matches: { include: { competitorOffer: { include: { competitor: true } } } } },
    })
    if (!product) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
    return NextResponse.json(product)
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }
  const { countryIds, ...productData } = parsed.data
  return withDatabaseRoute(async () => {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ownPrice: productData.ownPrice === null || productData.ownPrice === undefined ? null : new Prisma.Decimal(productData.ownPrice),
      },
    })
    if (countryIds) {
      await prisma.productMarket.deleteMany({ where: { productId: id, countryId: { notIn: countryIds } } })
      for (const countryId of [...new Set(countryIds)]) {
        await setProductMarket({
          productId: id,
          countryId,
          ownPrice: productData.ownPrice,
          currency: productData.currency,
          stockStatus: productData.stockStatus,
          isActive: productData.isActive,
        })
      }
    }
    return NextResponse.json(product)
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withDatabaseRoute(async () => {
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
