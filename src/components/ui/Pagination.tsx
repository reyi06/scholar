import { Button } from './Button.tsx'

export interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Total number of records, shown as "Showing x–y of z". */
  total?: number
  pageSize?: number
  className?: string
}

/**
 * Compact pager. Renders nothing when there is only a single page, so simple
 * lists do not carry dead controls.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const first = pageSize ? (page - 1) * pageSize + 1 : null
  const last = pageSize && total ? Math.min(page * pageSize, total) : null

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${className}`}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {first !== null && last !== null && total !== undefined
          ? `Showing ${first}–${last} of ${total}`
          : `Page ${page} of ${totalPages}`}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="px-1 text-sm text-slate-600 dark:text-slate-300">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
