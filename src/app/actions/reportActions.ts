'use server'

import { Prisma, ReportStatus } from '@/generated/prisma/client'
import { createAuditLog } from '@/lib/audit'
import { requireUser, WRITE_ROLES } from '@/lib/authz'
import { getDashboardSnapshot } from '@/lib/dashboard'
import { decimalToNumber } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfWeek(date: Date) {
  const copy = startOfWeek(date)
  copy.setDate(copy.getDate() + 6)
  copy.setHours(23, 59, 59, 999)
  return copy
}

function movement(item: { productName: string; competitor: string; countryCode: string; currency: string; latestPrice: number; previousPrice: number; delta: number; recordedAt: Date }) {
  return {
    product: item.productName,
    concurrent: item.competitor,
    markt: item.countryCode,
    valuta: item.currency,
    vorigePrijs: item.previousPrice,
    actuelePrijs: item.latestPrice,
    verschil: item.delta,
    gemetenOp: item.recordedAt.toISOString(),
  }
}

export async function buildWeeklyReportPayload() {
  const portfolio = await getDashboardSnapshot()
  const activeMarkets = portfolio.filterOptions.countries.filter((country) => country.isActive)
  const marketSnapshots = await Promise.all(activeMarkets.map(async (country) => ({
    country,
    snapshot: await getDashboardSnapshot({ countryId: country.id }),
  })))

  return {
    gegenereerdOp: new Date().toISOString(),
    portfolio: {
      gemonitordeProducten: portfolio.kpis.monitoredProducts,
      actieveAanbiedingen: portfolio.kpis.activeOffers,
      geldigeMatches: portfolio.kpis.validMatches,
      reviewMatches: portfolio.kpis.reviewMatches,
      mislukteControles: portfolio.kpis.failedChecks,
      verouderdeBronnen: portfolio.kpis.staleData,
    },
    markten: marketSnapshots.map(({ country, snapshot }) => ({
      land: country.name,
      landcode: country.code,
      valuta: country.currency,
      kpis: snapshot.kpis,
      topStijgers: snapshot.biggestIncreases.map(movement),
      topDalers: snapshot.biggestDecreases.map(movement),
    })),
    mislukteControles: portfolio.failedChecks.map((check) => ({
      markt: check.competitorOffer.competitor.country.code,
      concurrent: check.competitorOffer.competitor.name,
      product: check.competitorOffer.productMatch?.product.name ?? 'Ongekoppeld',
      fout: check.errorMessage,
      tijd: check.checkedAt.toISOString(),
    })),
    verouderdeData: portfolio.staleOffers.map((offer) => ({
      markt: offer.competitor.country.code,
      valuta: offer.currency ?? offer.competitor.country.currency,
      concurrent: offer.competitor.name,
      product: offer.productMatch?.product.name ?? 'Ongekoppeld',
      laatstGecontroleerd: offer.lastCheckedAt?.toISOString() ?? null,
      prijs: decimalToNumber(offer.normalizedPrice),
    })),
  }
}

export async function generateWeeklyReportAction() {
  const currentUser = await requireUser(WRITE_ROLES)
  const today = new Date()
  const weekStart = startOfWeek(today)
  const weekEnd = endOfWeek(today)
  const content = await buildWeeklyReportPayload()

  const report = await prisma.report.create({
    data: {
      title: `Weekrapport ${weekStart.toLocaleDateString('nl-NL')}`,
      weekStart,
      weekEnd,
      status: ReportStatus.GENERATED,
      content: content as Prisma.InputJsonValue,
      generatedAt: new Date(),
    },
  })

  await createAuditLog({
    userId: currentUser.id,
    action: 'REPORT_GENERATED',
    entityType: 'Report',
    entityId: report.id,
    newValue: { title: report.title },
  })

  revalidatePath('/rapportages')
  revalidatePath('/dashboard')
}
