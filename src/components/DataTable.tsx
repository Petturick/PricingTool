import { ReactNode } from 'react'

type Column<T> = {
  key: keyof T | string
  header: string
  className?: string
  render?: (row: T) => ReactNode
}

export function DataTable<T extends Record<string, ReactNode | string | number | null | undefined>>({ columns, rows, emptyText = 'Geen gegevens beschikbaar.' }: { columns: Array<Column<T>>; rows: T[]; emptyText?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border)] text-[12px]">
          <thead className="bg-[#fbfcfe] text-left text-[#7c8597]">
            <tr>
              {columns.map((column) => <th key={String(column.key)} className={`px-4 py-3 font-semibold ${column.className ?? ''}`}>{column.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef0f4]">
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-9 text-center text-[#8b95a7]">{emptyText}</td></tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="align-top text-[#4b5364] transition-colors hover:bg-[#fcfcfd]">
                  {columns.map((column) => <td key={String(column.key)} className={`px-4 py-3.5 ${column.className ?? ''}`}>{column.render ? column.render(row) : row[column.key as keyof T]}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
