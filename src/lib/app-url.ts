const PRODUCTION_APP_URL = 'https://pricingtool.bolt.host'

function resolveAppUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    PRODUCTION_APP_URL

  try {
    return new URL(configuredUrl)
  } catch {
    return new URL(PRODUCTION_APP_URL)
  }
}

export const appUrl = resolveAppUrl()
export const appOrigin = appUrl.origin
