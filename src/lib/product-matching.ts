type ProductInput = {
  articleNumber?: string | null
  ean?: string | null
  gtin?: string | null
  name: string
  packagingUnit?: string | null
  packagingQty?: number | null
}

type OfferInput = {
  sku?: string | null
  ean?: string | null
  gtin?: string | null
  productTitle?: string | null
  packagingUnit?: string | null
  packagingQty?: number | null
  url?: string | null
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string | null | undefined) {
  return new Set(normalizeText(value).split(' ').filter(Boolean))
}

function dimensionsFromText(value: string | null | undefined): string[] {
  return normalizeText(value).match(/\d+[x×]\d+(?:[x×]\d+)?/g) ?? []
}

export function matchProducts(product: ProductInput, offer: OfferInput) {
  let score = 0
  const evidence: Record<string, unknown> = {}

  const productEan = product.ean ?? product.gtin
  const offerEan = offer.ean ?? offer.gtin
  if (productEan && offerEan && productEan === offerEan) {
    score = 100
    evidence.ean = { product: productEan, offer: offerEan, match: true }
  } else if (product.articleNumber && offer.sku && normalizeText(product.articleNumber) === normalizeText(offer.sku)) {
    score = 95
    evidence.sku = { product: product.articleNumber, offer: offer.sku, match: true }
  } else {
    const productWords = tokenize(product.name)
    const offerWords = tokenize(offer.productTitle)
    const sharedWords = [...productWords].filter((word) => offerWords.has(word))
    const denominator = Math.max(productWords.size, 1)
    const nameScore = Math.round((sharedWords.length / denominator) * 50)
    score += nameScore
    evidence.name = { sharedWords, nameScore }

    if ((product.packagingUnit ?? '').toLowerCase() === (offer.packagingUnit ?? '').toLowerCase()) {
      score += 15
      evidence.packagingUnit = product.packagingUnit
    }

    if (product.packagingQty && offer.packagingQty && product.packagingQty === offer.packagingQty) {
      score += 15
      evidence.packagingQty = product.packagingQty
    }

    const productDimensions = dimensionsFromText(product.name)
    const offerDimensions = dimensionsFromText(offer.productTitle)
    const dimensionMatch = productDimensions.find((dimension) => offerDimensions.includes(dimension))
    if (dimensionMatch) {
      score += 20
      evidence.dimensions = dimensionMatch
    }
  }

  const status = score >= 95 ? 'CERTAIN' : score >= 80 ? 'REVIEW' : 'UNRELIABLE'
  return { score: Math.min(score, 100), evidence, status }
}
