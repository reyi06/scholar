/**
 * Small, dependency-free formatting helpers.
 * All user-facing dates are rendered in a fixed, unambiguous style.
 */

const dateFormatter = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

/** Parse an ISO date/datetime string, returning null when unusable. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return pesoFormatter.format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('en-PH').format(value)
}

/** Whole days from today until `value`. Negative when the date has passed. */
export function daysUntil(value: string | null | undefined): number | null {
  const date = parseDate(value)
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/** Human phrasing for a deadline, e.g. "Closes in 12 days". */
export function describeDeadline(value: string | null | undefined): string {
  const days = daysUntil(value)
  if (days === null) return 'No deadline set'
  if (days < 0) return `Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes in ${days} days`
}

/** Whether a deadline is close enough to warrant a warning badge. */
export function isDeadlineSoon(value: string | null | undefined, withinDays = 14): boolean {
  const days = daysUntil(value)
  return days !== null && days >= 0 && days <= withinDays
}

/** Coarse relative time, e.g. "3 days ago". Good enough for activity lists. */
export function formatRelative(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return '—'
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  const abs = Math.abs(seconds)
  const suffix = seconds >= 0 ? 'ago' : 'from now'
  if (abs < 60) return 'Just now'
  if (abs < 3600) return `${Math.round(abs / 60)} min ${suffix}`
  if (abs < 86_400) return `${Math.round(abs / 3600)} hr ${suffix}`
  if (abs < 2_592_000) return `${Math.round(abs / 86_400)} day${Math.round(abs / 86_400) === 1 ? '' : 's'} ${suffix}`
  return formatDate(value)
}

/** Two-letter initials for avatar placeholders. */
export function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0)
  const b = lastName.trim().charAt(0)
  return `${a}${b}`.toUpperCase() || '?'
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

/** Truncate long prose for card previews without cutting mid-word. */
export function truncate(value: string, max = 160): string {
  if (value.length <= max) return value
  const cut = value.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  // Drop any trailing punctuation so the ellipsis does not follow a full stop
  // and read as "..".
  const body = cut.slice(0, lastSpace > 0 ? lastSpace : max).replace(/[\s.,;:!?—–-]+$/, '')
  return `${body}…`
}
