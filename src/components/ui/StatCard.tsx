import type { ReactNode } from 'react'
import { Link } from 'react-router'

export type StatTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const TONE_ACCENT: Record<StatTone, string> = {
  neutral: 'text-slate-900 dark:text-white',
  brand: 'text-brand-700 dark:text-brand-300',
  success: 'text-emerald-700 dark:text-emerald-300',
  warning: 'text-amber-700 dark:text-amber-300',
  danger: 'text-rose-700 dark:text-rose-300',
}

export interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatTone
  icon?: ReactNode
  /** When provided the whole card becomes a link. */
  to?: string
}

/** Compact metric tile used across both dashboards and the reports page. */
export function StatCard({ label, value, hint, tone = 'neutral', icon, to }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? (
          <span aria-hidden="true" className="text-lg text-slate-400 dark:text-slate-500">
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${TONE_ACCENT[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </>
  )

  const base =
    'rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'

  if (to) {
    return (
      <Link
        to={to}
        className={`${base} block transition hover:border-brand-400 hover:shadow-md dark:hover:border-brand-600`}
      >
        {inner}
      </Link>
    )
  }

  return <div className={base}>{inner}</div>
}
