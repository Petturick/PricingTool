import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { UserRole } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export const VIEW_ROLES = [UserRole.ADMIN, UserRole.ANALYST, UserRole.READONLY] as const
export const WRITE_ROLES = [UserRole.ADMIN, UserRole.ANALYST] as const
export const ADMIN_ROLES = [UserRole.ADMIN] as const

type AllowedRoles = readonly UserRole[]

export async function getAuthorizedUser(allowedRoles: AllowedRoles = VIEW_ROLES) {
  const session = await auth()
  if (!session?.user?.id) {
    return { user: null, status: 401, message: 'Log in om PrySight te gebruiken.' } as const
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.id === 'system_pricing') {
    return { user: null, status: 401, message: 'Deze sessie is niet meer geldig.' } as const
  }

  if (!allowedRoles.includes(user.role)) {
    return { user: null, status: 403, message: 'U heeft geen rechten voor deze actie.' } as const
  }

  return { user, status: 200, message: 'OK' } as const
}

export async function requireUser(allowedRoles: AllowedRoles = VIEW_ROLES) {
  const access = await getAuthorizedUser(allowedRoles)
  if (!access.user) {
    throw new Error(access.status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED')
  }
  return access.user
}

export async function authorizeApi(allowedRoles: AllowedRoles = VIEW_ROLES) {
  const access = await getAuthorizedUser(allowedRoles)
  if (!access.user) {
    return {
      user: null,
      response: NextResponse.json({ error: access.message }, { status: access.status }),
    } as const
  }
  return { user: access.user, response: null } as const
}
