export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { authorizeApi, VIEW_ROLES, WRITE_ROLES } from '@/lib/authz'
import { withDatabaseRoute } from '@/lib/database-route'
import { prisma } from '@/lib/prisma'
import { productSchema } from '@/lib/validators'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeApi(VIEW_ROLES)
  if (access.response) return access.response

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
  const access = await authorizeApi(WRITE_ROLES)
  if (access.response) return access.response

  const { id } = await params
  const body = await request.json()
  const parsed = productSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }
  const { countryIds, ...productData } = parsed.data

  return withDatabaseRoute(async () => {
    const uniqueCountryIds = [...new Set(countryIds ?? [])]
    const countries = uniqueCountryIds.length
      ? await prisma.country.findMany({ where: { id: { in: uniqueCountryIds }, isActive: true } })
      : []
    if (countries.length !== uniqueCountryIds.length) {
      return NextResponse.json({ error: 'Een of meer geselecteerde landen bestaan niet of zijn niet actief.' }, { status: 400 })
    }

    const ownPrice = productData.ownPrice === null || productData.ownPrice === undefined ? null : new Prisma.Decimal(productData.ownPrice)
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { ...productData, ownPrice },
      })

      if (countryIds) {
        await tx.productMarket.deleteMany({ where: { productId: id, countryId: { notIn: uniqueCountryIds } } })
        for (const country of countries) {
          await tx.productMarket.upsert({
            where: { productId_countryId: { productId: id, countryId: country.id } },
            update: {
              ownPrice,
              currency: productData.currency || country.currency,
              stockStatus: productData.stockStatus || null,
              isActive: productData.isActive,
            },
            create: {
              productId: id,
              countryId: country.id,
              ownPrice,
              currency: productData.currency || country.currency,
              stockStatus: productData.stockStatus || null,
              isActive: productData.isActive,
            },
          })
        }
      }

      return updated
    })

    return NextResponse.json(product)
  })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await authorizeApi(WRITE_ROLES)
  if (access.response) return access.response

  const { id } = await params
  return withDatabaseRoute(async () => {
    const dependencies = await prisma.productMatch.count({ where: { productId: id } })
    if (dependencies > 0) {
      return NextResponse.json({ error: 'Dit product heeft concurrentmatches en kan niet veilig worden verwijderd. Deactiveer het product of verwijder eerst de gekoppelde matches.' }, { status: 409 })
    }
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  })
}
