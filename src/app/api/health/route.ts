export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSafeDatabaseStatus } from '@/lib/database-url'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const database = getSafeDatabaseStatus()

  if (!database.configured) {
    return NextResponse.json(
      { status: 'degraded', database, message: 'DATABASE_URL ontbreekt in de productieomgeving.' },
      { status: 503 },
    )
  }

  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', database })
  } catch (error) {
    console.error('Database healthcheck failed', error)
    return NextResponse.json(
      {
        status: 'degraded',
        database,
        message: 'De database is geconfigureerd maar niet bereikbaar.',
      },
      { status: 503 },
    )
  }
}
