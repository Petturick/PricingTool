import { FeedFormat, FeedSourceType, FeedSyncStatus, Prisma } from '@/generated/prisma/client'
import { fetchAndParseFeed, type ParsedFeed } from '@/lib/feed-parser'
import { prisma } from '@/lib/prisma'

export type CanonicalFeedProduct = {
  articleNumber?: unknown
  ean?: unknown
  gtin?: unknown
  name?: unknown
  productGroup?: unknown
  ownPrice?: unknown
  currency?: unknown
  stockStatus?: unknown
  packagingUnit?: unknown
  packagingQty?: unknown
  isActive?: unknown
  sourceUpdatedAt?: unknown
  [key: string]: unknown
}

type Mapping = { sourceColumn: string; targetField: string | null; sampleValue: string }

const FIELD_ALIASES: Record<string, string[]> = {
  articleNumber: ['articlenumber', 'article_number', 'artikelnummer', 'artikel_nummer', 'sku', 'productsku', 'product_sku', 'itemnumber', 'item_number'],
  ean: ['ean', 'ean13', 'barcode'],
  gtin: ['gtin', 'gtin13', 'gtin14'],
  name: ['name', 'productname', 'product_name', 'producttitle', 'product_title', 'title', 'naam', 'productnaam'],
  productGroup: ['productgroup', 'product_group', 'productgroep', 'category', 'category1', 'category_1', 'categorie'],
  ownPrice: ['ownprice', 'own_price', 'price', 'specialprice', 'special_price', 'salesprice', 'sales_price', 'verkoopprijs', 'prijs'],
  currency: ['currency', 'currencycode', 'currency_code', 'valuta'],
  stockStatus: ['stockstatus', 'stock_status', 'availability', 'voorraadstatus', 'voorraad'],
  packagingUnit: ['packagingunit', 'packaging_unit', 'unit', 'eenheid', 'verpakkingseenheid'],
  packagingQty: ['packagingqty', 'packaging_qty', 'quantityperpack', 'quantity_per_pack', 'packqty', 'aantalperverpakking'],
  isActive: ['isactive', 'is_active', 'active', 'enabled', 'status'],
  sourceUpdatedAt: ['sourceupdatedat', 'source_updated_at', 'updatedat', 'updated_at', 'modifiedat', 'modified_at', 'lastmodified'],
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function inferTargetField(header: string) {
  const normalized = normalizeKey(header)
  for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((alias) => normalizeKey(alias) === normalized)) return target
  }
  return null
}

export function inferMappings(headers: string[], sample: Record<string, string> = {}): Mapping[] {
  return headers.map((sourceColumn) => ({
    sourceColumn,
    targetField: inferTargetField(sourceColumn),
    sampleValue: sample[sourceColumn] ?? '',
  }))
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return null
  const result = String(value).trim()
  return result ? result : null
}

function decimalValue(value: unknown) {
  const text = stringValue(value)
  if (!text) return null
  const cleaned = text.replace(/[^0-9,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) && parsed >= 0 ? new Prisma.Decimal(parsed) : null
}

function integerValue(value: unknown, fallback = 1) {
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback
}

function booleanValue(value: unknown, fallback = true) {
  if (typeof value === 'boolean') return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['0', 'false', 'nee', 'no', 'inactive', 'disabled'].includes(normalized)) return false
  if (['1', 'true', 'ja', 'yes', 'active', 'enabled'].includes(normalized)) return true
  return fallback
}

function mapRow(row: Record<string, string>, mappings: Mapping[]): CanonicalFeedProduct {
  const mapped: CanonicalFeedProduct = {}
  for (const mapping of mappings) {
    if (!mapping.targetField) continue
    const current = mapped[mapping.targetField]
    const value = row[mapping.sourceColumn]
    if (mapping.targetField === 'ownPrice' && current && normalizeKey(mapping.sourceColumn) === 'price') continue
    if (value !== undefined && value !== '') mapped[mapping.targetField] = value
  }
  return mapped
}

