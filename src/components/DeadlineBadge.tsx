import { Badge } from './ui/index.ts'
import { describeDeadline, daysUntil, isDeadlineSoon } from '../lib/format.ts'

export interface DeadlineBadgeProps {
  /** ISO date (yyyy-mm-dd). */
  deadline: string
  /** Set false on closed listings so the wording does not imply it is open. */
  open?: boolean
}

/**
 * Deadline indicator. Colour escalates as the date approaches so students can
 * scan a directory and spot closing listings immediately.
 */
export function DeadlineBadge({ deadline, open = true }: DeadlineBadgeProps) {
  const days = daysUntil(deadline)

  if (!open || days === null || days < 0) {
    return <Badge tone="neutral">{describeDeadline(deadline)}</Badge>
  }

  const tone = isDeadlineSoon(deadline, 7) ? 'danger' : isDeadlineSoon(deadline, 21) ? 'warning' : 'info'
  return <Badge tone={tone}>{describeDeadline(deadline)}</Badge>
}
