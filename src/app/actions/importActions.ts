'use server'

import { ImportFormat, ImportStatus, MatchStatus, Prisma } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/audit'
import { requireUser, WRITE_ROLES } from '@/lib/authz'
import { matchProducts } from '@/lib/product-matching'
import { normalizePrice } from '@/lib/price-normalization'
import { prisma } from '@/lib/prisma'
import { validatePublicHttpUrl } from '@/lib/safe-remote-url'
import { importPayloadSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'

function toDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).replace(',', '.')
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return new Prisma.Decimal(numeric)
}

function rowTimestamp(value: string | undefined) {
  if (!value) return new Date()
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Ongeldige controledatum: ${value}`)
  return date
}

export async function processImportRowsAction(payload: unknown) {
  const currentUser = await requireUser(WRITE_ROLES)
  const parsed = importPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return {
      message: 'Import afgekeurd door validatie.',
      warnings: [],
      errors: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const warnings: string[] = []
  const errors: string[] = []
  const task = await prisma.importTask.create({
    data: {
      filename: parsed.data.filename,
      format: parsed.data.format as ImportFormat,
      status: ImportStatus.PROCESSING,
      totalRows: parsed.data.rows.length,
      processedRows: 0,
      errorRows: 0,
      importedBy: currentUser.id,
    },
  })

  let processedRows = 0

  for (const [index, row] of parsed.data.rows.entries()) {
    try {
      const countryCode = (row.country || 'NL').trim().toUpperCase()
      const country = await prisma.country.findFirst({ where: { code: countryCode, isActive: true } })
      if (!country) {
        warnings.push(`Rij ${index + 1}: land ${countryCode} bestaat niet of is niet actief en is overgeslagen.`)
        continue
      }

      const marketCurrency = country.currency.toUpperCase()
      const suppliedCurrency = (row.currency || marketCurrency).trim().toUpperCase()
      if (suppliedCurrency !== marketCurrency && (row.ownPrice || row.competitorPrice)) {
        throw new Error(`Valuta ${suppliedCurrency} wijkt af van marktvaluta ${marketCurrency}; import is geblokkeerd totdat een actuele wisselkoersbron is geconfigureerd.`)
      }

      const articleNumber = row.articleNumber?.trim() || `IMP-${task.id.slice(-6)}-${index + 1}`
      const ownPrice = toDecimal(row.ownPrice)
      const rawPrice = toDecimal(row.competitorPrice)
      const packagingQty = Math.max(1, Number(row.packagingQty || 1) || 1)
      const checkedAt = rowTimestamp(row.lastChecked)
      const productGroupName = row.productGroup?.trim() || 'Onbekend'
      const ownUrl = row.engelsUrl ? validatePublicHttpUrl(row.engelsUrl, 'Eigen product URL').toString() : null
      const competitorName = (row.competitorName || row.webshop || '').trim() || null
      const competitorUrl = row.competitorUrl ? validatePublicHttpUrl(row.competitorUrl, 'Concurrent product URL').toString() : null

      const result = await prisma.$transaction(async (tx) => {
        const productGroup = await tx.productGroup.upsert({
          where: { name: productGroupName },
          update: { isActive: true },
          create: { name: productGroupName, description: `Automatisch aangemaakt via import ${parsed.data.filename}` },
        })

        const product = await tx.product.upsert({
          where: { articleNumber },
          update: {
            ean: row.ean || undefined,
            gtin: row.ean || undefined,
            name: row.productName || articleNumber,
            productGroupId: productGroup.id,
            ownPrice: ownPrice ?? undefined,
            packagingUnit: row.packagingUnit || undefined,
            packagingQty,
            stockStatus: row.ownStock || undefined,
            currency: marketCurrency,
            isActive: true,
          },
          create: {
            articleNumber,
            ean: row.ean || null,
            gtin: row.ean || null,
            name: row.productName || articleNumber,
            productGroupId: productGroup.id,
            ownPrice,
            vatIncluded: true,
            packagingUnit: row.packagingUnit || 'stuks',
            packagingQty,
            stockStatus: row.ownStock || 'Onbekend',
            currency: marketCurrency,
          },
        })

        await tx.productMarket.upsert({
          where: { productId_countryId: { productId: product.id, countryId: country.id } },
          update: { ownPrice, currency: marketCurrency, ownUrl, stockStatus: row.ownStock || undefined, isActive: true },
          create: { productId: product.id, countryId: country.id, ownPrice, currency: marketCurrency, ownUrl, stockStatus: row.ownStock || 'Onbekend', isActive: true },
        })

        if (ownPrice) {
          const latestOwn = await tx.ownPriceHistory.findFirst({ where: { productId: product.id }, orderBy: { recordedAt: 'desc' } })
          if (!latestOwn || !latestOwn.price.eq(ownPrice) || latestOwn.currency !== marketCurrency) {
            await tx.ownPriceHistory.create({
              data: { productId: product.id, recordedAt: checkedAt, price: ownPrice, currency: marketCurrency },
            })
          }
        }

        if (!competitorName) return { productOnlyWarning: 'geen concurrentnaam aanwezig; product en markt zijn wel bijgewerkt.' }
        if (!competitorUrl) return { productOnlyWarning: 'geen concurrent product URL aanwezig; product en markt zijn wel bijgewerkt.' }

        const competitorWebsite = new URL(competitorUrl).origin
        const competitor = await tx.competitor.upsert({
          where: { name_countryId: { name: competitorName, countryId: country.id } },
          update: { website: competitorWebsite, isActive: true },
          create: { name: competitorName, website: competitorWebsite, countryId: country.id },
        })

        const normalized = rawPrice
          ? normalizePrice(rawPrice, true, country.vatRate, marketCurrency, row.packagingUnit || 'stuks', packagingQty, true, marketCurrency).amount
          : null

        const offer = await tx.competitorOffer.upsert({
          where: { competitorId_url: { competitorId: competitor.id, url: competitorUrl } },
          update: {
            rawPrice,
            normalizedPrice: normalized,
            currency: marketCurrency,
            packagingUnit: row.packagingUnit || 'stuks',
            packagingQty,
            stockStatus: row.competitorStock || 'Onbekend',
            lastCheckedAt: checkedAt,
            isActive: true,
          },
          create: {
            competitorId: competitor.id,
            url: competitorUrl,
            rawPrice,
            normalizedPrice: normalized,
            currency: marketCurrency,
            vatIncluded: true,
            packagingUnit: row.packagingUnit || 'stuks',
            packagingQty,
            stockStatus: row.competitorStock || 'Onbekend',
            lastCheckedAt: checkedAt,
          },
        })

        const existingMatch = await tx.productMatch.findUnique({ where: { competitorOfferId: offer.id } })
        if (existingMatch && existingMatch.productId !== product.id) {
          throw new Error('Deze concurrent URL is al aan een ander product gekoppeld.')
        }

        const matchResult = matchProducts(
          {
            articleNumber: product.articleNumber,
            ean: product.ean,
            gtin: product.gtin,
            name: product.name,
            packagingUnit: product.packagingUnit,
            packagingQty: product.packagingQty,
          },
          {
            sku: row.articleNumber,
            ean: row.ean,
            gtin: row.ean,
            productTitle: row.productName,
            packagingUnit: row.packagingUnit,
            packagingQty,
            url: offer.url,
          },
        )

        const approved = matchResult.status === 'CERTAIN'
        const match = await tx.productMatch.upsert({
          where: { competitorOfferId: offer.id },
          update: {
            productId: product.id,
            confidenceScore: matchResult.score,
            matchStatus: matchResult.status as MatchStatus,
            matchEvidence: matchResult.evidence as Prisma.InputJsonValue,
            approvedBy: approved ? currentUser.id : null,
            approvedAt: approved ? checkedAt : null,
          },
          create: {
            productId: product.id,
            competitorOfferId: offer.id,
            confidenceScore: matchResult.score,
            matchStatus: matchResult.status as MatchStatus,
            matchEvidence: matchResult.evidence as Prisma.InputJsonValue,
            approvedBy: approved ? currentUser.id : null,
            approvedAt: approved ? checkedAt : null,
          },
        })

        await tx.competitorOffer.update({ where: { id: offer.id }, data: { productMatchId: match.id } })

        const latestHistory = await tx.priceHistory.findFirst({ where: { competitorOfferId: offer.id }, orderBy: { recordedAt: 'desc' } })
        const duplicateHistory = Boolean(rawPrice && latestHistory && latestHistory.recordedAt.getTime() === checkedAt.getTime() && latestHistory.price.eq(rawPrice))
        if (rawPrice && !duplicateHistory) {
          await tx.priceHistory.create({
            data: {
              competitorOfferId: offer.id,
              recordedAt: checkedAt,
              price: rawPrice,
              normalizedPrice: normalized,
              currency: marketCurrency,
              stockStatus: row.competitorStock || 'Onbekend',
              source: 'Importwizard',
            },
          })
        }

        const latestCheck = await tx.priceCheck.findFirst({ where: { competitorOfferId: offer.id }, orderBy: { checkedAt: 'desc' } })
        const duplicateCheck = Boolean(latestCheck && latestCheck.checkedAt.getTime() === checkedAt.getTime() && ((rawPrice && latestCheck.foundPrice?.eq(rawPrice)) || (!rawPrice && !latestCheck.foundPrice)))
        if (!duplicateCheck) {
          await tx.priceCheck.create({
            data: {
              competitorOfferId: offer.id,
              checkedAt,
              foundPrice: rawPrice,
              currency: marketCurrency,
              stockStatus: row.competitorStock || 'Onbekend',
              productTitle: row.productName || product.name,
              packagingUnit: row.packagingUnit || 'stuks',
              checkMethod: 'IMPORT',
              statusCode: 200,
              sourceUrl: offer.url,
              isSuccess: Boolean(rawPrice),
              errorMessage: rawPrice ? null : 'Prijs ontbrak in importbron',
            },
          })
        }

        return { productOnlyWarning: null }
      })

      if (result.productOnlyWarning) warnings.push(`Rij ${index + 1}: ${result.productOnlyWarning}`)
      processedRows += 1
    } catch (error) {
      errors.push(`Rij ${index + 1}: ${error instanceof Error ? error.message : 'onbekende fout'}`)
    }
  }

  await prisma.importTask.update({
    where: { id: task.id },
    data: {
      status: errors.length > 0 ? ImportStatus.FAILED : ImportStatus.DONE,
      processedRows,
      errorRows: errors.length,
      errors,
      warnings,
    },
  })

  await createAuditLog({
    userId: currentUser.id,
    action: 'IMPORT_CONFIRM',
    entityType: 'ImportTask',
    entityId: task.id,
    newValue: { filename: task.filename, totalRows: parsed.data.rows.length, processedRows, errorRows: errors.length },
  })

  revalidatePath('/import')
  revalidatePath('/dashboard')
  revalidatePath('/producten')
  revalidatePath('/concurrenten')

  return {
    message: `Import verwerkt: ${processedRows} van ${parsed.data.rows.length} regels voltooid.`,
    warnings,
    errors,
  }
}
