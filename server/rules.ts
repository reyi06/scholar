/**
 * Pure business rules.
 *
 * Kept out of the route handlers so they can be tested without a database and
 * so the same answer is given wherever a rule is applied.
 */

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Deadlines are stored as `YYYY-MM-DD`, so a string comparison is a date comparison. */
export function isPastDeadline(deadline: string, today = todayIso()): boolean {
  return Boolean(deadline) && deadline < today
}

/** A real calendar date in `YYYY-MM-DD` form, not just something that looks like one. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/**
 * Application decisions.
 *
 * `approved -> rejected` exists only as a correction path, and only while no
 * grant has been confirmed. A grant is the financial record; after that, the
 * decision is history, not a draft.
 */
export const APPLICATION_TRANSITIONS: Record<string, readonly string[]> = {
  draft: [],
  submitted: ['under-review', 'needs-info', 'approved', 'rejected'],
  'under-review': ['needs-info', 'approved', 'rejected'],
  'needs-info': ['under-review', 'approved', 'rejected'],
  approved: ['rejected'],
  rejected: ['under-review'],
}

export function applicationDecisionAllowed(
  from: string,
  to: string,
  hasGrant: boolean,
): boolean {
  if (from === to) return false
  if (hasGrant) return false
  return (APPLICATION_TRANSITIONS[from] ?? []).includes(to)
}

/**
 * Registration decisions. A verified registration is locked: it is what keeps
 * a confirmed grant active, and changing it should be a deliberate new act,
 * not another click on the same screen.
 */
export const REGISTRATION_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['verified', 'rejected'],
  rejected: ['verified'],
  verified: [],
}

export function registrationDecisionAllowed(from: string, to: string): boolean {
  if (from === to) return false
  return (REGISTRATION_TRANSITIONS[from] ?? []).includes(to)
}

/**
 * Detect Prisma's unique-constraint error.
 *
 * `field` narrows it to one column or index, so a reference-number collision
 * can be retried while a genuine duplicate is reported.
 */
export function isUniqueViolation(error: unknown, field?: string): boolean {
  if (!error || typeof error !== 'object') return false
  if ((error as { code?: string }).code !== 'P2002') return false
  if (!field) return true

  const target = (error as { meta?: { target?: unknown } }).meta?.target
  const names = Array.isArray(target) ? target.map(String) : typeof target === 'string' ? [target] : []
  return names.some((name) => name.includes(field))
}
