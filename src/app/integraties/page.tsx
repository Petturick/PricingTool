export const dynamic = 'force-dynamic'

function Status({ ready }: { ready: boolean }) {
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ready ? 'bg-[var(--green-soft)] text-[var(--green)]' : 'bg-[var(--amber-soft)] text-[var(--amber)]'}`}>{ready ? 'Geconfigureerd' : 'Configuratie nodig'}</span>
}

export default function IntegrationsPage() {
  const monitorReady = Boolean(process.env.PRICE_MONITOR_API_KEY)
  const feedReady = Boolean(process.env.DATA_FEED_API_KEY)
  const webhookReady = Boolean(process.env.ALERT_WEBHOOK_URL)
  const cards = [
    { title: 'Automatische prijscontroles', description: 'De scheduler kan gematchte concurrentie URLs periodiek controleren en schrijft geldige prijzen, voorraad en historie direct weg.', ready: monitorReady, detail: 'Vereist PRICE_MONITOR_API_KEY en optioneel de meegeleverde GitHub Actions scheduler.' },
    { title: 'Productfeed', description: 'ERP, Magento, PIM of een andere bron kan eigen producten, prijzen en voorraad via een beveiligde JSON feed synchroniseren.', ready: feedReady, detail: 'POST naar /api/integraties/product-feed met Bearer DATA_FEED_API_KEY.' },
    { title: 'Alert webhook', description: 'Nieuwe prijs, voorraad en opportunity signalen kunnen direct naar een externe workflow, Teams, Slack of mailservice worden doorgestuurd.', ready: webhookReady, detail: 'Vereist ALERT_WEBHOOK_URL. De webhook ontvangt JSON met type, titel, melding en gekoppelde IDs.' },
  ]
  return (
    <div className="space-y-5">
      <section className="surface-card p-5 sm:p-6"><p className="eyebrow">Integraties</p><h1 className="mt-2 text-[28px] font-semibold tracking-[-0.035em] text-[#161a26]">Van losse import naar continue datastroom</h1><p className="mt-2 max-w-3xl text-[13px] leading-6 text-[#697386]">De Prisync import blijft beschikbaar als overgang, maar de doelarchitectuur is directe synchronisatie van eigen productdata en automatische controle van concurrentieaanbiedingen.</p></section>
      <section className="grid gap-4 xl:grid-cols-3">{cards.map((card) => <div key={card.title} className="surface-card p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-[14px] font-semibold text-[#252a37]">{card.title}</h2><Status ready={card.ready} /></div><p className="mt-3 text-[12px] leading-6 text-[#697386]">{card.description}</p><p className="mt-4 border-t border-[var(--border)] pt-4 text-[11px] leading-5 text-[#8790a2]">{card.detail}</p></div>)}</section>
      <section className="surface-card p-5"><h2 className="text-[14px] font-semibold text-[#252a37]">Volgende writeback laag</h2><p className="mt-2 max-w-4xl text-[12px] leading-6 text-[#697386]">Automatische prijswijziging naar Magento of ERP is nog bewust afgeschermd. Eerst moeten kostprijs, minimale marge, maximale prijs, bevoegdheden en goedkeuringsregels als harde guardrails beschikbaar zijn. Tot die tijd blijft de prijsstrategie in advies en simulatiemodus.</p></section>
    </div>
  )
}
