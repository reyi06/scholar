import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** Optional icon. Keep usage rare — copy should carry the message. */
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

/**
 * Shown when a list or search genuinely returns nothing.
 * Always explains why the area is empty and offers the next useful step.
 * Rendered without a box so it does not read as another card on the page.
 */
export function EmptyState({ title, description, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-14 text-center ${className}`}
    >
      {icon ? (
        <div aria-hidden="true" className="text-slate-300 dark:text-slate-600">
          {icon}
        </div>
      ) : null}
      <div className="max-w-sm space-y-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {description ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
