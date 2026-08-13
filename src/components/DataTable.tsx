import { ReactNode } from 'react'

type Column<T> = {
  key: keyof T | string
  header: string
  className?: string
  render?: (row: T) => ReactNode
}

export function DataTable<T extends Record<string, ReactNode | string | number | null | undefined>>({
  columns,
  rows,
  emptyText = 'Geen gegevens beschikbaar.',
}: {
  columns: Array<Column<T>>
  rows: T[]
  emptyText?: string
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className={`px-4 py-3 font-medium ${column.className ?? ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="align-top text-slate-700">
                  {columns.map((column) => (
                    <td key={String(column.key)} className={`px-4 py-3 ${column.className ?? ''}`}>
                      {column.render ? column.render(row) : row[column.key as keyof T]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
