import assert from 'node:assert/strict'
import test from 'node:test'
import { extractOfferSnapshot } from './price-monitoring'

test('extracts structured JSON-LD product offers first', () => {
  const html = `<html><head><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Test product',
    sku: 'SKU-1',
    gtin13: '8712345678901',
    offers: {
      '@type': 'Offer',
      price: '24.95',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  })}</script></head></html>`
  const result = extractOfferSnapshot(html)
  assert.equal(result.price, 24.95)
  assert.equal(result.currency, 'EUR')
  assert.equal(result.stockStatus, 'Op voorraad')
  assert.equal(result.productTitle, 'Test product')
  assert.equal(result.method, 'JSON_LD')
})

test('falls back to product metadata', () => {
  const html = '<meta property="product:price:amount" content="19,95"><meta property="product:price:currency" content="EUR"><meta property="og:title" content="Metadata product">'
  const result = extractOfferSnapshot(html)
  assert.equal(result.price, 19.95)
  assert.equal(result.currency, 'EUR')
  assert.equal(result.productTitle, 'Metadata product')
  assert.equal(result.method, 'META')
})

test('does not invent a price when no supported price signal exists', () => {
  const result = extractOfferSnapshot('<html><title>No price here</title><body>Contact us</body></html>')
  assert.equal(result.price, null)
  assert.equal(result.method, null)
})
