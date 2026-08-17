import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_REDIRECTS = 5

function ipv4Number(address: string) {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0
}

function inV4Range(address: string, base: string, prefix: number) {
  const value = ipv4Number(address)
  const start = ipv4Number(base)
  if (value === null || start === null) return false
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (value & mask) === (start & mask)
}

export function isBlockedNetworkAddress(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (isIP(normalized) === 4) {
    return [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['224.0.0.0', 4],
      ['240.0.0.0', 4],
    ].some(([base, prefix]) => inV4Range(normalized, String(base), Number(prefix)))
  }

  if (isIP(normalized) === 6) {
    if (normalized === '::' || normalized === '::1') return true
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff')) return true
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped?.[1]) return isBlockedNetworkAddress(mapped[1])
  }

  return false
}

export function validatePublicHttpUrl(value: string | URL, label = 'URL') {
  let url: URL
  try { url = value instanceof URL ? new URL(value) : new URL(value.trim()) } catch { throw new Error(`${label} is ongeldig.`) }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} moet HTTP of HTTPS gebruiken.`)
  if (url.username || url.password) throw new Error(`${label} mag geen gebruikersnaam of wachtwoord bevatten.`)

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || isBlockedNetworkAddress(hostname)) {
    throw new Error(`${label} mag niet naar een lokaal of privénetwerk verwijzen.`)
  }
  return url
}

export async function assertPublicHttpUrl(value: string | URL, label = 'URL') {
  const url = validatePublicHttpUrl(value, label)
  if (isIP(url.hostname.replace(/^\[|\]$/g, ''))) return url

  let addresses: Array<{ address: string }> = []
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true })
  } catch {
    throw new Error(`${label} kon niet veilig via DNS worden opgelost.`)
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedNetworkAddress(address))) {
    throw new Error(`${label} resolveert naar een lokaal, privé of gereserveerd netwerkadres.`)
  }
  return url
}

export async function fetchPublicUrl(input: string | URL, init: RequestInit = {}) {
  let current = await assertPublicHttpUrl(input)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(current, { ...init, redirect: 'manual' })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response

    const location = response.headers.get('location')
    if (!location) throw new Error('Externe bron retourneerde een redirect zonder geldige bestemming.')
    if (redirect === MAX_REDIRECTS) throw new Error('Externe bron bevat te veel redirects.')
    current = await assertPublicHttpUrl(new URL(location, current))
  }
  throw new Error('Externe bron kon niet veilig worden gevolgd.')
}
