import bcrypt from 'bcryptjs'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import type { AppRole } from '@/lib/roles'

type DatabaseAuthUser = {
  id: string
  email: string
  name: string
  passwordHash: string
  role: 'ADMIN' | 'ANALYST' | 'READONLY'
  isSuperAdmin: boolean
}

const developmentSecret = 'prysight-development-only-secret-change-in-production'

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    (process.env.NODE_ENV === 'production' ? undefined : developmentSecret),
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mailadres', type: 'email' },
        password: { label: 'Wachtwoord', type: 'password' },
      },
      async authorize(credentials) {
        const email = typeof credentials.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials.password === 'string' ? credentials.password : ''

        if (!email || !password) return null

        const users = await prisma.$queryRaw<DatabaseAuthUser[]>`
          SELECT
            id,
            email,
            name,
            password_hash AS "passwordHash",
            role::text AS role,
            COALESCE(is_super_admin, false) AS "isSuperAdmin"
          FROM users
          WHERE lower(email) = lower(${email})
          LIMIT 1
        `

        const user = users[0]
        if (!user) return null

        const passwordMatches = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatches) return null

        const role: AppRole = user.isSuperAdmin ? 'SUPER_ADMIN' : user.role

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? token.sub ?? '')
        session.user.role = (token.role ?? 'READONLY') as AppRole
      }
      return session
    },
  },
})
