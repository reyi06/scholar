import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** Optional decorative icon or illustration. */
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Shown when a list or search genuinely returns nothing.
 * Always explain why the area is empty and offer the next useful step rather
 * than a bare "no data" message (business rule 9).
 */
export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {icon ? (
        <div aria-hidden="true" className="text-3xl text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      ) : null}
      <div className="max-w-md space-y-1">
        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
