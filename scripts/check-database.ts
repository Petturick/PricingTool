import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { getSafeDatabaseStatus, resolveDatabaseConnection } from '../src/lib/database-url'

async function main() {
  const database = getSafeDatabaseStatus()
  if (!database.configured) throw new Error(`Databaseconfiguratie ongeldig: ${database.configurationIssue ?? 'onbekend'}.`)

  const adapter = new PrismaPg({
    connectionString: resolveDatabaseConnection().connectionString,
    max: 1,
    connectionTimeoutMillis: 1_200,
    idleTimeoutMillis: 5_000,
    maxLifetimeSeconds: 60,
    allowExitOnIdle: true,
  })
  const client = new PrismaClient({ adapter })

  try {
    await client.$queryRaw`SELECT 1`
    console.log(JSON.stringify({ status: 'ok', database }))
  } finally {
    await client.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
