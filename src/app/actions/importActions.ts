'use server'

import { ImportFormat, ImportStatus, MatchStatus, Prisma } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/audit'
import { requireUser, WRITE_ROLES } from '@/lib/authz'
import { matchProducts } from '@/lib/product-matching'
import { normalizePrice } from '@/lib/price-normalization'
import { prisma } from '@/lib/prisma'
import { importPayloadSchema } from '@/lib/validators'
import { revalidatePath } from 'next/cache'

function toDecimal(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const normalized = String(value).replace(',', '.')
  const numeric = Number(normalized)
  if (Number.isNaN(numeric)) return null
  return new Prisma.Decimal(numeric)
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
      const countryCode = (row.country || 'NL').toUpperCase()
      const country = await prisma.country.findUnique({ where: { code: countryCode } })
      if (!country) {
        warnings.push(`Rij ${index + 1}: land ${countryCode} bestaat niet en is overgeslagen.`)
        continue
      }

      const productGroupName = row.productGroup || 'Onbekend'
      const productGroup = await prisma.productGroup.upsert({
        where: { name: productGroupName },
        update: {},
        create: { name: productGroupName, description: `Automatisch aangemaakt via import ${parsed.data.filename}` },
      })

      const articleNumber = row.articleNumber || `IMP-${task.id.slice(-6)}-${index + 1}`
      const ownPrice = toDecimal(row.ownPrice)
      const packagingQty = Number(row.packagingQty || 1) || 1
      const currency = row.currency || country.currency || 'EUR'

      const product = await prisma.product.upsert({
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
          currency,
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
          currency,
        },
      })

      await prisma.productMarket.upsert({
        where: { productId_countryId: { productId: product.id, countryId: country.id } },
        update: { ownPrice, currency, stockStatus: row.ownStock || undefined, isActive: true },
        create: { productId: product.id, countryId: country.id, ownPrice, currency, stockStatus: row.ownStock || 'Onbekend', isActive: true },
      })

      if (ownPrice) {
        await prisma.ownPriceHistory.create({
          data: {
            productId: product.id,
            recordedAt: row.lastChecked ? new Date(row.lastChecked) : new Date(),
            price: ownPrice,
            currency,
          },
        })
      }

      const competitorName = row.competitorName || row.webshop
      if (!competitorName) {
        warnings.push(`Rij ${index + 1}: geen concurrentnaam aanwezig.`)
        processedRows += 1
        continue
      }

      const competitor = await prisma.competitor.upsert({
        where: { name_countryId: { name: competitorName, countryId: country.id } },
        update: { website: row.competitorUrl || row.engelsUrl || 'https://voorbeeld.nl' },
        create: {
          name: competitorName,
          website: row.competitorUrl || row.engelsUrl || 'https://voorbeeld.nl',
          countryId: country.id,
        },
      })

      const rawPrice = toDecimal(row.competitorPrice)
      const normalized = rawPrice
        ? normalizePrice(rawPrice, true, country.vatRate, currency, row.packagingUnit || 'stuks', packagingQty, true, 'EUR').amount
        : null
      const offerUrl = row.competitorUrl || row.engelsUrl || `${competitor.website.replace(/\/$/, '')}/product/${articleNumber}`

      const offer = await prisma.competitorOffer.upsert({
        where: { competitorId_url: { competitorId: competitor.id, url: offerUrl } },
        update: {
          rawPrice,
          normalizedPrice: normalized,
          currency,
          packagingUnit: row.packagingUnit || 'stuks',
          packagingQty,
          stockStatus: row.competitorStock || 'Onbekend',
          lastCheckedAt: row.lastChecked ? new Date(row.lastChecked) : new Date(),
          isActive: true,
        },
        create: {
          competitorId: competitor.id,
          url: offerUrl,
          rawPrice,
          normalizedPrice: normalized,
          currency,
          vatIncluded: true,
          packagingUnit: row.packagingUnit || 'stuks',
          packagingQty,
          stockStatus: row.competitorStock || 'Onbekend',
          lastCheckedAt: row.lastChecked ? new Date(row.lastChecked) : new Date(),
        },
      })

      const existingMatch = await prisma.productMatch.findUnique({ where: { competitorOfferId: offer.id } })
      if (existingMatch && existingMatch.productId !== product.id) {
        throw new Error(`Concurrent URL is al gekoppeld aan een ander product (${existingMatch.productId}).`)
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
      const match = await prisma.productMatch.upsert({
        where: { competitorOfferId: offer.id },
        update: {
          productId: product.id,
          confidenceScore: matchResult.score,
          matchStatus: matchResult.status as MatchStatus,
          matchEvidence: matchResult.evidence as Prisma.InputJsonValue,
          approvedBy: approved ? currentUser.id : null,
          approvedAt: approved ? new Date() : null,
        },
        create: {
          productId: product.id,
          competitorOfferId: offer.id,
          confidenceScore: matchResult.score,
          matchStatus: matchResult.status as MatchStatus,
          matchEvidence: matchResult.evidence as Prisma.InputJsonValue,
          approvedBy: approved ? currentUser.id : null,
          approvedAt: approved ? new Date() : null,
        },
      })

      await prisma.competitorOffer.update({ where: { id: offer.id }, data: { productMatchId: match.id } })

      if (rawPrice) {
        await prisma.priceHistory.create({
          data: {
            competitorOfferId: offer.id,
            recordedAt: row.lastChecked ? new Date(row.lastChecked) : new Date(),
            price: rawPrice,
            normalizedPrice: normalized,
            currency,
            stockStatus: row.competitorStock || 'Onbekend',
            source: 'Importwizard',
          },
        })
      }

      await prisma.priceCheck.create({
        data: {
          competitorOfferId: offer.id,
          checkedAt: row.lastChecked ? new Date(row.lastChecked) : new Date(),
          foundPrice: rawPrice,
          currency,
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
    newValue: { filename: task.filename, totalRows: parsed.data.rows.length, processedRows },
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
