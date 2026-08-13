export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const competitorOfferId = searchParams.get('competitorOfferId') ?? undefined
  const productId = searchParams.get('productId') ?? undefined

  const checks = await prisma.priceCheck.findMany({
    where: {
      competitorOfferId,
      competitorOffer: productId ? { productMatch: { productId } } : undefined,
    },
    include: {
      competitorOffer: {
        include: {
          competitor: true,
          productMatch: { include: { product: true } },
        },
      },
    },
    orderBy: { checkedAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(checks)
}
