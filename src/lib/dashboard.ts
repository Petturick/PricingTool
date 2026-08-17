import { MatchStatus, Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { calculatePriceDifference } from '@/lib/price-normalization'
import { decimalToNumber } from '@/lib/format'

export type DashboardFilters = {
  countryId?: string
  productGroupId?: string
  competitorId?: string
  matchStatus?: MatchStatus | ''
  q?: string
}

const productInclude = {
  productGroup: true,
  markets: { include: { country: true } },
  ownPriceHistory: { orderBy: { recordedAt: 'desc' as const }, take: 8 },
  matches: {
    include: {
      competitorOffer: {
        include: {
          competitor: { include: { country: true } },
          priceHistory: { orderBy: { recordedAt: 'desc' as const }, take: 5 },
          priceChecks: { orderBy: { checkedAt: 'desc' as const }, take: 3 },
        },
      },
    },
  },
} satisfies Prisma.ProductInclude

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>

const competitorInclude = {
  country: true,
  offers: {
    include: {
      productMatch: { include: { product: { include: { markets: true } } } },
      priceChecks: true,
      priceHistory: { orderBy: { recordedAt: 'desc' as const }, take: 3 },
    },
  },
} satisfies Prisma.CompetitorInclude

export type CompetitorWithRelations = Prisma.CompetitorGetPayload<{ include: typeof competitorInclude }>

export async function getFilterOptions() {
  const [countries, productGroups, competitors] = await Promise.all([
    prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.productGroup.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.competitor.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { country: true } }),
  ])

  return { countries, productGroups, competitors }
}

export async function getFilteredProducts(filters: DashboardFilters = {}) {
  return prisma.product.findMany({
    where: {
      isActive: true,
      productGroupId: filters.productGroupId || undefined,
      markets: filters.countryId ? { some: { countryId: filters.countryId, isActive: true } } : undefined,
      OR: filters.q
        ? [
            { articleNumber: { contains: filters.q } },
            { name: { contains: filters.q } },
            { ean: { contains: filters.q } },
          ]
        : undefined,
    },
    include: productInclude,
    orderBy: [{ productGroup: { name: 'asc' } }, { articleNumber: 'asc' }],
  })
}

function getFilteredMatches(product: ProductWithRelations, filters: DashboardFilters) {
  return product.matches.filter((match) => {
    if (!match.competitorOffer.isActive || !match.competitorOffer.competitor.isActive) return false
    if (filters.matchStatus && match.matchStatus !== filters.matchStatus) return false
    if (filters.competitorId && match.competitorOffer.competitorId !== filters.competitorId) return false
    if (filters.countryId && match.competitorOffer.competitor.countryId !== filters.countryId) return false
    return true
  })
}

export function deriveProductMetrics(product: ProductWithRelations, filters: DashboardFilters = {}) {
  const relevantMatches = getFilteredMatches(product, filters)
  const selectedMarket = filters.countryId
    ? product.markets.find((market) => market.countryId === filters.countryId && market.isActive)
    : null
  const marketCurrency = selectedMarket?.currency ?? selectedMarket?.country.currency ?? null
  const comparableMatches = filters.countryId && marketCurrency
    ? relevantMatches.filter((match) => (match.competitorOffer.currency ?? match.competitorOffer.competitor.country.currency).toUpperCase() === marketCurrency.toUpperCase())
    : []
  const pricedOffers = comparableMatches.filter((match) => match.competitorOffer.normalizedPrice !== null)
  const prices = pricedOffers.map((match) => decimalToNumber(match.competitorOffer.normalizedPrice)).filter((value): value is number => value !== null)
  const lowestPrice = prices.length ? Math.min(...prices) : null
  const averagePrice = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : null
  const lastCheckedDates = relevantMatches.map((match) => match.competitorOffer.lastCheckedAt).filter((value): value is Date => Boolean(value))
  const lastCheckedAt = lastCheckedDates.length ? new Date(Math.max(...lastCheckedDates.map((value) => value.getTime()))) : null
  const ownPrice = selectedMarket
    ? decimalToNumber(selectedMarket.ownPrice ?? (product.currency === marketCurrency ? product.ownPrice : null))
    : null
  const difference = calculatePriceDifference(ownPrice, lowestPrice)
  const trendSource = pricedOffers
    .flatMap((match) => match.competitorOffer.priceHistory)
    .filter((history) => (history.currency ?? marketCurrency)?.toUpperCase() === marketCurrency?.toUpperCase())
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
  const latestHistory = trendSource[0]
  const previousHistory = trendSource[1]
  const trendDelta = latestHistory && previousHistory ? decimalToNumber(latestHistory.normalizedPrice ?? latestHistory.price)! - decimalToNumber(previousHistory.normalizedPrice ?? previousHistory.price)! : null
  const validMatches = relevantMatches.filter((match) => match.matchStatus === MatchStatus.CERTAIN)
  const reviewMatches = relevantMatches.filter((match) => match.matchStatus === MatchStatus.REVIEW)
  const stale = !lastCheckedAt || Date.now() - lastCheckedAt.getTime() > 72 * 60 * 60 * 1000
  const lowestOffer = pricedOffers.sort((a, b) => Number(a.competitorOffer.normalizedPrice) - Number(b.competitorOffer.normalizedPrice))[0]

  return {
    product,
    selectedMarket,
    currency: marketCurrency,
    ownPrice,
    lowestPrice,
    averagePrice,
    difference,
    offerCount: relevantMatches.filter((match) => match.competitorOffer.normalizedPrice !== null).length,
    comparableOfferCount: pricedOffers.length,
    validMatches: validMatches.length,
    reviewMatches: reviewMatches.length,
    lastCheckedAt,
    trendDelta,
    stale,
    lowestOffer,
    marketPosition:
      !filters.countryId
        ? 'Selecteer land'
        : lowestPrice === null
          ? 'Geen concurrentieprijs'
          : difference.position === 'LAAGSTE'
            ? 'Engels laagste'
            : difference.position === 'DUURDER'
              ? 'Engels duurder'
              : 'Gelijk aan markt',
  }
}

