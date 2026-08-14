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
  assert.equal(result.source, 'components')
  assert.equal(url.hostname, 'aws-0-eu-west-2.pooler.supabase.com')
  assert.equal(url.port, '6543')
  assert.equal(decodeURIComponent(url.username), 'postgres.xmedaatjwxkmwkjmwuuz')
  assert.equal(decodeURIComponent(url.password), 'secret with spaces')
  assert.equal(url.searchParams.get('sslmode'), 'require')
  assert.equal(url.searchParams.get('uselibpqcompat'), 'true')
  assert.equal(url.searchParams.get('pgbouncer'), 'true')
})

test('uses a rotated component password while retaining the assigned pooler host', () => {
  const result = resolveDatabaseConnection(
    'postgresql://exact.user:exact%20password@aws-1-eu-west-2.pooler.supabase.com:5432/postgres',
    'eu-west-2',
    'current-project',
    'current-password',
    'aws-0-eu-west-2.pooler.supabase.com',
    'ignored.user',
  )
  const url = new URL(result.connectionString)
  assert.equal(result.source, 'components')
  assert.equal(url.hostname, 'aws-1-eu-west-2.pooler.supabase.com')
  assert.equal(url.port, '6543')
  assert.equal(decodeURIComponent(url.username), 'exact.current-project')
  assert.equal(decodeURIComponent(url.password), 'current-password')
})

test('normalizes a full pooler URL username to the configured project', () => {
  const result = resolveDatabaseConnection(
    'postgresql://postgres:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    'eu-west-2',
    'xmedaatjwxkmwkjmwuuz',
    '',
  )
  const url = new URL(result.connectionString)
  assert.equal(result.source, 'full_url')
  assert.equal(decodeURIComponent(url.username), 'postgres.xmedaatjwxkmwkjmwuuz')
})

test('rejects copied password placeholders before making a connection attempt', () => {
  const result = resolveDatabaseConnection(
    'postgresql://postgres.xmedaatjwxkmwkjmwuuz:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres',
    'eu-west-2',
    'xmedaatjwxkmwkjmwuuz',
    '',
  )
  assert.equal(result.configured, false)
  assert.equal(result.configurationIssue, 'placeholder_password')
  assert.equal(result.connectionString, '')
})

test('uses an explicit pooler host and user for component configuration', () => {
  const result = resolveDatabaseConnection('', 'eu-west-2', 'project-ref', 'secret', 'aws-1-eu-west-2.pooler.supabase.com', 'custom.project-ref')
  const url = new URL(result.connectionString)
  assert.equal(result.source, 'components')
  assert.equal(url.hostname, 'aws-1-eu-west-2.pooler.supabase.com')
  assert.equal(decodeURIComponent(url.username), 'custom.project-ref')
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
  assert.deepEqual(result, { connectionString: '', configured: false, mode: 'missing', host: null, source: 'missing', configurationIssue: 'missing_password' })
})