async function saveMappings(feedSourceId: string, mappings: Mapping[]) {
  await prisma.$transaction(async (tx) => {
    await tx.feedColumnMapping.deleteMany({ where: { feedSourceId } })
    if (mappings.length > 0) {
      await tx.feedColumnMapping.createMany({
        data: mappings.map((mapping, position) => ({
          feedSourceId,
          sourceColumn: mapping.sourceColumn,
          targetField: mapping.targetField,
          dataType: 'text',
          sampleValue: mapping.sampleValue.slice(0, 500),
          position,
        })),
      })
    }
  })
}

type FeedMarket = { id: string; code: string; currency: string } | null

async function importOneProduct(feedSourceId: string, rowIndex: number, raw: Record<string, unknown>, mapped: CanonicalFeedProduct, market: FeedMarket) {
  const articleNumber = stringValue(mapped.articleNumber)
  const name = stringValue(mapped.name)
  if (!articleNumber || !name) throw new Error('Artikelnummer/SKU en productnaam zijn verplicht.')

  const groupName = stringValue(mapped.productGroup) ?? 'Onbekend'
  const ownPrice = decimalValue(mapped.ownPrice)
  const suppliedCurrency = stringValue(mapped.currency)?.toUpperCase()
  const effectiveCurrency = market?.currency.toUpperCase() ?? suppliedCurrency ?? 'EUR'
  if (market && suppliedCurrency && suppliedCurrency !== market.currency.toUpperCase() && ownPrice) {
    throw new Error(`Feedvaluta ${suppliedCurrency} wijkt af van marktvaluta ${market.currency}. Configureer eerst een actuele wisselkoersbron.`)
  }
  const active = booleanValue(mapped.isActive, true)
  const packagingQty = integerValue(mapped.packagingQty)
  const sourceUpdatedAt = stringValue(mapped.sourceUpdatedAt)
  const parsedSourceDate = sourceUpdatedAt && !Number.isNaN(Date.parse(sourceUpdatedAt)) ? new Date(sourceUpdatedAt) : null
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const group = await tx.productGroup.upsert({
      where: { name: groupName },
      update: { isActive: true },
      create: { name: groupName, description: 'Automatisch aangemaakt vanuit productfeed.' },
    })

    const existing = await tx.product.findUnique({ where: { articleNumber } })
    const descriptiveData = {
      name,
      ean: stringValue(mapped.ean) ?? undefined,
      gtin: stringValue(mapped.gtin) ?? stringValue(mapped.ean) ?? undefined,
      productGroupId: group.id,
      packagingUnit: stringValue(mapped.packagingUnit) ?? undefined,
      packagingQty,
      isActive: active,
    }
    const product = await tx.product.upsert({
      where: { articleNumber },
      update: market
        ? descriptiveData
        : {
            ...descriptiveData,
            ownPrice: ownPrice ?? undefined,
            currency: effectiveCurrency,
            stockStatus: stringValue(mapped.stockStatus) ?? undefined,
          },
      create: {
        articleNumber,
        name,
        ean: stringValue(mapped.ean),
        gtin: stringValue(mapped.gtin) ?? stringValue(mapped.ean),
        productGroupId: group.id,
        ownPrice: market ? null : ownPrice,
        currency: effectiveCurrency,
        stockStatus: market ? null : (stringValue(mapped.stockStatus) ?? 'Onbekend'),
        packagingUnit: stringValue(mapped.packagingUnit) ?? 'stuks',
        packagingQty,
        isActive: active,
      },
    })

    if (market) {
      const existingMarket = await tx.productMarket.findUnique({ where: { productId_countryId: { productId: product.id, countryId: market.id } } })
      await tx.productMarket.upsert({
        where: { productId_countryId: { productId: product.id, countryId: market.id } },
        update: {
          ownPrice: ownPrice ?? null,
          currency: market.currency,
          stockStatus: stringValue(mapped.stockStatus),
          isActive: active,
        },
        create: {
          productId: product.id,
          countryId: market.id,
          ownPrice,
          currency: market.currency,
          stockStatus: stringValue(mapped.stockStatus),
          isActive: active,
        },
      })

      if (ownPrice && (!existingMarket?.ownPrice || !existingMarket.ownPrice.eq(ownPrice) || existingMarket.currency !== market.currency)) {
        await tx.ownPriceHistory.create({
          data: { productId: product.id, countryId: market.id, recordedAt: now, price: ownPrice, currency: market.currency },
        })
      }
    } else if (ownPrice && (!existing?.ownPrice || !existing.ownPrice.eq(ownPrice) || existing.currency !== effectiveCurrency)) {
      await tx.ownPriceHistory.create({
        data: { productId: product.id, countryId: null, recordedAt: now, price: ownPrice, currency: effectiveCurrency },
      })
    }

    await tx.productFeedLink.upsert({
      where: { feedSourceId_externalKey: { feedSourceId, externalKey: articleNumber } },
      update: { productId: product.id, sourceUpdatedAt: parsedSourceDate, lastSeenAt: now },
      create: { feedSourceId, productId: product.id, externalKey: articleNumber, sourceUpdatedAt: parsedSourceDate, lastSeenAt: now },
    })

    await tx.feedItem.create({
      data: {
        feedSourceId,
        externalKey: articleNumber,
        rowIndex,
        rawData: raw as Prisma.InputJsonValue,
        mappedData: mapped as Prisma.InputJsonValue,
        status: 'IMPORTED',
        importedProductId: product.id,
      },
    })

    return product
  })
}

