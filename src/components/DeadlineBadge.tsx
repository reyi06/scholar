import { describeDeadline, daysUntil, isDeadlineSoon } from '../lib/format.ts'

export interface DeadlineBadgeProps {
  /** ISO date (yyyy-mm-dd). */
  deadline: string
  /** Set false on closed listings so the wording does not imply it is open. */
  open?: boolean
}

/**
 * Deadline indicator.
 *
 * Rendered as quiet text that gains weight and colour as the date approaches,
 * rather than a coloured chip on every listing.
 */
export function DeadlineBadge({ deadline, open = true }: DeadlineBadgeProps) {
  const days = daysUntil(deadline)

  if (!open || days === null || days < 0) {
    return <span className="text-sm text-slate-500 dark:text-slate-400">{describeDeadline(deadline)}</span>
  }

  const tone = isDeadlineSoon(deadline, 7)
    ? 'font-medium text-rose-700 dark:text-rose-400'
    : isDeadlineSoon(deadline, 21)
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-slate-500 dark:text-slate-400'

  return <span className={`text-sm ${tone}`}>{describeDeadline(deadline)}</span>
}
