import { randomUUID } from 'node:crypto'

/** Identifier with a readable prefix, e.g. `sch_1f3c…`. */
export function createId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/**
 * Human-facing reference number that does not collide with an existing record,
 * e.g. `SCH-APP-2026-0007`.
 *
 * Unlike the browser implementation, this reads the existing numbers from the
 * database, so it stays correct across restarts.
 */
export function nextReference(kind: string, existing: string[], year = new Date().getFullYear()): string {
  const prefix = `SCH-${kind}-${year}-`
  const highest = existing
    .filter((reference) => reference.startsWith(prefix))
    .reduce((max, reference) => {
      const sequence = Number.parseInt(reference.slice(prefix.length), 10)
      return Number.isNaN(sequence) ? max : Math.max(max, sequence)
    }, 0)

  return `${prefix}${String(highest + 1).padStart(4, '0')}`
}
