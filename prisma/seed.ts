import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { resolveDatabaseConnection } from '../src/lib/database-url'
import bcrypt from 'bcryptjs'
import {
  AlertSeverity,
  ImportFormat,
  ImportStatus,
  MatchStatus,
  Prisma,
  PrismaClient,
  ReportStatus,
  UserRole,
} from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: resolveDatabaseConnection().connectionString })
const prisma = new PrismaClient({ adapter })

function normalizePriceSeed(price: Prisma.Decimal, vatRate: Prisma.Decimal, currency: string) {
  const rates: Record<string, number> = { EUR: 1, GBP: 1.17, DKK: 0.134 }
  const fromRate = rates[currency] ?? 1
  return price.mul(fromRate)
}

const countries = [
  { code: 'NL', name: 'Nederland', vatRate: 21, currency: 'EUR' },
  { code: 'BE', name: 'België', vatRate: 21, currency: 'EUR' },
  { code: 'FR', name: 'Frankrijk', vatRate: 20, currency: 'EUR' },
  { code: 'DE', name: 'Duitsland', vatRate: 19, currency: 'EUR' },
  { code: 'PT', name: 'Portugal', vatRate: 23, currency: 'EUR' },
  { code: 'GB', name: 'Verenigd Koninkrijk', vatRate: 20, currency: 'GBP' },
  { code: 'ES', name: 'Spanje', vatRate: 21, currency: 'EUR' },
  { code: 'DK', name: 'Denemarken', vatRate: 25, currency: 'DKK' },
] as const

const productGroups = [
  'Kunststof bakken',
  'Pallets',
  'Palletboxen',
  'Afvalcontainers',
  'Lekbakken',
  'Stellingen',
  'Transportkoffers',
  'EXOcase',
  'Smartcase',
  'Flightcases',
  'Rack cases',
]

const competitorSeed = [
  { name: 'Rotomshop NL', countryCode: 'NL', website: 'https://www.rotomshop.nl' },
  { name: 'Manutan België', countryCode: 'BE', website: 'https://www.manutan.be' },
  { name: 'RAJA France', countryCode: 'FR', website: 'https://www.raja.fr' },
  { name: 'KAISER+KRAFT', countryCode: 'DE', website: 'https://www.kaiserkraft.de' },
  { name: 'Seton Portugal', countryCode: 'PT', website: 'https://www.seton.pt' },
  { name: 'The Workplace Depot', countryCode: 'GB', website: 'https://www.theworkplacedepot.co.uk' },
  { name: 'Logismarket España', countryCode: 'ES', website: 'https://www.logismarket.es' },
  { name: 'AJ Produkter', countryCode: 'DK', website: 'https://www.ajprodukter.dk' },
]

const products = [
  { articleNumber: 'ENG-100100', ean: '8711111111111', name: 'Kunststof bak 600x400x320 blauw', group: 'Kunststof bakken', ownPrice: 24.5 },
  { articleNumber: 'ENG-100210', ean: '8711111111128', name: 'Nestbare pallet 1200x800', group: 'Pallets', ownPrice: 69.9 },
  { articleNumber: 'ENG-100305', ean: '8711111111135', name: 'Palletbox geperforeerd 1200x1000', group: 'Palletboxen', ownPrice: 169.0 },
  { articleNumber: 'ENG-100410', ean: '8711111111142', name: 'Afvalcontainer 660L grijs', group: 'Afvalcontainers', ownPrice: 212.0 },
  { articleNumber: 'ENG-100520', ean: '8711111111159', name: 'Lekbak 2-vats PE rood', group: 'Lekbakken', ownPrice: 158.75 },
  { articleNumber: 'ENG-100630', ean: '8711111111166', name: 'Opslagstelling verzinkt 2000x1000', group: 'Stellingen', ownPrice: 132.4 },
  { articleNumber: 'ENG-100740', ean: '8711111111173', name: 'Transportkoffer aluminium 540x420', group: 'Transportkoffers', ownPrice: 94.95 },
  { articleNumber: 'ENG-100850', ean: '8711111111180', name: 'EXOcase 19 inch mobiel', group: 'EXOcase', ownPrice: 189.0 },
  { articleNumber: 'ENG-100960', ean: '8711111111197', name: 'Smartcase compact IP67', group: 'Smartcase', ownPrice: 83.5 },
  { articleNumber: 'ENG-101070', ean: '8711111111203', name: 'Flightcase mixer 19 inch', group: 'Flightcases', ownPrice: 145.0 },
  { articleNumber: 'ENG-101180', ean: '8711111111210', name: 'Rack case 12U shockmount', group: 'Rack cases', ownPrice: 239.0 },
]

