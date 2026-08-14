import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyConnectionFailure, isDatabaseConnectivityError } from './database-health'

test('classifies Supavisor circuit breaker errors before authentication text', () => {
  const result = classifyConnectionFailure({
    code: 'XX000',
    message: 'Circuit breaker open',
    detail: 'Too many authentication failures, new connections are temporarily blocked',
  })
  assert.deepEqual(result, { reason: 'circuit_breaker_open', errorCode: 'XX000' })
})

test('reads a tenant error nested in an aggregate error', () => {
  const result = classifyConnectionFailure({
    message: 'Connection failed',
    errors: [{ code: 'XX000', message: 'Tenant or user not found' }],
  })
  assert.deepEqual(result, { reason: 'pooler_tenant_not_found', errorCode: 'XX000' })
})

test('classifies pooler capacity and routing failures', () => {
  assert.equal(classifyConnectionFailure({ code: 'XX000', message: 'Max client connections reached' }).reason, 'client_limit_reached')
  assert.equal(classifyConnectionFailure({ code: 'XX000', message: 'Subscribe error: worker_not_found' }).reason, 'pooler_routing_failed')
})

test('distinguishes connection failures from application errors', () => {
  assert.equal(isDatabaseConnectivityError({ code: 'P1001', message: 'Cannot reach database server' }), true)
  assert.equal(isDatabaseConnectivityError({ code: '23505', message: 'duplicate key value violates unique constraint' }), false)
})
