export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSafeDatabaseStatus } from '@/lib/database-url'

export async function GET() {
  const database = getSafeDatabaseStatus()

  if (!database.configured) {
    return NextResponse.json({
      status: 'ok',
      app: true,
      database: {
        ...database,
        reachable: false,
        reason: 'not_configured',
      },
    })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.$queryRawUnsafe('SELECT 1')

    return NextResponse.json({
      status: 'ok',
      app: true,
      database: {
        ...database,
        reachable: true,
      },
    })
  } catch (error) {
    console.error('Database healthcheck failed', error)

    return NextResponse.json({
      status: 'degraded',
      app: true,
      database: {
        ...database,
        reachable: false,
        reason: 'connection_failed',
      },
    })
  }
}
