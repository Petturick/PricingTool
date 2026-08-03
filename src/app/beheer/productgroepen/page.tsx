import { deleteProductGroupAction, saveProductGroupAction } from '@/app/actions/adminActions'
import { DataTable } from '@/components/DataTable'
import { prisma } from '@/lib/prisma'

export default async function ProductgroepenBeheerPage() {
  const groups = await prisma.productGroup.findMany({ orderBy: { name: 'asc' } })
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Productgroepen beheer</h1>
      <form action={saveProductGroupAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input name="name" placeholder="Naam" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
        <input name="description" placeholder="Beschrijving" className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> Actief</label>
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white md:col-span-4">Productgroep opslaan</button>
      </form>
      <DataTable
        columns={[
          { key: 'naam', header: 'Naam' },
          { key: 'beschrijving', header: 'Beschrijving' },
          { key: 'status', header: 'Status' },
          { key: 'actie', header: 'Actie' },
        ]}
        rows={groups.map((group) => ({
          naam: group.name,
          beschrijving: group.description ?? '—',
          status: group.isActive ? 'Actief' : 'Inactief',
          actie: <form action={deleteProductGroupAction}><input type="hidden" name="id" value={group.id} /><button className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700">Verwijderen</button></form>,
        }))}
      />
    </div>
  )
}
