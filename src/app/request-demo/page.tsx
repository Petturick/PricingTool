import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingChrome } from '@/components/MarketingChrome'

export const metadata: Metadata = {
  title: 'Request demo',
  description: 'Plan een PrySight demo rond uw assortiment, markten, concurrentiebronnen en pricing workflow.',
}

const demoTopics = [
  ['Your assortment', 'Welke producten en productgroepen wilt u actief volgen?'],
  ['Your markets', 'In welke landen of markten vergelijkt u prijzen?'],
  ['Your competitors', 'Welke concurrenten en bronnen zijn commercieel relevant?'],
  ['Your workflow', 'Wie analyseert, beoordeelt en besluit over prijswijzigingen?'],
]

export default function RequestDemoPage() {
  return (
    <MarketingChrome>
      <main>
        <section className="border-b border-[var(--border)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8fc_100%)]">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div><p className="eyebrow">Request demo</p><h1 className="mt-4 text-[42px] font-semibold leading-[1.05] tracking-[-0.05em] text-[var(--brand-navy)] sm:text-[52px]">See PrySight with your pricing reality in mind.</h1><p className="mt-5 max-w-xl text-[14px] leading-7 text-[#6d788d]">Een goede demo begint niet met een generieke featuretour. We brengen eerst assortiment, markten, concurrenten en gewenste pricing workflow in kaart en laten daarna zien waar PrySight het meeste waarde toevoegt.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/features" className="rounded-xl border border-[var(--border-strong)] bg-white px-5 py-3 text-[12px] font-semibold text-[var(--brand-navy)]">Explore features</Link><Link href="/dashboard" className="rounded-xl bg-[var(--brand-blue)] px-5 py-3 text-[12px] font-semibold text-white">Login</Link></div></div>
            <div className="rounded-[24px] border border-[var(--border)] bg-white p-6 shadow-[0_22px_65px_rgba(15,24,51,0.08)] sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]">Demo scope</p><h2 className="mt-2 text-[22px] font-semibold tracking-[-0.035em] text-[var(--brand-navy)]">What we cover</h2></div><span className="rounded-full bg-[var(--brand-mint-soft)] px-3 py-1.5 text-[9px] font-semibold text-[var(--green)]">30–45 min</span></div><div className="mt-6 space-y-3">{demoTopics.map(([title,text], index) => <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] p-4"><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-blue-soft)] text-[9px] font-semibold text-[var(--brand-blue)]">0{index + 1}</span><div><h3 className="text-[12px] font-semibold text-[var(--brand-navy)]">{title}</h3><p className="mt-1 text-[10px] leading-5 text-[#7b8598]">{text}</p></div></div></div>)}</div></div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-20"><div className="grid gap-4 md:grid-cols-3"><div className="surface-card p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-blue)]">Before</p><h2 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Define the use case</h2><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">We bepalen welke markten, producten en concurrenten het belangrijkst zijn.</p></div><div className="surface-card p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-violet)]">During</p><h2 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Walk through the workflow</h2><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">We laten de route zien van databron naar monitoring, analyse en prijsbesluit.</p></div><div className="surface-card p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-cyan)]">After</p><h2 className="mt-3 text-[16px] font-semibold text-[var(--brand-navy)]">Agree on scope</h2><p className="mt-2 text-[11px] leading-5 text-[#7a8497]">We bepalen welke implementatie, integraties en monitoringomvang logisch zijn.</p></div></div>
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] px-5 py-4 text-[10px] leading-5 text-[#7c879a]">De website bevat op dit moment bewust nog geen zelfstandig leadformulier. Demo-aanvragen worden pas aan een mail- of CRM-koppeling verbonden zodra de gewenste commerciële ontvangstroute is vastgesteld, zodat persoonsgegevens niet ongemerkt naar een willekeurige externe dienst worden gestuurd.</div>
        </section>
      </main>
    </MarketingChrome>
  )
}
