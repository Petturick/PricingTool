const DIRECT_SUPABASE_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/i

const DEFAULT_SUPABASE_PROJECT_ID = 'xmedaatjwxkmwkjmwuuz'
const DEFAULT_SUPABASE_REGION = 'eu-west-2'
const DEFAULT_SUPAVISOR_PORT = '6543'
const SUPAVISOR_PROFILE = 'supavisor_transaction_tls_v3'

export type DatabaseConnectionInfo = {
  connectionString: string
  configured: boolean
  mode: 'missing' | 'direct' | 'supavisor' | 'custom'
  host: string | null
  source: 'missing' | 'full_url' | 'components'
}

function configureSupavisorUrl(url: URL) {
  url.port = DEFAULT_SUPAVISOR_PORT
  url.searchParams.set('sslmode', 'require')
  url.searchParams.set('uselibpqcompat', 'true')
  url.searchParams.set('pgbouncer', 'true')
  url.searchParams.set('application_name', 'pricingtool')
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

function buildSupavisorConnection(projectId: string, password: string, region: string, poolerHost: string, poolerUser: string): DatabaseConnectionInfo {
  const username = encodeURIComponent(poolerUser.trim() || `postgres.${projectId}`)
  const encodedPassword = encodeURIComponent(password)
  const host = cleanPoolerHost(poolerHost, region)
  const url = configureSupavisorUrl(new URL(`postgresql://${username}:${encodedPassword}@${host}/postgres`))
  const connectionString = url.toString()
  return { connectionString, configured: true, mode: 'supavisor', host, source: 'components' }
}

/**
 * PricingTool uses Supabase Supavisor because Bolt hosting may not have IPv6
 * access to the direct db.<project>.supabase.co hostname. Bolt deployments are
 * serverless, so Supavisor transaction pooling on port 6543 is enforced.
 * An exact full pooler URL always wins because Supabase assigns the pooler
 * host. Component variables remain available as a fallback for existing Bolt
 * deployments. `uselibpqcompat=true` keeps node-postgres SSL `require`
 * semantics aligned with Supabase while retaining encryption.
 */
export function resolveDatabaseConnection(
  rawConnectionString = process.env.PRICING_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  region = process.env.PRICING_DB_REGION ?? process.env.SUPABASE_DB_REGION ?? DEFAULT_SUPABASE_REGION,
  projectId = process.env.PRICING_DB_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID ?? DEFAULT_SUPABASE_PROJECT_ID,
  dbPassword = process.env.PRICING_DB_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD ?? '',
  poolerHost = process.env.PRICING_DB_POOLER_HOST ?? '',
  poolerUser = process.env.PRICING_DB_USER ?? '',
): DatabaseConnectionInfo {
  const cleanProjectId = projectId.trim()
  const cleanPassword = dbPassword.trim()
  const cleanRegion = region.trim() || DEFAULT_SUPABASE_REGION
  const value = rawConnectionString.trim()
  if (value) {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return { connectionString: value, configured: true, mode: 'custom', host: null, source: 'full_url' }
    }

    const directMatch = url.hostname.match(DIRECT_SUPABASE_HOST)
    if (!directMatch && !url.hostname.endsWith('.pooler.supabase.com')) {
      return { connectionString: value, configured: true, mode: 'custom', host: url.hostname, source: 'full_url' }
    }

    if (!directMatch) {
      configureSupavisorUrl(url)
      return { connectionString: url.toString(), configured: true, mode: 'supavisor', host: url.hostname, source: 'full_url' }
    }

    if (!cleanProjectId || !cleanPassword) {
      const projectRef = directMatch[1]
      const baseUsername = decodeURIComponent(url.username).split('.')[0] || 'postgres'
      url.hostname = cleanPoolerHost(poolerHost, cleanRegion)
      url.username = `${baseUsername}.${projectRef}`
      configureSupavisorUrl(url)
      return { connectionString: url.toString(), configured: true, mode: 'supavisor', host: url.hostname, source: 'full_url' }
    }
  }

  if (cleanProjectId && cleanPassword) {
    return buildSupavisorConnection(cleanProjectId, cleanPassword, cleanRegion, poolerHost, poolerUser)
  }

  return { connectionString: '', configured: false, mode: 'missing', host: null, source: 'missing' }
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
    port,
    profile: resolved.mode === 'supavisor' ? SUPAVISOR_PROFILE : null,
  }
}
