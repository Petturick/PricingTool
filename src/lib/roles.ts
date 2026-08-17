import { UserRole } from '@/generated/prisma/client'

export type AppRole = UserRole | 'SUPER_ADMIN'

export function isAdminRole(role: AppRole | null | undefined) {
  return role === 'SUPER_ADMIN' || role === UserRole.ADMIN
}

export function isSuperAdminRole(role: AppRole | null | undefined) {
  return role === 'SUPER_ADMIN'
}

export function roleLabel(role: AppRole | null | undefined) {
  if (role === 'SUPER_ADMIN') return 'Super admin'
  if (role === UserRole.ADMIN) return 'Admin'
  if (role === UserRole.ANALYST) return 'Analist'
  return 'Alleen lezen'
}
