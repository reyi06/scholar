import type { ReactNode } from 'react'

export interface CardProps {
  className?: string
  children: ReactNode
}

/** Plain white surface. No resting shadow, minimal radius. */
export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function CardHeader({ title, description, actions, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className = '', children }: CardProps) {
  return <div className={`p-5 ${className}`}>{children}</div>
}

export function CardFooter({ className = '', children }: CardProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-800 ${className}`}
    >
      {children}
    </div>
  )
}
