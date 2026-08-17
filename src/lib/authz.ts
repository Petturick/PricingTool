import { auth } from '@/auth'
import { isAdminRole, isSuperAdminRole } from '@/lib/roles'

export async function requireAuthenticatedUser() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Niet geauthenticeerd')
  }
  return session.user
}

export async function requireAdmin() {
  const user = await requireAuthenticatedUser()
  if (!isAdminRole(user.role)) {
    throw new Error('Onvoldoende rechten')
  }
  return user
}

export async function requireSuperAdmin() {
  const user = await requireAuthenticatedUser()
  if (!isSuperAdminRole(user.role)) {
    throw new Error('Super admin rechten vereist')
  }
  return user
}
