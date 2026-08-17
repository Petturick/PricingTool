import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient, UserRole } from '../src/generated/prisma/client'
import { resolveDatabaseConnection } from '../src/lib/database-url'

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
  throw new Error('Destructive PrySight seed blocked. Set ALLOW_DESTRUCTIVE_SEED=true in a non-production environment to continue.')
}

function requireSeedCredentials() {
  const email = process.env.PRYSIGHT_SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.PRYSIGHT_SEED_ADMIN_PASSWORD
  if (!email || !password || password.length < 12) {
    throw new Error('Set PRYSIGHT_SEED_ADMIN_EMAIL and PRYSIGHT_SEED_ADMIN_PASSWORD (minimum 12 characters) before seeding.')
  }
  return { email, password }
}

const { email: adminEmail, password: adminPassword } = requireSeedCredentials()
const connection = resolveDatabaseConnection()
if (!connection.configured) throw new Error('Database is not configured for seeding.')

const adapter = new PrismaPg({ connectionString: connection.connectionString })
const prisma = new PrismaClient({ adapter })

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

const groups = ['Kunststof bakken', 'Pallets', 'Transportkoffers'] as const

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
  await prisma.productMarket.deleteMany()
  await prisma.product.deleteMany()
  await prisma.productGroup.deleteMany()
  await prisma.country.deleteMany()
  await prisma.user.deleteMany()

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'PrySight test administrator',
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN,
    },
  })

  const countryMap = new Map<string, string>()
  for (const country of countries) {
    const created = await prisma.country.create({
      data: {
        code: country.code,
        name: country.name,
        vatRate: new Prisma.Decimal(country.vatRate),
        currency: country.currency,
      },
    })
    countryMap.set(country.code, created.id)
  }

  const groupMap = new Map<string, string>()
  for (const name of groups) {
    const created = await prisma.productGroup.create({ data: { name, description: `${name} testgroep` } })
    groupMap.set(name, created.id)
  }

  const fixtures = [
    { articleNumber: 'TEST-BAK-001', name: 'PrySight testbak 600x400', group: 'Kunststof bakken', price: 24.5 },
    { articleNumber: 'TEST-PAL-001', name: 'PrySight testpallet 1200x800', group: 'Pallets', price: 69.9 },
    { articleNumber: 'TEST-CASE-001', name: 'PrySight test transportkoffer', group: 'Transportkoffers', price: 94.95 },
  ] as const

  for (const fixture of fixtures) {
    const product = await prisma.product.create({
      data: {
        articleNumber: fixture.articleNumber,
        name: fixture.name,
        productGroupId: groupMap.get(fixture.group)!,
        ownPrice: new Prisma.Decimal(fixture.price),
        currency: 'EUR',
        packagingUnit: 'stuks',
        packagingQty: 1,
        stockStatus: 'Op voorraad',
        markets: {
          create: [
            { countryId: countryMap.get('NL')!, ownPrice: new Prisma.Decimal(fixture.price), currency: 'EUR', isActive: true },
            { countryId: countryMap.get('BE')!, ownPrice: new Prisma.Decimal(fixture.price), currency: 'EUR', isActive: true },
          ],
        },
      },
    })
    await prisma.ownPriceHistory.createMany({
      data: ['NL', 'BE'].map((code) => ({
        productId: product.id,
        countryId: countryMap.get(code)!,
        recordedAt: new Date(),
        price: new Prisma.Decimal(fixture.price),
        currency: 'EUR',
      })),
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SAFE_TEST_SEED_CREATED',
      entityType: 'System',
      entityId: 'safe-test-seed',
      newValue: { products: fixtures.length, countries: countries.length },
      ipAddress: 'seed',
    },
  })

  console.log(`PrySight test seed created for ${adminEmail}.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
