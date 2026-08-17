import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '@/generated/prisma/client'
import { calculatePriceDifference, normalizePrice } from './price-normalization'

test('normalizes packaging quantity without changing market currency', () => {
  const result = normalizePrice(new Prisma.Decimal('24.20'), true, new Prisma.Decimal('21'), 'EUR', 'doos', 2, true, 'EUR')
  assert.equal(result.amount.toFixed(2), '12.10')
  assert.equal(result.currency, 'EUR')
  assert.equal(result.packagingQty, 2)
})

test('refuses implicit cross-currency conversion without a live FX source', () => {
  assert.throws(
    () => normalizePrice(new Prisma.Decimal('10'), true, new Prisma.Decimal('20'), 'GBP', 'stuks', 1, true, 'EUR'),
    /wisselkoersbron/i,
  )
})

test('calculates own price position against a comparable market price', () => {
  const result = calculatePriceDifference(new Prisma.Decimal('105'), new Prisma.Decimal('100'))
  assert.equal(result.position, 'DUURDER')
  assert.equal(result.diff?.toFixed(2), '5.00')
  assert.equal(result.pctDiff?.toFixed(1), '5.0')
})
