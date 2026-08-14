'use client'

import { useActionState } from 'react'
import {
  addCompetitorOfferAction,
  createProductAction,
  setProductMarketAction,
  type CatalogActionState,
} from '@/app/actions/catalogActions'

type CountryOption = { id: string; code: string; name: string; currency: string }
type ProductGroupOption = { id: string; name: string }

const initialState: CatalogActionState = { ok: false, message: '' }
const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#a9c4ff]'
const labelClass = 'text-xs font-medium text-slate-600'

function ActionMessage({ state }: { state: CatalogActionState }) {
  if (!state.message) return null
  return (
    <p aria-live="polite" className={`rounded-xl border px-4 py-3 text-xs ${state.ok ? 'border-[#d6eedf] bg-[var(--green-soft)] text-[#276749]' : 'border-[#ffd3d9] bg-[var(--accent-soft)] text-[#b4233d]'}`}>
      {state.message}
    </p>
  )
}

export function ProductCreateForm({ countries, productGroups }: { countries: CountryOption[]; productGroups: ProductGroupOption[] }) {
  const [state, action, pending] = useActionState(createProductAction, initialState)

  return (
    <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-slate-900">Nieuw product handmatig opvoeren</summary>
      <form action={action} className="space-y-5 border-t border-slate-100 p-5">
        <ActionMessage state={state} />
        <div className="grid gap-4 md:grid-cols-3">
          <label className={labelClass}>Artikelnummer *<input className={inputClass} name="articleNumber" required /></label>
          <label className={labelClass}>EAN of GTIN<input className={inputClass} name="ean" /></label>
          <label className={labelClass}>Productnaam *<input className={inputClass} name="name" required /></label>
          <label className={labelClass}>Productgroep *<select className={inputClass} name="productGroupId" required defaultValue=""><option value="" disabled>Selecteer productgroep</option>{productGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
          <label className={labelClass}>Eigen prijs<input className={inputClass} name="ownPrice" type="number" min="0" step="0.01" /></label>
          <label className={labelClass}>Valuta<input className={inputClass} name="currency" defaultValue="EUR" maxLength={3} required /></label>
          <label className={labelClass}>Voorraadstatus<input className={inputClass} name="stockStatus" placeholder="Op voorraad" /></label>
          <label className={labelClass}>Verpakkingseenheid<input className={inputClass} name="packagingUnit" placeholder="stuks" /></label>
          <label className={labelClass}>Aantal per verpakking<input className={inputClass} name="packagingQty" type="number" min="1" defaultValue="1" /></label>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold text-slate-700">Beschikbaar in landen *</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {countries.map((country) => (
              <label key={country.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                <input type="checkbox" name="countryIds" value={country.id} />
                <span>{country.name} <span className="text-slate-400">{country.code}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <button disabled={pending} className="rounded-xl bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? 'Product opslaan…' : 'Product opslaan'}
        </button>
      </form>
    </details>
  )
}

export function ProductMarketForm({ productId, countries }: { productId: string; countries: CountryOption[] }) {
  const boundAction = setProductMarketAction.bind(null, productId)
  const [state, action, pending] = useActionState(boundAction, initialState)

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Land toevoegen of bijwerken</h2>
        <p className="mt-1 text-xs text-slate-500">Leg per markt de eigen prijs, webshop URL en voorraad vast.</p>
      </div>
      <ActionMessage state={state} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className={labelClass}>Land *<select className={inputClass} name="countryId" required defaultValue=""><option value="" disabled>Selecteer land</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
        <label className={labelClass}>Eigen prijs<input className={inputClass} name="ownPrice" type="number" min="0" step="0.01" /></label>
        <label className={labelClass}>Valuta<input className={inputClass} name="currency" placeholder="Automatisch" maxLength={3} /></label>
        <label className={`${labelClass} lg:col-span-2`}>Product URL<input className={inputClass} name="ownUrl" type="url" placeholder="https://www.engelslogistiek.nl/..." /></label>
        <label className={`${labelClass} md:col-span-2`}>Voorraadstatus<input className={inputClass} name="stockStatus" placeholder="Op voorraad" /></label>
      </div>
      <button disabled={pending} className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Opslaan…' : 'Landinstellingen opslaan'}</button>
    </form>
  )
}

export function CompetitorOfferForm({ productId, countries }: { productId: string; countries: CountryOption[] }) {
  const boundAction = addCompetitorOfferAction.bind(null, productId)
  const [state, action, pending] = useActionState(boundAction, initialState)

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Concurrent aan dit product koppelen</h2>
        <p className="mt-1 text-xs text-slate-500">Na opslaan wordt direct een eerste prijscontrole uitgevoerd. Daarna neemt de geplande monitoring het over.</p>
      </div>
      <ActionMessage state={state} />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>Land *<select className={inputClass} name="countryId" required defaultValue=""><option value="" disabled>Selecteer land</option>{countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}</select></label>
        <label className={labelClass}>Concurrent *<input className={inputClass} name="competitorName" required placeholder="Naam concurrent" /></label>
        <label className={`${labelClass} lg:col-span-2`}>Website concurrent *<input className={inputClass} name="competitorWebsite" type="url" required placeholder="https://concurrent.example" /></label>
        <label className={`${labelClass} md:col-span-2 lg:col-span-4`}>Product URL bij concurrent *<input className={inputClass} name="offerUrl" type="url" required placeholder="https://concurrent.example/product" /></label>
        <label className={labelClass}>Controlefrequentie in uren<input className={inputClass} name="checkFrequencyHours" type="number" min="1" defaultValue="24" /></label>
        <label className={labelClass}>Valuta<input className={inputClass} name="currency" placeholder="Automatisch" maxLength={3} /></label>
        <label className={labelClass}>Verpakkingseenheid<input className={inputClass} name="packagingUnit" placeholder="stuks" /></label>
        <label className={labelClass}>Aantal per verpakking<input className={inputClass} name="packagingQty" type="number" min="1" defaultValue="1" /></label>
      </div>
      <button disabled={pending} className="rounded-xl bg-[var(--blue)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Koppelen en prijs controleren…' : 'Concurrent koppelen en controleren'}</button>
    </form>
  )
}
