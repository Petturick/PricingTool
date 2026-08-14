export default function Loading() {
  return (
    <div className="space-y-5" aria-label="Pagina wordt geladen" aria-busy="true">
      <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
      <div className="h-9 w-80 max-w-full animate-pulse rounded-lg bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
    </div>
  )
}