async function processCanonicalRows(feedSourceId: string, rows: Array<{ raw: Record<string, unknown>; mapped: CanonicalFeedProduct }>, countryCode = 'GLOBAL') {
  const normalizedCountryCode = countryCode.toUpperCase()
  const market = normalizedCountryCode === 'GLOBAL'
    ? null
    : await prisma.country.findFirst({ where: { code: normalizedCountryCode, isActive: true }, select: { id: true, code: true, currency: true } })
  if (normalizedCountryCode !== 'GLOBAL' && !market) throw new Error(`Landcode ${countryCode} bestaat niet of is niet actief.`)

  await prisma.feedItem.deleteMany({ where: { feedSourceId } })
  let imported = 0
  let errors = 0
  const errorMessages: string[] = []

  for (const [index, item] of rows.entries()) {
    try {
      await importOneProduct(feedSourceId, index + 1, item.raw, item.mapped, market)
      imported += 1
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : 'Onbekende importfout'
      if (errorMessages.length < 20) errorMessages.push(`Rij ${index + 1}: ${message}`)
      await prisma.feedItem.create({
        data: {
          feedSourceId,
          externalKey: stringValue(item.mapped.articleNumber),
          rowIndex: index + 1,
          rawData: item.raw as Prisma.InputJsonValue,
          mappedData: item.mapped as Prisma.InputJsonValue,
          status: 'ERROR',
          errorMessage: message,
        },
      })
    }
  }

  return { imported, errors, errorMessages }
}

async function startRun(feedSourceId: string) {
  await prisma.feedSource.update({ where: { id: feedSourceId }, data: { lastRunStatus: FeedSyncStatus.RUNNING, syncError: null } })
  return prisma.feedSyncRun.create({ data: { feedSourceId, status: FeedSyncStatus.RUNNING } })
}

async function completeRun(feedSourceId: string, runId: string, result: { itemCount: number; imported: number; errors: number; warnings?: number; message?: string }) {
  const now = new Date()
  const status = result.imported === 0 && result.errors > 0 ? FeedSyncStatus.FAILED : FeedSyncStatus.COMPLETED
  await prisma.$transaction([
    prisma.feedSource.update({
      where: { id: feedSourceId },
      data: {
        lastRunAt: now,
        lastRunStatus: status,
        lastItemCount: result.itemCount,
        lastErrorCount: result.errors,
        lastWarningCount: result.warnings ?? 0,
        syncError: status === FeedSyncStatus.FAILED ? result.message ?? 'Alle feedregels zijn mislukt.' : null,
      },
    }),
    prisma.feedSyncRun.update({
      where: { id: runId },
      data: {
        status,
        completedAt: now,
        itemCount: result.itemCount,
        errorCount: result.errors,
        warningCount: result.warnings ?? 0,
        message: result.message,
      },
    }),
  ])
}

async function failRun(feedSourceId: string, runId: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Onbekende synchronisatiefout'
  const now = new Date()
  await prisma.$transaction([
    prisma.feedSource.update({ where: { id: feedSourceId }, data: { lastRunAt: now, lastRunStatus: FeedSyncStatus.FAILED, syncError: message } }),
    prisma.feedSyncRun.update({ where: { id: runId }, data: { status: FeedSyncStatus.FAILED, completedAt: now, message } }),
  ])
  return message
}

