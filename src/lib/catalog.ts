import { MatchStatus, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { runPriceCheck } from '@/lib/price-monitoring'

export type CatalogProductInput = {
  articleNumber: string
  ean?: string | null
  gtin?: string | null
  name: string
  productGroupId: string
  ownPrice?: number | null
  vatIncluded?: boolean
  packagingUnit?: string | null
  packagingQty?: number
  currency?: string
  stockStatus?: string | null
  notes?: string | null
  isActive?: boolean
  countryIds?: string[]
}

export type ProductMarketInput = {
  productId: string
  countryId: string
  ownPrice?: number | null
  currency?: string | null
  ownUrl?: string | null
  stockStatus?: string | null
  isActive?: boolean
}

export type CompetitorOfferInput = {
  productId: string
  countryId: string
  competitorName: string
  competitorWebsite: string
  offerUrl: string
  checkFrequencyHours?: number
  currency?: string | null
  vatIncluded?: boolean
  packagingUnit?: string | null
  packagingQty?: number | null
}

function decimal(value: number | null | undefined) {
  return value === null || value === undefined ? null : new Prisma.Decimal(value)
}

export async function createCatalogProduct(input: CatalogProductInput) {
  const countryIds = [...new Set(input.countryIds ?? [])]
  const countries = countryIds.length
    ? await prisma.country.findMany({ where: { id: { in: countryIds }, isActive: true } })
    : []

  if (countries.length !== countryIds.length) {
    throw new Error('Een of meer geselecteerde landen bestaan niet of zijn niet actief.')
  }

  const ownPrice = decimal(input.ownPrice)
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        articleNumber: input.articleNumber,
        ean: input.ean,
        gtin: input.gtin ?? input.ean,
        name: input.name,
        productGroupId: input.productGroupId,
        ownPrice,
        vatIncluded: input.vatIncluded ?? true,
        packagingUnit: input.packagingUnit,
        packagingQty: input.packagingQty ?? 1,
        currency: input.currency ?? 'EUR',
        stockStatus: input.stockStatus,
        notes: input.notes,
        isActive: input.isActive ?? true,
        markets: {
          create: countries.map((country) => ({
            countryId: country.id,
            ownPrice,
            currency: input.currency ?? country.currency,
            stockStatus: input.stockStatus,
            isActive: true,
          })),
        },
      },
    })

    if (ownPrice) {
      await tx.ownPriceHistory.create({
        data: {
          productId: product.id,
          recordedAt: new Date(),
          price: ownPrice,
          currency: product.currency,
        },
      })
    }

    return product
  })
}

export async function setProductMarket(input: ProductMarketInput) {
  const [country, product] = await Promise.all([
    prisma.country.findFirst({ where: { id: input.countryId, isActive: true } }),
    prisma.product.findUnique({ where: { id: input.productId } }),
  ])
  if (!country) throw new Error('Het geselecteerde land bestaat niet of is niet actief.')
  if (!product) throw new Error('Product niet gevonden.')

  const ownPrice = decimal(input.ownPrice)
  return prisma.productMarket.upsert({
    where: { productId_countryId: { productId: input.productId, countryId: input.countryId } },
    update: {
      ownPrice,
      currency: input.currency || country.currency,
      ownUrl: input.ownUrl || null,
      stockStatus: input.stockStatus || null,
      isActive: input.isActive ?? true,
    },
    create: {
      productId: input.productId,
      countryId: input.countryId,
      ownPrice,
      currency: input.currency || country.currency,
      ownUrl: input.ownUrl || null,
      stockStatus: input.stockStatus || null,
      isActive: input.isActive ?? true,
    },
  })
}

export async function linkCompetitorOffer(input: CompetitorOfferInput) {
  const country = await prisma.country.findFirst({ where: { id: input.countryId, isActive: true } })
  if (!country) throw new Error('Het geselecteerde land bestaat niet of is niet actief.')

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } })
    if (!product) throw new Error('Product niet gevonden.')

    const competitor = await tx.competitor.upsert({
      where: { name_countryId: { name: input.competitorName, countryId: input.countryId } },
      update: {
        website: input.competitorWebsite,
        checkFrequencyHours: input.checkFrequencyHours ?? 24,
        isActive: true,
      },
      create: {
        name: input.competitorName,
        website: input.competitorWebsite,
        countryId: input.countryId,
        checkFrequencyHours: input.checkFrequencyHours ?? 24,
        isActive: true,
      },
    })

    const offer = await tx.competitorOffer.upsert({
      where: { competitorId_url: { competitorId: competitor.id, url: input.offerUrl } },
      update: {
        currency: input.currency || country.currency,
        vatIncluded: input.vatIncluded ?? true,
        packagingUnit: input.packagingUnit || null,
        packagingQty: input.packagingQty ?? 1,
        isActive: true,
      },
      create: {
        competitorId: competitor.id,
        url: input.offerUrl,
        currency: input.currency || country.currency,
        vatIncluded: input.vatIncluded ?? true,
        packagingUnit: input.packagingUnit || null,
        packagingQty: input.packagingQty ?? 1,
        isActive: true,
      },
      include: { productMatch: true },
    })

    if (offer.productMatch && offer.productMatch.productId !== input.productId) {
      throw new Error('Deze concurrent URL is al aan een ander product gekoppeld.')
    }

    const match = await tx.productMatch.upsert({
      where: { competitorOfferId: offer.id },
      update: {
        productId: input.productId,
        confidenceScore: 100,
        matchStatus: MatchStatus.CERTAIN,
        matchEvidence: { source: 'manual', reason: 'Handmatig aan product gekoppeld' },
        approvedAt: new Date(),
      },
      create: {
        productId: input.productId,
        competitorOfferId: offer.id,
        confidenceScore: 100,
        matchStatus: MatchStatus.CERTAIN,
        matchEvidence: { source: 'manual', reason: 'Handmatig aan product gekoppeld' },
        approvedAt: new Date(),
      },
    })

    await tx.competitorOffer.update({
      where: { id: offer.id },
      data: { productMatchId: match.id },
    })

    return { offerId: offer.id, competitorId: competitor.id }
  })

  const initialCheck = await runPriceCheck(result.offerId)
  return { ...result, initialCheck }
}
