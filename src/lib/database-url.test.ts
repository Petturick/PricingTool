import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveDatabaseConnection } from './database-url'

test('prefers explicit Supabase project configuration for production', () => {
  const result = resolveDatabaseConnection(
    'postgresql://postgres:old@db.oldproject.supabase.co:5432/postgres',
    'eu-west-2',
    'xmedaatjwxkmwkjmwuuz',
    'secret with spaces',
  )
  const url = new URL(result.connectionString)
  assert.equal(result.mode, 'supavisor')
  assert.equal(url.hostname, 'aws-0-eu-west-2.pooler.supabase.com')
  assert.equal(url.port, '6543')
  assert.equal(decodeURIComponent(url.username), 'postgres.xmedaatjwxkmwkjmwuuz')
  assert.equal(decodeURIComponent(url.password), 'secret with spaces')
  assert.equal(url.searchParams.get('sslmode'), 'require')
  assert.equal(url.searchParams.get('uselibpqcompat'), 'true')
  assert.equal(url.searchParams.get('pgbouncer'), 'true')
})

test('ignores legacy session pooling overrides in the Bolt runtime', () => {
  const original = process.env.PRICING_DB_POOLER_PORT
  process.env.PRICING_DB_POOLER_PORT = '5432'
  const result = resolveDatabaseConnection('', 'eu-west-2', 'xmedaatjwxkmwkjmwuuz', 'secret')
  if (original === undefined) delete process.env.PRICING_DB_POOLER_PORT
  else process.env.PRICING_DB_POOLER_PORT = original
  const url = new URL(result.connectionString)
  assert.equal(url.port, '6543')
  assert.equal(url.searchParams.get('uselibpqcompat'), 'true')
  assert.equal(url.searchParams.get('pgbouncer'), 'true')
})

test('converts a direct Supabase URL to the configured pooler region', () => {
  const result = resolveDatabaseConnection(
    'postgresql://postgres:secret@db.fdnkzcpqyjajjawrwihl.supabase.co:5432/postgres',
    'eu-west-1',
    '',
    '',
  )
  const url = new URL(result.connectionString)
  assert.equal(result.mode, 'supavisor')
  assert.equal(url.hostname, 'aws-0-eu-west-1.pooler.supabase.com')
  assert.equal(url.port, '6543')
  assert.equal(url.searchParams.get('pgbouncer'), 'true')
  assert.equal(decodeURIComponent(url.username), 'postgres.fdnkzcpqyjajjawrwihl')
})

test('normalizes an explicitly configured pooler URL for Bolt', () => {
  const source = 'postgresql://postgres.ref:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require'
  const result = resolveDatabaseConnection(source, 'eu-west-1', '', '')
  const url = new URL(result.connectionString)
  assert.equal(result.mode, 'supavisor')
  assert.equal(url.port, '6543')
  assert.equal(url.searchParams.get('uselibpqcompat'), 'true')
  assert.equal(url.searchParams.get('pgbouncer'), 'true')
})

test('reports missing database configuration without leaking values', () => {
  const result = resolveDatabaseConnection('', 'eu-west-2', '', '')
  assert.deepEqual(result, { connectionString: '', configured: false, mode: 'missing', host: null })
})
