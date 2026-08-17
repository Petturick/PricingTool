import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { loginAction } from '@/app/actions/authActions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  const params = await searchParams
  const hasCredentialsError = params.error === 'credentials'
  const hasMissingError = params.error === 'missing'

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 17 9 12l3 3 7-8" /><path d="M15 7h4v4" /></svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a94a6]">Engels Group</p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-[-0.02em] text-[#171b28]">PrySight</h1>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#171b28]">Inloggen</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">Log in met je PrySight account om prijsmonitoring, feeds en beheer te openen.</p>
          </div>

          {(hasCredentialsError || hasMissingError) && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {hasMissingError ? 'Vul je e-mailadres en wachtwoord in.' : 'E-mailadres of wachtwoord is onjuist.'}
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#344054]">E-mailadres</span>
              <input name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-[#171b28] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" placeholder="naam@bedrijf.nl" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#344054]">Wachtwoord</span>
              <input name="password" type="password" autoComplete="current-password" required className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-[#171b28] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]" placeholder="••••••••••••" />
            </label>
            <button type="submit" className="mt-2 w-full rounded-xl bg-[#171b28] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#252b3b] focus:outline-none focus:ring-2 focus:ring-[#171b28] focus:ring-offset-2">Inloggen bij PrySight</button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-[#98a2b3]">Alleen geautoriseerde Engels Group gebruikers hebben toegang.</p>
      </div>
    </div>
  )
}
