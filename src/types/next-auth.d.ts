import type { DefaultSession } from 'next-auth'

type PrySightRole = 'ADMIN' | 'ANALYST' | 'READONLY'

declare module 'next-auth' {
  interface User {
    role: PrySightRole
  }

  interface Session {
    user: {
      id: string
      role: PrySightRole
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    role?: PrySightRole
  }
}
