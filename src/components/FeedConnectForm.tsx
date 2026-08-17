'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const countries = [
  ['GLOBAL', 'Algemeen of meerdere landen'], ['NL', 'Nederland'], ['BE', 'België'], ['DE', 'Duitsland'], ['FR', 'Frankrijk'], ['PT', 'Portugal'], ['ES', 'Spanje'], ['GB', 'Verenigd Koninkrijk'], ['DK', 'Denemarken'],
]

export function FeedConnectForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [countryCode, setCountryCode] = useState('GLOBAL')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const connect = async () => {
    if (!url.trim() || busy || disabled) return
    setBusy(true)
    setMessage(null)
    try {
      const response = await fetch('/api/feeds/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name, countryCode }),
      })
      const result = await response.json() as { feedSourceId?: string; rows?: number; columns?: number; error?: string }
      if (!response.ok) throw new Error(result.error || 'Feed koppelen mislukt.')
      setMessage({ type: 'success', text: `${result.rows ?? 0} productregels en ${result.columns ?? 0} kolommen geïmporteerd.` })
      router.push(`/feeds/data?source=${encodeURIComponent(result.feedSourceId ?? '')}`)
      router.refresh()
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Feed koppelen mislukt.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['1', 'Bron invoeren', 'Plak een directe of openbaar gedeelde productfeedlink.'],
          ['2', 'Automatisch controleren', 'PricingTool controleert bereikbaarheid, formaat en productregels.'],
          ['3', 'Kolommen en data klaar', 'Herkende kolommen worden opgeslagen en producten direct bijgewerkt.'],
        ].map((step) => <div key={step[0]} className="rounded-xl border border-[var(--border)] bg-white p-3"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--blue)] text-[10px] font-semibold text-white">{step[0]}</span><span className="text-[11px] font-semibold text-[#252a37]">{step[1]}</span></div><p className="mt-2 text-[10px] leading-5 text-[#8a93a5]">{step[2]}</p></div>)}
      </div>

      <div className="rounded-xl border border-[#cfe0ff] bg-[var(--blue-soft)] px-4 py-3 text-[11px] leading-5 text-[#35558f]">Een productfeed bevat meerdere productregels met bijvoorbeeld SKU of EAN, titel, prijs en voorraad. XML, CSV, JSON, XLSX, XLS en openbare Google Drive bestanden worden ondersteund. Een sitemap of gewone webpagina wordt geweigerd.</div>

      {message && <div className={`rounded-xl border px-4 py-3 text-[11px] ${message.type === 'success' ? 'border-[#d6eedf] bg-[var(--green-soft)] text-[#276749]' : 'border-[#ffd3d9] bg-[var(--accent-soft)] text-[#b4233d]'}`}>{message.text}</div>}

      <div>
        <label className="text-[11px] font-medium text-[#4e5668]">URL van de productfeed *</label>
        <input disabled={disabled || busy} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://leverancier.example/productfeed.xml of een openbare Google Drive-link" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-[11px] text-[#303647] outline-none focus:border-[#a9c4ff] disabled:bg-[#f6f7fa]" />
        <p className="mt-1 text-[10px] text-[#929bad]">Maximaal 15 MB en 20.000 regels per synchronisatie.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div><label className="text-[11px] font-medium text-[#4e5668]">Naam</label><input disabled={disabled || busy} value={name} onChange={(event) => setName(event.target.value)} placeholder="Wordt automatisch voorgesteld" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-[11px]" /></div>
        <div><label className="text-[11px] font-medium text-[#4e5668]">Land</label><select disabled={disabled || busy} value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-[11px]">{countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></div>
      </div>

      <button type="button" disabled={disabled || busy || !url.trim()} onClick={() => void connect()} className="focus-ring h-10 w-full rounded-xl bg-[var(--blue)] px-4 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Bron ophalen, kolommen herkennen en producten importeren…' : 'Bron koppelen en importeren'}</button>
    </div>
  )
}
