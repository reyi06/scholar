import type { ReactNode, ThHTMLAttributes } from 'react'
import { Skeleton } from './Skeleton.tsx'

/* ------------------------------------------------------------------ */
/* Low-level table primitives                                          */
/* ------------------------------------------------------------------ */

export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full min-w-[44rem] border-collapse text-left text-sm ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-slate-200 dark:border-slate-800">
      {children}
    </thead>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{children}</tbody>
}

export function TR({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>
}

export function TH({
  children,
  className = '',
  ...rest
}: ThHTMLAttributes<HTMLTableCellElement> & { children?: ReactNode }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 ${className}`}
      {...rest}
    >
      {children}
    </th>
  )
}

export function TD({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <td className={`px-4 py-3 align-middle text-slate-700 dark:text-slate-200 ${className}`}>{children}</td>
  )
}

/* ------------------------------------------------------------------ */
/* Config-driven table                                                 */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  /** Stable key for the column. */
  key: string
  header: ReactNode
  /** Cell renderer. Takes precedence over `accessor`. */
  render?: (row: T) => ReactNode
  /** Simple value extractor when no custom `render` is needed. */
  accessor?: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string
  loading?: boolean
  /** Rendered when `rows` is empty and `loading` is false. */
  empty?: ReactNode
  caption?: string
  onRowClick?: (row: T) => void
}

const ALIGN: Record<'left' | 'right' | 'center', string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
}

/**
 * Table driven by a column configuration, used by administrator list screens.
 * Horizontal scrolling is handled by `Table`, so wide tables stay usable on
 * mobile without collapsing into an unreadable stack.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  empty,
  caption,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 py-2" role="status" aria-label="Loading table">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return <>{empty}</>
  }

  return (
    <Table>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <THead>
        <TR>
          {columns.map((column) => (
            <TH key={column.key} className={`${ALIGN[column.align ?? 'left']} ${column.className ?? ''}`}>
              {column.header}
            </TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR
            key={getRowId(row)}
            className={onRowClick ? 'cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60' : undefined}
          >
            {columns.map((column) => (
              <TD key={column.key} className={`${ALIGN[column.align ?? 'left']} ${column.className ?? ''}`}>
                {onRowClick ? (
                  <button type="button" onClick={() => onRowClick(row)} className="block w-full text-left">
                    {column.render ? column.render(row) : (column.accessor?.(row) ?? null)}
                  </button>
                ) : column.render ? (
                  column.render(row)
                ) : (
                  (column.accessor?.(row) ?? null)
                )}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
