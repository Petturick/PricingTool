import { MatchStatus, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { runPriceCheck } from '@/lib/price-monitoring'
import { validatePublicHttpUrl } from '@/lib/safe-remote-url'

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
  approvedBy?: string | null
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

  const productCurrency = (input.currency ?? countries[0]?.currency ?? 'EUR').toUpperCase()
  const ownPrice = decimal(input.ownPrice)
  if (ownPrice && countries.some((country) => country.currency.toUpperCase() !== productCurrency)) {
    throw new Error('Eén eigen prijs kan alleen tegelijk aan landen met dezelfde valuta worden toegewezen. Voeg markten met een andere valuta daarna apart toe.')
  }

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
        currency: productCurrency,
        stockStatus: input.stockStatus,
        notes: input.notes,
        isActive: input.isActive ?? true,
        markets: {
          create: countries.map((country) => ({
            countryId: country.id,
            ownPrice,
            currency: country.currency,
            stockStatus: input.stockStatus,
            isActive: true,
          })),
        },
      },
    })

    if (ownPrice) {
      if (countries.length > 0) {
        await tx.ownPriceHistory.createMany({
          data: countries.map((country) => ({
            productId: product.id,
            countryId: country.id,
            recordedAt: new Date(),
            price: ownPrice,
            currency: country.currency,
          })),
        })
      } else {
        await tx.ownPriceHistory.create({
          data: {
            productId: product.id,
            countryId: null,
            recordedAt: new Date(),
            price: ownPrice,
            currency: productCurrency,
          },
        })
      }
    }

    return product
  })
}

export async function setProductMarket(input: ProductMarketInput) {
  const [country, product, existing] = await Promise.all([
    prisma.country.findFirst({ where: { id: input.countryId, isActive: true } }),
    prisma.product.findUnique({ where: { id: input.productId } }),
    prisma.productMarket.findUnique({ where: { productId_countryId: { productId: input.productId, countryId: input.countryId } } }),
  ])
  if (!country) throw new Error('Het geselecteerde land bestaat niet of is niet actief.')
  if (!product) throw new Error('Product niet gevonden.')

  const currency = (input.currency || country.currency).toUpperCase()
  if (currency !== country.currency.toUpperCase()) {
    throw new Error(`De markt ${country.name} gebruikt ${country.currency}; stel eerst een wisselkoersbron in voordat een andere valuta wordt gebruikt.`)
  }
  const ownPrice = decimal(input.ownPrice)
  const ownUrl = input.ownUrl ? validatePublicHttpUrl(input.ownUrl, 'De eigen product URL').toString() : null

  return prisma.$transaction(async (tx) => {
    const market = await tx.productMarket.upsert({
      where: { productId_countryId: { productId: input.productId, countryId: input.countryId } },
      update: {
        ownPrice,
        currency,
        ownUrl,
        stockStatus: input.stockStatus || null,
        isActive: input.isActive ?? true,
      },
      create: {
        productId: input.productId,
        countryId: input.countryId,
        ownPrice,
        currency,
        ownUrl,
        stockStatus: input.stockStatus || null,
        isActive: input.isActive ?? true,
      },
    })

    const priceChanged = Boolean(ownPrice && (!existing?.ownPrice || !existing.ownPrice.eq(ownPrice) || existing.currency !== currency))
    if (priceChanged) {
      await tx.ownPriceHistory.create({
        data: {
          productId: input.productId,
          countryId: input.countryId,
          recordedAt: new Date(),
          price: ownPrice!,
          currency,
        },
      })
    }
    return market
  })
}

export async function linkCompetitorOffer(input: CompetitorOfferInput) {
  const competitorWebsite = validatePublicHttpUrl(input.competitorWebsite, 'De website van de concurrent').toString()
  const offerUrl = validatePublicHttpUrl(input.offerUrl, 'De product URL van de concurrent').toString()
  const country = await prisma.country.findFirst({ where: { id: input.countryId, isActive: true } })
  if (!country) throw new Error('Het geselecteerde land bestaat niet of is niet actief.')
  const currency = (input.currency || country.currency).toUpperCase()
  if (currency !== country.currency.toUpperCase()) {
    throw new Error(`De concurrentbron voor ${country.name} moet in ${country.currency} worden opgeslagen zolang geen actuele wisselkoersbron is ingesteld.`)
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } })
    if (!product) throw new Error('Product niet gevonden.')

    const competitor = await tx.competitor.upsert({
      where: { name_countryId: { name: input.competitorName, countryId: input.countryId } },
      update: {
        website: competitorWebsite,
        checkFrequencyHours: input.checkFrequencyHours ?? 24,
        isActive: true,
      },
      create: {
        name: input.competitorName,
        website: competitorWebsite,
        countryId: input.countryId,
        checkFrequencyHours: input.checkFrequencyHours ?? 24,
        isActive: true,
      },
    })

    const offer = await tx.competitorOffer.upsert({
      where: { competitorId_url: { competitorId: competitor.id, url: offerUrl } },
      update: {
        currency,
        vatIncluded: input.vatIncluded ?? true,
        packagingUnit: input.packagingUnit || null,
        packagingQty: input.packagingQty ?? 1,
        isActive: true,
      },
      create: {
        competitorId: competitor.id,
        url: offerUrl,
        currency,
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
        approvedBy: input.approvedBy ?? null,
        approvedAt: new Date(),
      },
      create: {
        productId: input.productId,
        competitorOfferId: offer.id,
        confidenceScore: 100,
        matchStatus: MatchStatus.CERTAIN,
        matchEvidence: { source: 'manual', reason: 'Handmatig aan product gekoppeld' },
        approvedBy: input.approvedBy ?? null,
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
