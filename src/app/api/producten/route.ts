export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validators'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') ?? undefined
  const products = await prisma.product.findMany({
    where: {
      OR: q
        ? [
            { articleNumber: { contains: q } },
            { name: { contains: q } },
            { ean: { contains: q } },
          ]
        : undefined,
    },
    include: { productGroup: true },
    orderBy: { articleNumber: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      ownPrice: parsed.data.ownPrice === null || parsed.data.ownPrice === undefined ? null : new Prisma.Decimal(parsed.data.ownPrice),
    },
  })
  return NextResponse.json(product, { status: 201 })
}
