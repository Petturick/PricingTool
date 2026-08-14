import assert from 'node:assert/strict'
import test from 'node:test'
import { resetDatabaseCircuitForTests } from './database-runtime'
import { withDatabaseRoute } from './database-route'
import { safeDatabaseQuery } from './safe-database'

const names = ['PRICING_DATABASE_URL', 'DATABASE_URL', 'PRICING_DB_PASSWORD', 'SUPABASE_DB_PASSWORD'] as const

function clearDatabaseEnvironment() {
  const original = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  names.forEach((name) => delete process.env[name])
  resetDatabaseCircuitForTests()
  return () => {
    for (const name of names) {
      const value = original[name]
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    resetDatabaseCircuitForTests()
  }
}

test('returns immediately without executing a query when runtime credentials are missing', async () => {
  const restore = clearDatabaseEnvironment()
  let calls = 0

  try {
    const startedAt = Date.now()
    const result = await safeDatabaseQuery(async () => {
      calls += 1
      return ['unexpected']
    }, [] as string[])

    assert.equal(result.available, false)
    assert.equal(result.reason, 'not_configured')
    assert.equal(calls, 0)
    assert.ok(Date.now() - startedAt < 100)
  } finally {
    restore()
  }
})

test('returns a structured 503 without running a route when database credentials are missing', async () => {
  const restore = clearDatabaseEnvironment()
  let calls = 0

  try {
    const response = await withDatabaseRoute(async () => {
      calls += 1
      return Response.json({ unexpected: true })
    })
    const body = await response.json() as { code?: string; reason?: string }

    assert.equal(response.status, 503)
    assert.equal(body.code, 'database_unavailable')
    assert.equal(body.reason, 'not_configured')
    assert.equal(calls, 0)
  } finally {
    restore()
  }
})
