import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'brand' | 'gold' | 'success' | 'warning' | 'danger' | 'info'
export type BadgeSize = 'sm' | 'md'

/**
 * Muted, low-contrast chips. Status colours are semantic only — they exist to
 * distinguish states, not to decorate. `brand` is maroon, the one accent;
 * `gold` is reserved for featured and pinned markers.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200',
  gold: 'bg-gold-100 text-gold-800 dark:bg-gold-800/25 dark:text-gold-200',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
}

const SIZES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[11px]',
  md: 'px-2 py-0.5 text-xs',
}

export interface BadgeProps {
  tone?: BadgeTone
  size?: BadgeSize
  className?: string
  /** Optional leading dot, useful for status indicators. */
  dot?: boolean
  children: ReactNode
}

export function Badge({ tone = 'neutral', size = 'sm', dot = false, className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-medium whitespace-nowrap ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  )
}
