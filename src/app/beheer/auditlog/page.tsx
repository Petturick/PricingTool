export const dynamic = 'force-dynamic'
import { DataTable } from '@/components/DataTable'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function AuditlogPage() {
  const logs = await prisma.auditLog.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Auditlog</h1>
      <DataTable
        columns={[
          { key: 'datum', header: 'Datum' },
          { key: 'gebruiker', header: 'Gebruiker' },
          { key: 'actie', header: 'Actie' },
          { key: 'entity', header: 'Entiteit' },
          { key: 'ip', header: 'IP-adres' },
          { key: 'waarden', header: 'Wijziging' },
        ]}
        rows={logs.map((log) => ({
          datum: formatDate(log.createdAt),
          gebruiker: log.user.name,
          actie: log.action,
          entity: `${log.entityType} · ${log.entityId}`,
          ip: log.ipAddress,
          waarden: <pre className="max-w-md whitespace-pre-wrap text-xs text-slate-600">{JSON.stringify({ oud: log.oldValue, nieuw: log.newValue }, null, 2)}</pre>,
        }))}
      />
    </div>
  )
}
