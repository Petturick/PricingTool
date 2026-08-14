import { getSafeDatabaseStatus } from '@/lib/database-url'
import { getDatabaseCircuitSnapshot, recordDatabaseNotConfigured, runDatabaseOperation } from '@/lib/database-runtime'

export type DatabaseResult<T> = {
  data: T
  available: boolean
  reason?: string | null
  retryAfterMs?: number
}

export async function safeDatabaseQuery<T>(query: () => Promise<T>, fallback: T): Promise<DatabaseResult<T>> {
  if (!getSafeDatabaseStatus().configured) {
    const snapshot = recordDatabaseNotConfigured()
    return { data: fallback, available: false, reason: snapshot.reason, retryAfterMs: snapshot.retryAfterMs }
  }

  try {
    return { data: await runDatabaseOperation(query), available: true }
  } catch (error) {
    const snapshot = getDatabaseCircuitSnapshot()
    if (!snapshot.open) console.error('[database] query failed without opening connection circuit', error)
    return { data: fallback, available: false, reason: snapshot.reason, retryAfterMs: snapshot.retryAfterMs }
  }
}
