import type { ReactNode } from 'react'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

/**
 * Inline message. Uses a hairline border and a tinted background rather than an
 * icon, so it reads as a note in the page instead of a decorative element.
 */
const TONES: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-brand-50/70 text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100',
  success:
    'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  warning:
    'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  danger:
    'border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

export interface AlertProps {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, actions, className = '' }: AlertProps) {
  return (
    <div
      className={`rounded-md border px-4 py-3 text-sm ${TONES[tone]} ${className}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
