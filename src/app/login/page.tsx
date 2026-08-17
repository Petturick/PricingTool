import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { MarketingChrome } from '@/components/MarketingChrome'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Log in op de beveiligde PrySight pricing intelligence workspace.',
}

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams])
  if (session?.user?.id) redirect('/dashboard')

  return (
    <MarketingChrome>
      <main className="min-h-[70vh] bg-[var(--surface-soft)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-[1040px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow">Secure workspace</p>
            <h1 className="mt-4 text-[40px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--brand-navy)] sm:text-[50px]">Welcome back to PrySight.</h1>
            <p className="mt-5 max-w-lg text-[14px] leading-7 text-[#6d788d]">Log in to manage products, markets, competitors, price checks, alerts and pricing recommendations. Access is role based and every write action is verified server side.</p>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-white p-6 shadow-[0_22px_65px_rgba(15,24,51,0.08)] sm:p-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]">PrySight account</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.035em] text-[var(--brand-navy)]">Login</h2>
            </div>

            {params.error ? (
              <div className="mt-5 rounded-xl border border-[#efd6d9] bg-[var(--danger-soft)] px-4 py-3 text-[11px] leading-5 text-[var(--danger)]">De combinatie van e-mailadres en wachtwoord is niet geldig.</div>
            ) : null}

            <form
              className="mt-6 space-y-4"
              action={async (formData) => {
                'use server'
                await signIn('credentials', {
                  email: String(formData.get('email') ?? ''),
                  password: String(formData.get('password') ?? ''),
                  redirectTo: '/dashboard',
                })
              }}
            >
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[var(--brand-deep)]">E-mail</span>
                <input name="email" type="email" autoComplete="email" required className="focus-ring w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-3 text-[12px] text-[var(--brand-navy)]" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold text-[var(--brand-deep)]">Wachtwoord</span>
                <input name="password" type="password" autoComplete="current-password" minLength={8} required className="focus-ring w-full rounded-xl border border-[var(--border-strong)] bg-white px-3.5 py-3 text-[12px] text-[var(--brand-navy)]" />
              </label>
              <button type="submit" className="focus-ring w-full rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white shadow-[0_9px_24px_rgba(65,105,201,0.18)]">Login to PrySight</button>
            </form>

            <p className="mt-5 text-[10px] leading-5 text-[#8791a3]">Accounts are managed by a PrySight administrator. The system service account cannot be used for interactive login.</p>
          </div>
        </div>
      </main>
    </MarketingChrome>
  )
}
