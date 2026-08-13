const DIRECT_SUPABASE_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/i

const DEFAULT_SUPABASE_REGION = 'eu-west-1'

export type DatabaseConnectionInfo = {
  connectionString: string
  configured: boolean
  mode: 'missing' | 'direct' | 'supavisor' | 'custom'
  host: string | null
}

/**
 * Bolt Hosting cannot reliably reach Supabase's IPv6-only direct database host.
 * Convert that URL to Supavisor transaction mode while retaining the existing
 * database credentials. Explicit pooler/custom URLs are left untouched.
 */
export function resolveDatabaseConnection(
  rawConnectionString = process.env.DATABASE_URL ?? '',
  region = process.env.SUPABASE_DB_REGION ?? DEFAULT_SUPABASE_REGION,
): DatabaseConnectionInfo {
  const value = rawConnectionString.trim()
  if (!value) {
    return { connectionString: '', configured: false, mode: 'missing', host: null }
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return { connectionString: value, configured: true, mode: 'custom', host: null }
  }

  const directMatch = url.hostname.match(DIRECT_SUPABASE_HOST)
  if (!directMatch) {
    return {
      connectionString: value,
      configured: true,
      mode: url.hostname.endsWith('.pooler.supabase.com') ? 'supavisor' : 'custom',
      host: url.hostname,
    }
  }

  const projectRef = directMatch[1]
  const baseUsername = decodeURIComponent(url.username).split('.')[0] || 'postgres'
  url.hostname = `aws-0-${region}.pooler.supabase.com`
  url.port = '6543'
  url.username = `${baseUsername}.${projectRef}`
  url.searchParams.set('sslmode', 'require')
  url.searchParams.set('pgbouncer', 'true')
  url.searchParams.set('connection_limit', '1')
  url.searchParams.set('connect_timeout', '30')
  url.searchParams.set('pool_timeout', '30')

  return {
    connectionString: url.toString(),
    configured: true,
    mode: 'supavisor',
    host: url.hostname,
  }
}

export function getSafeDatabaseStatus() {
  const resolved = resolveDatabaseConnection()
  return {
    configured: resolved.configured,
    mode: resolved.mode,
    host: resolved.host,
  }
}
