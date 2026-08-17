export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { authorizeApi, VIEW_ROLES, WRITE_ROLES } from '@/lib/authz'
import { linkCompetitorOffer } from '@/lib/catalog'
import { isDatabaseConnectivityError } from '@/lib/database-health'
import { withDatabaseRoute } from '@/lib/database-route'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  countryId: z.string().min(1),
  competitorName: z.string().trim().min(1),
  competitorWebsite: z.string().url(),
  offerUrl: z.string().url(),
  checkFrequencyHours: z.coerce.number().int().positive().optional(),
  currency: z.string().length(3).optional().nullable(),
  vatIncluded: z.coerce.boolean().optional(),
  packagingUnit: z.string().optional().nullable(),
  packagingQty: z.coerce.number().int().positive().optional().nullable(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeApi(VIEW_ROLES)
  if (access.response) return access.response

  const { id } = await params
  return withDatabaseRoute(async () => {
    const matches = await prisma.productMatch.findMany({
      where: { productId: id },
      include: {
        competitorOffer: {
          include: {
            competitor: { include: { country: true } },
            priceChecks: { orderBy: { checkedAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(matches)
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeApi(WRITE_ROLES)
  if (access.response) return access.response

  const { id } = await params
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }

  return withDatabaseRoute(async () => {
    try {
      const result = await linkCompetitorOffer({ productId: id, ...parsed.data })
      return NextResponse.json(result, { status: 201 })
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Koppelen mislukt.' }, { status: 400 })
    }
  })
}