export type DashboardSnapshot = Awaited<ReturnType<typeof getDashboardSnapshot>>

export async function getDashboardSnapshot(filters: DashboardFilters = {}) {
  const [products, failedChecks, staleOffers, filterOptions] = await Promise.all([
    getFilteredProducts(filters),
    prisma.priceCheck.findMany({
      where: {
        isSuccess: false,
        competitorOffer: filters.countryId ? { competitor: { countryId: filters.countryId } } : undefined,
      },
      include: { competitorOffer: { include: { competitor: { include: { country: true } }, productMatch: { include: { product: true } } } } },
      orderBy: { checkedAt: 'desc' },
      take: 10,
    }),
    prisma.competitorOffer.findMany({
      where: {
        isActive: true,
        competitor: filters.countryId ? { countryId: filters.countryId } : undefined,
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: new Date(Date.now() - 72 * 60 * 60 * 1000) } }],
      },
      include: { competitor: { include: { country: true } }, productMatch: { include: { product: true } } },
      orderBy: { lastCheckedAt: 'asc' },
      take: 10,
    }),
    getFilterOptions(),
  ])

  const metrics = products.map((product) => deriveProductMetrics(product, filters))
  const allOfferMoves = products
    .flatMap((product) =>
      product.matches.flatMap((match) => {
        const offer = match.competitorOffer
        if (!offer.isActive || !offer.competitor.isActive) return []
        if (filters.countryId && offer.competitor.countryId !== filters.countryId) return []
        const [current, previous] = offer.priceHistory
        if (!current || !previous) return []
        const currentPrice = decimalToNumber(current.normalizedPrice ?? current.price)
        const previousPrice = decimalToNumber(previous.normalizedPrice ?? previous.price)
        if (currentPrice === null || previousPrice === null || current.currency !== previous.currency) return []
        return [{
          id: `${product.id}-${match.id}`,
          productName: product.name,
          competitor: offer.competitor.name,
          countryCode: offer.competitor.country.code,
          currency: current.currency,
          latestPrice: currentPrice,
          previousPrice,
          delta: currentPrice - previousPrice,
          recordedAt: current.recordedAt,
        }]
      }),
    )
    .sort((a, b) => b.delta - a.delta)

  const comparableProducts = filters.countryId ? metrics.filter((item) => item.lowestPrice !== null && item.ownPrice !== null) : []
  const averagePriceIndex = comparableProducts.length
    ? comparableProducts.reduce((sum, item) => sum + ((item.ownPrice ?? 0) / (item.lowestPrice ?? 1)) * 100, 0) / comparableProducts.length
    : null

  return {
    filterOptions,
    metrics,
    kpis: {
      monitoredProducts: products.length,
      activeOffers: metrics.reduce((sum, item) => sum + item.offerCount, 0),
      validMatches: metrics.filter((item) => item.validMatches > 0).length,
      reviewMatches: metrics.reduce((sum, item) => sum + item.reviewMatches, 0),
      withoutCompetitorPrice: filters.countryId ? metrics.filter((item) => item.lowestPrice === null).length : 0,
      engelsLowest: filters.countryId ? metrics.filter((item) => item.marketPosition === 'Engels laagste').length : 0,
      engelsHigher: filters.countryId ? metrics.filter((item) => item.marketPosition === 'Engels duurder').length : 0,
      averagePriceIndex,
      failedChecks: failedChecks.length,
      staleData: staleOffers.length,
    },
    biggestIncreases: allOfferMoves.slice(0, 5),
    biggestDecreases: [...allOfferMoves].sort((a, b) => a.delta - b.delta).slice(0, 5),
    failedChecks,
    staleOffers,
  }
}

export async function getCompetitorsOverview() {
  return prisma.competitor.findMany({
    where: { isActive: true },
    include: competitorInclude,
    orderBy: [{ country: { name: 'asc' } }, { name: 'asc' }],
  })
}

export function deriveCompetitorMetrics(competitor: CompetitorWithRelations) {
  const matchedOffers = competitor.offers.filter((offer) => offer.productMatch)
  const validPrices = competitor.offers.filter((offer) => offer.normalizedPrice !== null)
  const positions = matchedOffers.map((offer) => {
    const market = offer.productMatch?.product.markets.find((item) => item.countryId === competitor.countryId && item.isActive)
    const ownPrice = decimalToNumber(market?.ownPrice ?? (offer.productMatch?.product.currency === competitor.country.currency ? offer.productMatch?.product.ownPrice : null))
    const competitorPrice = decimalToNumber(offer.normalizedPrice)
    return calculatePriceDifference(ownPrice, competitorPrice)
  })
  const lowerCount = positions.filter((position) => position.position === 'LAAGSTE').length
  const comparableCount = positions.filter((position) => position.position !== 'GEEN_DATA').length
  const failedChecks = competitor.offers.flatMap((offer) => offer.priceChecks).filter((check) => !check.isSuccess)
  const totalChecks = competitor.offers.flatMap((offer) => offer.priceChecks)
  const lastChecked = competitor.offers
    .map((offer) => offer.lastCheckedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null

  return {
    linkedProducts: matchedOffers.length,
    validPrices: validPrices.length,
    averagePositionPct: comparableCount ? (lowerCount / comparableCount) * 100 : null,
    lastChecked,
    failedRate: totalChecks.length ? (failedChecks.length / totalChecks.length) * 100 : null,
  }
}
