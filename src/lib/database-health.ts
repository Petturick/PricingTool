export type ConnectionFailureReason =
  | 'authentication_failed'
  | 'circuit_breaker_open'
  | 'client_limit_reached'
  | 'database_credentials_rejected'
  | 'pooler_tenant_not_found'
  | 'pooler_routing_failed'
  | 'dns_failed'
  | 'connection_refused'
  | 'connection_timeout'
  | 'tls_failed'
  | 'connection_failed'

function readErrorChain(error: unknown) {
  const messages: string[] = []
  const codes: string[] = []
  const pending: unknown[] = [error]
  const seen = new Set<unknown>()

  while (pending.length && seen.size < 24) {
    const current = pending.shift()
    if (!current || typeof current !== 'object' || seen.has(current)) continue
    seen.add(current)
    const value = current as { message?: unknown; detail?: unknown; hint?: unknown; code?: unknown; cause?: unknown; errors?: unknown; originalError?: unknown }
    for (const part of [value.message, value.detail, value.hint]) {
      if (typeof part === 'string') messages.push(part)
    }
    if (typeof value.code === 'string') codes.push(value.code)
    pending.push(value.cause, value.originalError)
    if (Array.isArray(value.errors)) pending.push(...value.errors)
  }

  return {
    message: messages.join(' | ').toLowerCase(),
    code: codes.find(Boolean) ?? null,
  }
}

export function classifyConnectionFailure(error: unknown): { reason: ConnectionFailureReason; errorCode: string | null } {
  const { message, code } = readErrorChain(error)

  if (message.includes('circuit breaker open') || message.includes('new connections are temporarily blocked')) {
    return { reason: 'circuit_breaker_open', errorCode: code }
  }

  if (message.includes('max client connections reached') || message.includes('too many clients')) {
    return { reason: 'client_limit_reached', errorCode: code }
  }

  if (code === '28P01' || message.includes('password authentication failed') || message.includes('authentication failed')) {
    return { reason: 'authentication_failed', errorCode: code }
  }

  if (message.includes('tenant or user not found') || message.includes('tenant not found')) {
    return { reason: 'pooler_tenant_not_found', errorCode: code }
  }

  if (message.includes('worker_not_found') || message.includes('failed to retrieve database credentials')) {
    return { reason: 'pooler_routing_failed', errorCode: code }
  }

  if (message.includes('connection closed when state was authentication') || message.includes('right credentials')) {
    return { reason: 'database_credentials_rejected', errorCode: code }
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || message.includes('getaddrinfo')) {
    return { reason: 'dns_failed', errorCode: code }
  }

  if (code === 'ECONNREFUSED' || message.includes('connection refused')) {
    return { reason: 'connection_refused', errorCode: code }
  }

  if (code === 'ETIMEDOUT' || message.includes('timeout') || message.includes('timed out')) {
    return { reason: 'connection_timeout', errorCode: code }
  }

  if (message.includes('certificate') || message.includes('tls') || message.includes('ssl')) {
    return { reason: 'tls_failed', errorCode: code }
  }

  return { reason: 'connection_failed', errorCode: code }
}
