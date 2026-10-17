import type { ReactNode } from 'react'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const TONES: Record<AlertTone, string> = {
  info: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-100',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100',
  danger:
    'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100',
}

const ICONS: Record<AlertTone, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  danger: '!',
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
      className={`flex items-start gap-3 rounded-lg border p-4 ${TONES[tone]} ${className}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-xs font-bold dark:bg-slate-900/50"
      >
        {ICONS[tone]}
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
        {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
