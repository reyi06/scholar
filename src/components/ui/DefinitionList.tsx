import type { ReactNode } from 'react'

export interface DefinitionItem {
  label: string
  value: ReactNode
  /** Span the full width on multi-column layouts. */
  wide?: boolean
}

export interface DefinitionListProps {
  items: DefinitionItem[]
  columns?: 1 | 2 | 3
  className?: string
}

/**
 * Label/value pairs for summary views. Rendered as a semantic `<dl>` with
 * quiet labels above readable values.
 */
export function DefinitionList({ items, columns = 2, className = '' }: DefinitionListProps) {
  const columnClass =
    columns === 1 ? '' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'

  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-5 ${columnClass} ${className}`}>
      {items.map((item) => (
        <div key={item.label} className={item.wide ? 'sm:col-span-full' : undefined}>
          <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</dt>
          <dd className="mt-1 text-sm break-words text-slate-800 dark:text-slate-200">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
