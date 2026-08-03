import Link from 'next/link'
import { generateWeeklyReportAction } from '@/app/actions/reportActions'
import { DataTable } from '@/components/DataTable'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function RapportagesPage() {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Rapportages</h1>
          <p className="mt-2 text-sm text-slate-600">Wekelijkse managementrapportages met trends, uitzonderingen en kwaliteitscontrole.</p>
        </div>
        <form action={generateWeeklyReportAction}>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white">Weekrapport genereren</button>
        </form>
      </div>
      <DataTable
        columns={[
          { key: 'titel', header: 'Titel' },
          { key: 'periode', header: 'Periode' },
          { key: 'status', header: 'Status' },
          { key: 'gegenereerd', header: 'Gegenereerd op' },
          { key: 'export', header: 'Export' },
        ]}
        rows={reports.map((report) => ({
          titel: report.title,
          periode: `${formatDate(report.weekStart, false)} – ${formatDate(report.weekEnd, false)}`,
          status: report.status,
          gegenereerd: formatDate(report.generatedAt),
          export: (
            <div className="flex gap-2">
              <Link href={`/api/rapportages?id=${report.id}&format=csv`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium">CSV</Link>
              <Link href={`/api/rapportages?id=${report.id}&format=xlsx`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium">XLSX</Link>
            </div>
          ),
        }))}
      />
    </div>
  )
}
