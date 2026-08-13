const DIRECT_SUPABASE_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/i

const DEFAULT_SUPABASE_REGION = 'eu-west-2'

export type DatabaseConnectionInfo = {
  connectionString: string
  configured: boolean
  mode: 'missing' | 'direct' | 'supavisor' | 'custom'
  host: string | null
}

function buildSupavisorConnection(projectId: string, password: string, region: string): DatabaseConnectionInfo {
  const username = encodeURIComponent(`postgres.${projectId}`)
  const encodedPassword = encodeURIComponent(password)
  const host = `aws-0-${region}.pooler.supabase.com`
  const connectionString = `postgresql://${username}:${encodedPassword}@${host}:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1&connect_timeout=30&pool_timeout=30`
  return { connectionString, configured: true, mode: 'supavisor', host }
}

/**
 * Bolt reserves custom secret names starting with SUPABASE_. Prefer the
 * PRICING_DB_* names there. The older SUPABASE_* variables remain supported
 * as backwards-compatible fallbacks for GitHub Actions and other runtimes.
 * DATABASE_URL remains available as a final fallback.
 */
export function resolveDatabaseConnection(
  rawConnectionString = process.env.DATABASE_URL ?? '',
  region = process.env.PRICING_DB_REGION ?? process.env.SUPABASE_DB_REGION ?? DEFAULT_SUPABASE_REGION,
  projectId = process.env.PRICING_DB_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID ?? '',
  dbPassword = process.env.PRICING_DB_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD ?? '',
): DatabaseConnectionInfo {
  const cleanProjectId = projectId.trim()
  const cleanPassword = dbPassword.trim()
  if (cleanProjectId && cleanPassword) return buildSupavisorConnection(cleanProjectId, cleanPassword, region)

  const value = rawConnectionString.trim()
  if (!value) return { connectionString: '', configured: false, mode: 'missing', host: null }

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

  return { connectionString: url.toString(), configured: true, mode: 'supavisor', host: url.hostname }
}

export function getSafeDatabaseStatus() {
  const resolved = resolveDatabaseConnection()
  return { configured: resolved.configured, mode: resolved.mode, host: resolved.host }
}
