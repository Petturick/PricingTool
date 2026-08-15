const DIRECT_SUPABASE_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/i

const DEFAULT_SUPABASE_PROJECT_ID = 'xmedaatjwxkmwkjmwuuz'
const DEFAULT_SUPABASE_REGION = 'eu-west-2'
const DEFAULT_SUPAVISOR_PORT = '5432'

export type DatabaseConnectionInfo = {
  connectionString: string
  configured: boolean
  mode: 'missing' | 'direct' | 'supavisor' | 'custom'
  host: string | null
  source: 'missing' | 'full_url' | 'components'
  configurationIssue: 'invalid_url' | 'missing_password' | 'placeholder_password' | null
}

function normalizePoolerPort(value: string) {
  return value.trim() === '6543' ? '6543' : DEFAULT_SUPAVISOR_PORT
}

function configureSupavisorUrl(url: URL, poolerPort: string) {
  const port = normalizePoolerPort(poolerPort)
  url.port = port
  url.searchParams.set('sslmode', 'require')
  url.searchParams.set('uselibpqcompat', 'true')
  url.searchParams.set('application_name', 'pricingtool')
  if (port === '6543') url.searchParams.set('pgbouncer', 'true')
  else url.searchParams.delete('pgbouncer')
  url.searchParams.delete('connection_limit')
  url.searchParams.delete('connect_timeout')
  url.searchParams.delete('pool_timeout')
  return url
}

