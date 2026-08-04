'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Engels Group prijsmonitoring</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">Dit onderdeel kan tijdelijk niet worden geladen</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Het dashboard blijft bereikbaar. Probeer de gegevens opnieuw te laden of kies een ander onderdeel in het menu.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
      >
        Opnieuw laden
      </button>
    </section>
  )
}
