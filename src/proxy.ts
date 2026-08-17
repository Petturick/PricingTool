export { auth as proxy } from '@/auth'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/producten/:path*',
    '/concurrenten/:path*',
    '/productmatches/:path*',
    '/waarschuwingen/:path*',
    '/rapportages/:path*',
    '/import/:path*',
    '/feeds/:path*',
    '/integraties/:path*',
    '/prijsstrategie/:path*',
    '/beheer/:path*',
  ],
}
