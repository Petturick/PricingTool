export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getSafeDatabaseStatus, resolveDatabaseConnection } from '@/lib/database-url'
import { getDatabaseCircuitSnapshot, recordDatabaseFailure, recordDatabaseNotConfigured, recordDatabaseSuccess } from '@/lib/database-runtime'

const noStoreHeaders = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET() {
  const startedAt = Date.now()
  const database = getSafeDatabaseStatus()

  if (!database.configured) {
    const circuit = recordDatabaseNotConfigured()
    return NextResponse.json({
      status: 'degraded',
      app: true,
      database: {
        ...database,
        reachable: false,
        reason: 'not_configured',
        retryAfterMs: circuit.retryAfterMs,
        durationMs: Date.now() - startedAt,
      },
    }, { headers: noStoreHeaders })
  }

  const existingCircuit = getDatabaseCircuitSnapshot()
  if (existingCircuit.open) {
    return NextResponse.json({
      status: 'degraded',
      app: true,
      database: {
        ...database,
        reachable: false,
        cached: true,
        reason: existingCircuit.reason,
        errorCode: existingCircuit.errorCode,
        retryAfterMs: existingCircuit.retryAfterMs,
        durationMs: Date.now() - startedAt,
      },
    }, {
      headers: {
        ...noStoreHeaders,
        'Retry-After': String(Math.max(Math.ceil(existingCircuit.retryAfterMs / 1000), 1)),
      },
    })
  }

  try {
    const { connectionString } = resolveDatabaseConnection()
    const client = new Client({ connectionString, connectionTimeoutMillis: 6_000 })
    try {
      await client.connect()
      await client.query('SELECT 1')
    } finally {
      await client.end().catch(() => undefined)
    }
    recordDatabaseSuccess()

    return NextResponse.json({
      status: 'ok',
      app: true,
      database: {
        ...database,
        reachable: true,
        durationMs: Date.now() - startedAt,
      },
    }, { headers: noStoreHeaders })
  } catch (error) {
    const failure = recordDatabaseFailure(error)

    return NextResponse.json({
      status: 'degraded',
      app: true,
      database: {
        ...database,
        reachable: false,
        reason: failure.reason,
        errorCode: failure.errorCode,
        retryAfterMs: failure.retryAfterMs,
        durationMs: Date.now() - startedAt,
      },
    }, {
      headers: {
        ...noStoreHeaders,
        'Retry-After': String(Math.max(Math.ceil(failure.retryAfterMs / 1000), 1)),
      },
    })
  }
}
