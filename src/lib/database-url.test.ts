import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveDatabaseConnection } from './database-url'

test('converts the Bolt Supabase direct URL to the IPv4 compatible pooler', () => {
  const result = resolveDatabaseConnection(
    'postgresql://postgres:secret@db.fdnkzcpqyjajjawrwihl.supabase.co:5432/postgres',
    'eu-west-1',
  )

  const url = new URL(result.connectionString)
  assert.equal(result.mode, 'supavisor')
  assert.equal(url.hostname, 'aws-0-eu-west-1.pooler.supabase.com')
  assert.equal(url.port, '6543')
  assert.equal(decodeURIComponent(url.username), 'postgres.fdnkzcpqyjajjawrwihl')
  assert.equal(url.searchParams.get('sslmode'), 'require')
  assert.equal(url.searchParams.get('connection_limit'), '1')
})

test('preserves an explicitly configured pooler URL', () => {
  const source = 'postgresql://postgres.ref:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require'
  const result = resolveDatabaseConnection(source)
  assert.equal(result.connectionString, source)
  assert.equal(result.mode, 'supavisor')
})

test('reports a missing database URL without leaking values', () => {
  const result = resolveDatabaseConnection('')
  assert.deepEqual(result, { connectionString: '', configured: false, mode: 'missing', host: null })
})
