import { NextResponse } from 'next/server'
import { isDatabaseConnectivityError } from '@/lib/database-health'
import { getSafeDatabaseStatus } from '@/lib/database-url'
import {
  DatabaseTemporarilyUnavailableError,
  getDatabaseCircuitSnapshot,
  recordDatabaseFailure,
  recordDatabaseNotConfigured,
  recordDatabaseSuccess,
} from '@/lib/database-runtime'

function unavailableResponse() {
  const database = getSafeDatabaseStatus()
  const circuit = database.configured ? getDatabaseCircuitSnapshot() : recordDatabaseNotConfigured()
  const retryAfterMs = Math.max(circuit.retryAfterMs, 1_000)

  return NextResponse.json({
    error: 'Database tijdelijk niet bereikbaar.',
    code: 'database_unavailable',
    reason: circuit.reason ?? database.configurationIssue ?? 'connection_failed',
    retryAfterMs,
  }, {
    status: 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Retry-After': String(Math.max(Math.ceil(retryAfterMs / 1000), 1)),
    },
  })
}

export async function withDatabaseRoute(operation: () => Promise<Response>): Promise<Response> {
  const database = getSafeDatabaseStatus()
  if (!database.configured || getDatabaseCircuitSnapshot().open) return unavailableResponse()

  try {
    const response = await operation()
    recordDatabaseSuccess()
    return response
  } catch (error) {
    if (error instanceof DatabaseTemporarilyUnavailableError) return unavailableResponse()
    if (isDatabaseConnectivityError(error)) {
      recordDatabaseFailure(error)
      return unavailableResponse()
    }
    throw error
  }
}
