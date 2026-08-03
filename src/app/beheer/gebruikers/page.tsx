import { UserRole } from '@/generated/prisma'
import { deleteUserAction, saveUserAction } from '@/app/actions/adminActions'
import { DataTable } from '@/components/DataTable'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export default async function GebruikersBeheerPage() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Gebruikers beheer</h1>
      <form action={saveUserAction} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input name="email" placeholder="E-mailadres" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
        <input name="name" placeholder="Naam" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
        <input name="password" type="password" placeholder="Wachtwoord" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
        <select name="role" className="rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
          {Object.values(UserRole).map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
        <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-medium text-white md:col-span-4">Gebruiker opslaan</button>
      </form>
      <DataTable
        columns={[
          { key: 'naam', header: 'Naam' },
          { key: 'email', header: 'E-mail' },
          { key: 'rol', header: 'Rol' },
          { key: 'aangemaakt', header: 'Aangemaakt' },
          { key: 'actie', header: 'Actie' },
        ]}
        rows={users.map((user) => ({
          naam: user.name,
          email: user.email,
          rol: user.role,
          aangemaakt: formatDate(user.createdAt),
          actie: <form action={deleteUserAction}><input type="hidden" name="id" value={user.id} /><button className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700">Verwijderen</button></form>,
        }))}
      />
    </div>
  )
}
