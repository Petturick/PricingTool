import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export const proxy = auth((request) => {
  const pathname = request.nextUrl.pathname
  const isLogin = pathname === '/login'

  if (isLogin && request.auth?.user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isLogin && !request.auth?.user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
