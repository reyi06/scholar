import type { ReactNode } from 'react'
import { Link } from 'react-router'

export type StatTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger'

const TONE_ACCENT: Record<StatTone, string> = {
  neutral: 'text-slate-900 dark:text-slate-100',
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
  /** When provided the metric becomes a link. */
  to?: string
}

/**
 * A single metric, rendered as text rather than a box.
 *
 * Deliberately has no card chrome so that a group of metrics reads as one line
 * of figures instead of a wall of tiles. Wrap several in `StatRow`.
 */
export function StatCard({ label, value, hint, tone = 'neutral', to }: StatCardProps) {
  const inner = (
    <>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${TONE_ACCENT[tone]}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </>
  )

  if (to) {
    return (
      <Link to={to} className="block transition-colors hover:opacity-80">
        {inner}
      </Link>
    )
  }

  return <div>{inner}</div>
}

/**
 * Lays metrics out in a row separated by hairlines — the lightweight
 * alternative to a grid of statistic cards.
 */
export function StatRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`grid grid-cols-2 gap-y-6 divide-slate-200 sm:grid-cols-4 sm:divide-x dark:divide-ink-800 ${className}`}
    >
      {children}
    </div>
  )
}

/** One cell inside a `StatRow`, providing the padding the dividers need. */
export function StatCell({ children }: { children: ReactNode }) {
  return <div className="px-0 sm:px-5 sm:first:pl-0">{children}</div>
}
