import { classifyConnectionFailure, isDatabaseConnectivityError, type ConnectionFailureReason } from '@/lib/database-health'

const BASE_COOLDOWN_MS = 15_000
const MAX_COOLDOWN_MS = 120_000

type DatabaseCircuitState = {
  failureCount: number
  unavailableUntil: number
  lastFailureAt: number | null
  lastLoggedAt: number | null
  reason: ConnectionFailureReason | 'not_configured' | null
  errorCode: string | null
}

const globalForDatabase = globalThis as unknown as { pricingDatabaseCircuit?: DatabaseCircuitState }

function state() {
  globalForDatabase.pricingDatabaseCircuit ??= {
    failureCount: 0,
    unavailableUntil: 0,
    lastFailureAt: null,
    lastLoggedAt: null,
    reason: null,
    errorCode: null,
  }
  return globalForDatabase.pricingDatabaseCircuit
}

function cooldownFor(failureCount: number) {
  return Math.min(BASE_COOLDOWN_MS * 2 ** Math.max(failureCount - 1, 0), MAX_COOLDOWN_MS)
}

export class DatabaseTemporarilyUnavailableError extends Error {
  readonly reason: DatabaseCircuitState['reason']
  readonly errorCode: string | null
  readonly retryAfterMs: number

  constructor(snapshot = getDatabaseCircuitSnapshot()) {
    super('Database temporarily unavailable.')
    this.name = 'DatabaseTemporarilyUnavailableError'
    this.reason = snapshot.reason
    this.errorCode = snapshot.errorCode
    this.retryAfterMs = snapshot.retryAfterMs
  }
}

export function getDatabaseCircuitSnapshot(now = Date.now()) {
  const current = state()
  const retryAfterMs = Math.max(current.unavailableUntil - now, 0)
  return {
    open: retryAfterMs > 0,
    failureCount: current.failureCount,
    lastFailureAt: current.lastFailureAt,
    reason: current.reason,
    errorCode: current.errorCode,
    retryAfterMs,
  }
}

export function recordDatabaseSuccess() {
  const current = state()
  current.failureCount = 0
  current.unavailableUntil = 0
  current.lastFailureAt = null
  current.reason = null
  current.errorCode = null
}

export function recordDatabaseFailure(error: unknown, now = Date.now()) {
  const current = state()
  const failure = classifyConnectionFailure(error)
  current.failureCount += 1
  current.lastFailureAt = now
  current.unavailableUntil = now + cooldownFor(current.failureCount)
  current.reason = failure.reason
  current.errorCode = failure.errorCode

  if (!current.lastLoggedAt || now - current.lastLoggedAt >= BASE_COOLDOWN_MS) {
    current.lastLoggedAt = now
    console.error('[database] connection unavailable', {
      reason: current.reason,
      errorCode: current.errorCode,
      failureCount: current.failureCount,
      retryAfterMs: current.unavailableUntil - now,
    })
  }

  return getDatabaseCircuitSnapshot(now)
}

export function recordDatabaseNotConfigured(now = Date.now()) {
  const current = state()
  current.failureCount = Math.max(current.failureCount, 1)
  current.lastFailureAt = now
  current.unavailableUntil = now + MAX_COOLDOWN_MS
  current.reason = 'not_configured'
  current.errorCode = null
  return getDatabaseCircuitSnapshot(now)
}

export async function runDatabaseOperation<T>(operation: () => Promise<T>) {
  const snapshot = getDatabaseCircuitSnapshot()
  if (snapshot.open) throw new DatabaseTemporarilyUnavailableError(snapshot)

  try {
    const result = await operation()
    recordDatabaseSuccess()
    return result
  } catch (error) {
    if (isDatabaseConnectivityError(error)) {
      const failure = recordDatabaseFailure(error)
      throw new DatabaseTemporarilyUnavailableError(failure)
    }
    throw error
  }
}

export function resetDatabaseCircuitForTests() {
  delete globalForDatabase.pricingDatabaseCircuit
}