function parsedRows(parsed: ParsedFeed, mappings: Mapping[]) {
  return parsed.rows.map((row) => ({ raw: row as Record<string, unknown>, mapped: mapRow(row, mappings) }))
}

export async function syncFeedSource(feedSourceId: string) {
  const source = await prisma.feedSource.findUnique({ where: { id: feedSourceId } })
  if (!source) throw new Error('Feedbron niet gevonden.')
  if (!source.url) throw new Error('Deze feedbron heeft geen URL.')
  if (!source.isActive) throw new Error('Deze feedbron is gepauzeerd.')

  const run = await startRun(feedSourceId)
  try {
    const parsed = await fetchAndParseFeed(source.url)
    const mappings = inferMappings(parsed.headers, parsed.rows[0] ?? {})
    await saveMappings(feedSourceId, mappings)
    const processed = await processCanonicalRows(feedSourceId, parsedRows(parsed, mappings), source.countryCode)
    await prisma.feedSource.update({ where: { id: feedSourceId }, data: { format: parsed.format as FeedFormat, isActive: true } })
    const message = `${processed.imported} producten bijgewerkt${processed.errors ? `, ${processed.errors} regels met fouten` : ''}.`
    await completeRun(feedSourceId, run.id, { itemCount: parsed.rows.length, imported: processed.imported, errors: processed.errors, message })
    if (processed.imported === 0 && processed.errors > 0) throw new Error(`Geen producten geïmporteerd. ${processed.errorMessages[0] ?? 'Controleer de feedmapping.'}`)
    return { rows: parsed.rows.length, columns: parsed.headers.length, format: parsed.format, ...processed }
  } catch (error) {
    const currentRun = await prisma.feedSyncRun.findUnique({ where: { id: run.id }, select: { status: true } })
    if (currentRun?.status === FeedSyncStatus.RUNNING) await failRun(feedSourceId, run.id, error)
    throw error instanceof Error ? error : new Error('Onbekende synchronisatiefout')
  }
}

export async function ingestCanonicalProducts(input: {
  sourceKey: string
  sourceName: string
  sourceType?: FeedSourceType
  countryCode?: string
  products: CanonicalFeedProduct[]
  config?: Prisma.InputJsonValue
}) {
  const countryCode = (input.countryCode ?? 'GLOBAL').toUpperCase()
  const source = await prisma.feedSource.upsert({
    where: { sourceKey: input.sourceKey },
    update: { name: input.sourceName, sourceType: input.sourceType ?? FeedSourceType.API, countryCode, isActive: true, config: input.config },
    create: { sourceKey: input.sourceKey, name: input.sourceName, sourceType: input.sourceType ?? FeedSourceType.API, format: FeedFormat.API, countryCode, isActive: true, config: input.config },
  })

  const run = await startRun(source.id)
  try {
    const headers = [...new Set(input.products.flatMap((item) => Object.keys(item)))]
    await saveMappings(source.id, headers.map((sourceColumn) => ({ sourceColumn, targetField: sourceColumn, sampleValue: stringValue(input.products[0]?.[sourceColumn]) ?? '' })))
    const processed = await processCanonicalRows(source.id, input.products.map((product) => ({ raw: product, mapped: product })), source.countryCode)
    const message = `${processed.imported} producten via API bijgewerkt${processed.errors ? `, ${processed.errors} regels met fouten` : ''}.`
    await completeRun(source.id, run.id, { itemCount: input.products.length, imported: processed.imported, errors: processed.errors, message })
    if (processed.imported === 0 && processed.errors > 0) throw new Error(`Geen producten geïmporteerd. ${processed.errorMessages[0] ?? 'Controleer de payload.'}`)
    return { feedSourceId: source.id, rows: input.products.length, ...processed }
  } catch (error) {
    const currentRun = await prisma.feedSyncRun.findUnique({ where: { id: run.id }, select: { status: true } })
    if (currentRun?.status === FeedSyncStatus.RUNNING) await failRun(source.id, run.id, error)
    throw error instanceof Error ? error : new Error('Onbekende synchronisatiefout')
  }
}
