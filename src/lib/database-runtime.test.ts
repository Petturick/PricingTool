import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DatabaseTemporarilyUnavailableError,
  getDatabaseCircuitSnapshot,
  recordDatabaseSuccess,
  resetDatabaseCircuitForTests,
  runDatabaseOperation,
} from './database-runtime'

test('opens a cooldown circuit after a connection failure', async () => {
  resetDatabaseCircuitForTests()

  await assert.rejects(
    runDatabaseOperation(async () => { throw Object.assign(new Error('Tenant or user not found'), { code: 'XX000' }) }),
    DatabaseTemporarilyUnavailableError,
  )

  const snapshot = getDatabaseCircuitSnapshot()
  assert.equal(snapshot.open, true)
  assert.equal(snapshot.reason, 'pooler_tenant_not_found')
  assert.ok(snapshot.retryAfterMs > 0)
})

test('does not repeat an operation while the cooldown circuit is open', async () => {
  resetDatabaseCircuitForTests()
  let calls = 0

  await assert.rejects(runDatabaseOperation(async () => {
    calls += 1
    throw Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' })
  }))
  await assert.rejects(runDatabaseOperation(async () => {
    calls += 1
    return 'unexpected'
  }), DatabaseTemporarilyUnavailableError)

  assert.equal(calls, 1)
})

test('leaves the circuit closed for a non connection error', async () => {
  resetDatabaseCircuitForTests()
  await assert.rejects(runDatabaseOperation(async () => { throw new Error('Invalid product input') }), /Invalid product input/)
  assert.equal(getDatabaseCircuitSnapshot().open, false)
  recordDatabaseSuccess()
})
