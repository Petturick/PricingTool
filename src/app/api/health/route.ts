export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getSafeDatabaseStatus, resolveDatabaseConnection } from '@/lib/database-url'
import { classifyConnectionFailure } from '@/lib/database-health'

export async function GET() {
  const startedAt = Date.now()
  const database = getSafeDatabaseStatus()

  if (!database.configured) {
    return NextResponse.json({
      status: 'ok',
      app: true,
      database: {
        ...database,
        reachable: false,
        reason: 'not_configured',
        durationMs: Date.now() - startedAt,
      },
    })
  }

  try {
    const { connectionString } = resolveDatabaseConnection()
    const client = new Client({ connectionString, connectionTimeoutMillis: 7_500 })
    try {
      await client.connect()
      await client.query('SELECT 1')
    } finally {
      await client.end().catch(() => undefined)
    }

    return NextResponse.json({
      status: 'ok',
      app: true,
      database: {
        ...database,
        reachable: true,
        durationMs: Date.now() - startedAt,
      },
    })
  } catch (error) {
    console.error('Database healthcheck failed', error)
    const failure = classifyConnectionFailure(error)

    return NextResponse.json({
      status: 'degraded',
      app: true,
      database: {
        ...database,
        reachable: false,
        ...failure,
        durationMs: Date.now() - startedAt,
      },
    })
  }
}