function cleanPoolerHost(value: string, region: string) {
  const fallback = `aws-0-${region}.pooler.supabase.com`
  const candidate = value.trim().replace(/^postgres(?:ql)?:\/\//i, '').split('/')[0]?.split('@').pop()?.split(':')[0] ?? ''
  return candidate.toLowerCase().endsWith('.pooler.supabase.com') ? candidate.toLowerCase() : fallback
}

function buildSupavisorConnection(
  projectId: string,
  password: string,
  region: string,
  poolerHost: string,
  poolerUser: string,
  poolerPort: string,
): DatabaseConnectionInfo {
  const username = encodeURIComponent(poolerUser.trim() || `postgres.${projectId}`)
  const encodedPassword = encodeURIComponent(password)
  const host = cleanPoolerHost(poolerHost, region)
  const url = configureSupavisorUrl(new URL(`postgresql://${username}:${encodedPassword}@${host}/postgres`), poolerPort)
  const connectionString = url.toString()
  return { connectionString, configured: true, mode: 'supavisor', host, source: 'components', configurationIssue: null }
}

function decoded(value: string) {
  try { return decodeURIComponent(value) } catch { return value }
}

function isPlaceholderPassword(value: string) {
  const normalized = decoded(value).trim().toLowerCase()
  return !normalized
    || normalized.includes('[your-password]')
    || normalized.includes('your_actual_password')
    || normalized.includes('je_werkelijke_supabase')
    || normalized.includes('replace_with')
}

function normalizePoolerUser(url: URL, projectId: string) {
  if (!projectId) return
  const username = decoded(url.username)
  const baseUsername = username.split('.')[0] || 'postgres'
  if (!username.endsWith(`.${projectId}`)) url.username = `${baseUsername}.${projectId}`
}

/**
 * PricingTool uses Supabase Supavisor because Bolt hosting may not have IPv6
 * access to the direct db.<project>.supabase.co hostname. Session pooling on
 * port 5432 is the compatibility-first default for Prisma + node-postgres in
 * the Bolt runtime. Transaction pooling on port 6543 remains available through
 * PRICING_DB_POOLER_PORT when it is explicitly required. A component password
 * wins when present, while an assigned host from a full URL is retained.
 */
export function resolveDatabaseConnection(
  rawConnectionString = process.env.PRICING_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  region = process.env.PRICING_DB_REGION ?? process.env.SUPABASE_DB_REGION ?? DEFAULT_SUPABASE_REGION,
  projectId = process.env.PRICING_DB_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID ?? DEFAULT_SUPABASE_PROJECT_ID,
  dbPassword = process.env.PRICING_DB_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD ?? '',
  poolerHost = process.env.PRICING_DB_POOLER_HOST ?? '',
  poolerUser = process.env.PRICING_DB_USER ?? '',
  poolerPort = process.env.PRICING_DB_POOLER_PORT ?? process.env.SUPABASE_DB_POOLER_PORT ?? DEFAULT_SUPAVISOR_PORT,
): DatabaseConnectionInfo {
  const cleanProjectId = projectId.trim()
  const cleanPassword = dbPassword.trim()
  const cleanRegion = region.trim() || DEFAULT_SUPABASE_REGION
  const value = rawConnectionString.trim()
  let parsedUrl: URL | null = null

  if (value) {
    try {
      parsedUrl = new URL(value)
    } catch {
      return { connectionString: '', configured: false, mode: 'custom', host: null, source: 'full_url', configurationIssue: 'invalid_url' }
    }
  }

  if (cleanPassword && isPlaceholderPassword(cleanPassword)) {
    return { connectionString: '', configured: false, mode: 'missing', host: null, source: 'components', configurationIssue: 'placeholder_password' }
  }

  if (cleanProjectId && cleanPassword) {
    const assignedHost = parsedUrl?.hostname.endsWith('.pooler.supabase.com') ? parsedUrl.hostname : poolerHost
    const assignedUsername = parsedUrl?.hostname.endsWith('.pooler.supabase.com')
      ? `${decoded(parsedUrl.username).split('.')[0] || 'postgres'}.${cleanProjectId}`
      : poolerUser
    return buildSupavisorConnection(cleanProjectId, cleanPassword, cleanRegion, assignedHost, assignedUsername, poolerPort)
  }

  if (parsedUrl) {
    const url = parsedUrl

    const directMatch = url.hostname.match(DIRECT_SUPABASE_HOST)
    if (!directMatch && !url.hostname.endsWith('.pooler.supabase.com')) {
      return { connectionString: value, configured: true, mode: 'custom', host: url.hostname, source: 'full_url', configurationIssue: null }
    }

    if (isPlaceholderPassword(url.password)) {
      return { connectionString: '', configured: false, mode: 'missing', host: url.hostname, source: 'full_url', configurationIssue: url.password ? 'placeholder_password' : 'missing_password' }
    }

    if (!directMatch) {
      normalizePoolerUser(url, cleanProjectId)
      configureSupavisorUrl(url, poolerPort)
      return { connectionString: url.toString(), configured: true, mode: 'supavisor', host: url.hostname, source: 'full_url', configurationIssue: null }
    }

    const projectRef = directMatch[1]
    const baseUsername = decoded(url.username).split('.')[0] || 'postgres'
    url.hostname = cleanPoolerHost(poolerHost, cleanRegion)
    url.username = `${baseUsername}.${projectRef}`
    configureSupavisorUrl(url, poolerPort)
    return { connectionString: url.toString(), configured: true, mode: 'supavisor', host: url.hostname, source: 'full_url', configurationIssue: null }
  }

  return { connectionString: '', configured: false, mode: 'missing', host: null, source: 'missing', configurationIssue: 'missing_password' }
}

export function getSafeDatabaseStatus() {
  const resolved = resolveDatabaseConnection()
  let port: string | null = null
  try {
    port = resolved.connectionString ? new URL(resolved.connectionString).port || null : null
  } catch {
    port = null
  }
  return {
    configured: resolved.configured,
    mode: resolved.mode,
    host: resolved.host,
    source: resolved.source,
    configurationIssue: resolved.configurationIssue,
    port,
    profile: resolved.mode === 'supavisor'
      ? (port === '6543' ? 'supavisor_transaction_tls_v3' : 'supavisor_session_tls_v3')
      : null,
  }
}