async function main() {
  await prisma.auditLog.deleteMany()
  await prisma.report.deleteMany()
  await prisma.importTask.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.alertRule.deleteMany()
  await prisma.priceCheck.deleteMany()
  await prisma.priceHistory.deleteMany()
  await prisma.ownPriceHistory.deleteMany()
  await prisma.productMatch.deleteMany()
  await prisma.competitorOffer.deleteMany()
  await prisma.webshop.deleteMany()
  await prisma.competitor.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productGroup.deleteMany()
  await prisma.country.deleteMany()
  await prisma.user.deleteMany()

  const users = await prisma.$transaction([
    prisma.user.create({ data: { email: 'admin@engels.nl', name: 'Beheerder Engels', passwordHash: await bcrypt.hash('Admin123!', 10), role: UserRole.ADMIN } }),
    prisma.user.create({ data: { email: 'analist@engels.nl', name: 'Prijsanalist Engels', passwordHash: await bcrypt.hash('Analist123!', 10), role: UserRole.ANALYST } }),
    prisma.user.create({ data: { email: 'readonly@engels.nl', name: 'Rapportage gebruiker', passwordHash: await bcrypt.hash('Readonly123!', 10), role: UserRole.READONLY } }),
  ])

  const countryMap = new Map<string, Awaited<ReturnType<typeof prisma.country.create>>>()
  for (const country of countries) {
    const created = await prisma.country.create({
      data: {
        code: country.code,
        name: country.name,
        vatRate: new Prisma.Decimal(country.vatRate),
        currency: country.currency,
      },
    })
    countryMap.set(country.code, created)
  }

  const groupMap = new Map<string, Awaited<ReturnType<typeof prisma.productGroup.create>>>()
  for (const group of productGroups) {
    const created = await prisma.productGroup.create({
      data: {
        name: group,
        description: `${group} voor Europese prijsmonitoring en concurrentieanalyse.`,
      },
    })
    groupMap.set(group, created)
  }

  const competitorMap = new Map<string, Awaited<ReturnType<typeof prisma.competitor.create>>>()
  for (const competitor of competitorSeed) {
    const country = countryMap.get(competitor.countryCode)!
    const created = await prisma.competitor.create({
      data: {
        name: competitor.name,
        website: competitor.website,
        countryId: country.id,
        checkFrequencyHours: 24,
        lastCheckedAt: new Date(),
      },
    })
    competitorMap.set(competitor.name, created)

    await prisma.webshop.create({
      data: {
        name: `${competitor.name} webshop`,
        url: competitor.website,
        countryId: country.id,
        competitorId: created.id,
      },
    })
  }

  const productMap = new Map<string, Awaited<ReturnType<typeof prisma.product.create>>>()
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        articleNumber: product.articleNumber,
        ean: product.ean,
        gtin: product.ean,
        name: product.name,
        productGroupId: groupMap.get(product.group)!.id,
        ownPrice: new Prisma.Decimal(product.ownPrice),
        vatIncluded: true,
        packagingUnit: 'stuks',
        packagingQty: 1,
        currency: 'EUR',
        stockStatus: 'Op voorraad',
        notes: 'Seed product voor dashboard demo.',
      },
    })
    productMap.set(product.articleNumber, created)

    for (const week of [28, 21, 14, 7, 0]) {
      await prisma.ownPriceHistory.create({
        data: {
          productId: created.id,
          recordedAt: new Date(Date.now() - week * 24 * 60 * 60 * 1000),
          price: new Prisma.Decimal(product.ownPrice - week * 0.03),
          currency: 'EUR',
        },
      })
    }
  }

  const relevantCompetitors = competitorSeed.slice(0, 5)
  let alertCounter = 0
  for (const product of products) {
    const ownProduct = productMap.get(product.articleNumber)!
    for (const [offset, competitorMeta] of relevantCompetitors.entries()) {
      const competitor = competitorMap.get(competitorMeta.name)!
      const country = countryMap.get(competitorMeta.countryCode)!
      const basePrice = product.ownPrice * (0.9 + offset * 0.04)
      const rawPrice = new Prisma.Decimal(basePrice)
      const normalized = normalizePriceSeed(rawPrice, country.vatRate, country.currency)

      const offer = await prisma.competitorOffer.create({
        data: {
          competitorId: competitor.id,
          url: `${competitor.website}/p/${product.articleNumber.toLowerCase()}`,
          rawPrice,
          normalizedPrice: normalized,
          currency: country.currency,
          vatIncluded: true,
          packagingUnit: 'stuks',
          packagingQty: 1,
          stockStatus: offset === 4 ? 'Beperkt' : 'Op voorraad',
          lastCheckedAt: new Date(Date.now() - offset * 6 * 60 * 60 * 1000),
        },
      })

      const match = await prisma.productMatch.create({
        data: {
          productId: ownProduct.id,
          competitorOfferId: offer.id,
          confidenceScore: offset === 4 ? 84 : 98,
          matchStatus: offset === 4 ? MatchStatus.REVIEW : MatchStatus.CERTAIN,
          matchEvidence: {
            ean: product.ean,
            articleNumber: product.articleNumber,
            website: competitor.website,
          },
          approvedBy: offset === 4 ? null : users[0].id,
          approvedAt: offset === 4 ? null : new Date(),
        },
      })

      await prisma.competitorOffer.update({ where: { id: offer.id }, data: { productMatchId: match.id } })

      for (const week of [28, 21, 14, 7, 0]) {
        const weekPrice = rawPrice.mul(1 + (offset - 2) * 0.01 + week * 0.002)
        await prisma.priceHistory.create({
          data: {
            competitorOfferId: offer.id,
            recordedAt: new Date(Date.now() - week * 24 * 60 * 60 * 1000),
            price: weekPrice,
            normalizedPrice: normalizePriceSeed(weekPrice, country.vatRate, country.currency),
            currency: country.currency,
            stockStatus: offset === 4 ? 'Beperkt' : 'Op voorraad',
            source: 'Seed',
          },
        })
      }

      await prisma.priceCheck.create({
        data: {
          competitorOfferId: offer.id,
          checkedAt: new Date(Date.now() - offset * 6 * 60 * 60 * 1000),
          foundPrice: rawPrice,
          currency: country.currency,
          stockStatus: offset === 4 ? 'Beperkt' : 'Op voorraad',
          productTitle: product.name,
          packagingUnit: 'stuks',
          checkMethod: 'SCRAPER',
          statusCode: 200,
          sourceUrl: offer.url,
          isSuccess: true,
        },
      })

      if (offset === 4 || basePrice > product.ownPrice * 1.08) {
        alertCounter += 1
        await prisma.alert.create({
          data: {
            type: offset === 4 ? 'MATCH_REVIEW' : 'PRICE_GAP',
            productId: ownProduct.id,
            competitorOfferId: offer.id,
            title: offset === 4 ? 'Match vereist controle' : 'Prijsverschil gedetecteerd',
            message: offset === 4
              ? `${competitor.name} voor ${product.name} heeft extra validatie nodig.`
              : `${competitor.name} zit ${Math.round(((basePrice - product.ownPrice) / product.ownPrice) * 100)}% boven Engels prijs.`,
            severity: offset === 4 ? AlertSeverity.WARNING : AlertSeverity.INFO,
            isRead: alertCounter % 3 === 0,
          },
        })
      }
    }
  }

  const firstCountry = countryMap.get('NL')!
  const firstGroup = groupMap.get('Kunststof bakken')!
  const firstCompetitor = competitorMap.get('Rotomshop NL')!

  await prisma.alertRule.create({
    data: {
      type: 'PRICE_INDEX',
      threshold: new Prisma.Decimal(105),
      countryId: firstCountry.id,
      productGroupId: firstGroup.id,
      competitorId: firstCompetitor.id,
    },
  })

  const importTask = await prisma.importTask.create({
    data: {
      filename: 'prisync-week-32.xlsx',
      format: ImportFormat.XLSX,
      status: ImportStatus.DONE,
      totalRows: 120,
      processedRows: 118,
      errorRows: 2,
      warnings: ['2 regels zonder verpakkingseenheid.'],
      errors: ['Rij 14: ongeldige prijs', 'Rij 88: onbekend land'],
      importedBy: users[1].id,
    },
  })

  const report = await prisma.report.create({
    data: {
      title: 'Weekrapport 32',
      weekStart: new Date('2026-07-27T00:00:00Z'),
      weekEnd: new Date('2026-08-02T23:59:59Z'),
      status: ReportStatus.GENERATED,
      content: {
        samenvatting: 'Seedrapport met voorbeeld KPI\'s en trendinformatie.',
      },
      generatedAt: new Date(),
    },
  })

  await prisma.auditLog.createMany({
    data: [
      { userId: users[0].id, action: 'SEED_INIT', entityType: 'System', entityId: 'seed', newValue: { importTaskId: importTask.id, reportId: report.id }, ipAddress: '127.0.0.1' },
      { userId: users[1].id, action: 'IMPORT_REVIEWED', entityType: 'ImportTask', entityId: importTask.id, newValue: { status: 'DONE' }, ipAddress: '127.0.0.1' },
      { userId: users[2].id, action: 'REPORT_VIEWED', entityType: 'Report', entityId: report.id, newValue: { title: report.title }, ipAddress: '127.0.0.1' },
    ],
  })

  console.log('Seed voltooid met demo data voor Engels Group.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
