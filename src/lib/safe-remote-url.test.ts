import assert from 'node:assert/strict'
import test from 'node:test'
import { isBlockedNetworkAddress, validatePublicHttpUrl } from './safe-remote-url'

test('blocks local, private, link-local and carrier-grade IPv4 ranges', () => {
  for (const address of ['127.0.0.1', '10.20.1.4', '172.16.0.1', '172.31.255.254', '192.168.1.10', '169.254.169.254', '100.64.0.1']) {
    assert.equal(isBlockedNetworkAddress(address), true, address)
  }
  assert.equal(isBlockedNetworkAddress('8.8.8.8'), false)
})

test('blocks private IPv6 and embedded private IPv4', () => {
  assert.equal(isBlockedNetworkAddress('::1'), true)
  assert.equal(isBlockedNetworkAddress('fd00::1'), true)
  assert.equal(isBlockedNetworkAddress('fe80::1'), true)
  assert.equal(isBlockedNetworkAddress('::ffff:127.0.0.1'), true)
})

test('only accepts public HTTP URLs without embedded credentials', () => {
  assert.throws(() => validatePublicHttpUrl('file:///etc/passwd'))
  assert.throws(() => validatePublicHttpUrl('http://localhost:3000'))
  assert.throws(() => validatePublicHttpUrl('http://169.254.169.254/latest/meta-data'))
  assert.throws(() => validatePublicHttpUrl('https://user:secret@example.com/product'))
  assert.equal(validatePublicHttpUrl('https://example.com/product').hostname, 'example.com')
})
