/**
 * Identifier helpers for the demo data layer.
 *
 * The `prefix` keeps generated ids readable in the UI and in localStorage,
 * which makes debugging the demo store much easier. These are NOT
 * cryptographically secure identifiers and must not be treated as such.
 */

let counter = 0

export function createId(prefix: string): string {
  counter += 1
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${random}`
}

/**
 * Human-facing reference number, e.g. `PGC-APP-2026-0007`.
 * Sequences are per-prefix and reset on reload in demo mode.
 */
const sequences = new Map<string, number>()

export function createReferenceNumber(kind: string, year = new Date().getFullYear()): string {
  const next = (sequences.get(kind) ?? 0) + 1
  sequences.set(kind, next)
  return `PGC-${kind}-${year}-${String(next).padStart(4, '0')}`
}
