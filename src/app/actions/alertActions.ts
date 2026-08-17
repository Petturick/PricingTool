'use server'

import { createAuditLog } from '@/lib/audit'
import { requireUser, VIEW_ROLES } from '@/lib/authz'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function markAlertReadAction(alertId: string) {
  const currentUser = await requireUser(VIEW_ROLES)
  const alert = await prisma.alert.update({ where: { id: alertId }, data: { isRead: true } })
  await createAuditLog({
    userId: currentUser.id,
    action: 'ALERT_MARKED_READ',
    entityType: 'Alert',
    entityId: alert.id,
    newValue: { isRead: true },
  })
  revalidatePath('/waarschuwingen')
  revalidatePath('/dashboard')
}
