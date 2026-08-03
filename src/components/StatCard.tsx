import { ReactNode } from 'react'

export function StatCard({ title, value, helper, accent }: { title: string; value: ReactNode; helper?: ReactNode; accent?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
        </div>
        {accent ? <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{accent}</div> : null}
      </div>
      {helper ? <div className="mt-4 text-sm text-slate-500">{helper}</div> : null}
    </div>
  )
}
