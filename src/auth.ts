import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
})

const protectedAdminPrefix = '/beheer'
const validRoles = new Set(['ADMIN', 'ANALYST', 'READONLY'] as const)
type PrySightRole = 'ADMIN' | 'ANALYST' | 'READONLY'

function parseRole(value: unknown): PrySightRole | undefined {
  const role = String(value ?? '') as PrySightRole
  return validRoles.has(role) ? role : undefined
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      name: 'PrySight account',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        })
        if (!user || user.id === 'system_pricing' || user.passwordHash === '!') return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = parseRole(user.role)
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? '')
        const role = parseRole(token.role)
        if (role) session.user.role = role
      }
      return session
    },
    authorized({ auth, request }) {
      if (!auth?.user?.id) return false
      if (request.nextUrl.pathname.startsWith(protectedAdminPrefix) && auth.user.role !== 'ADMIN') {
        return Response.redirect(new URL('/dashboard', request.nextUrl))
      }
      return true
    },
  },
})
