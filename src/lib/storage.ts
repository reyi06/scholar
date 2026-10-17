/**
 * Thin, failure-tolerant wrapper around `localStorage`.
 *
 * The demo data layer persists to localStorage so that changes survive a page
 * refresh. This is a convenience for the demo only — it is NOT a database and
 * it is NOT secure storage. Never put real credentials or private documents
 * here (see business rule 8 and 10).
 */

const PREFIX = 'pgc'

function key(name: string): string {
  return `${PREFIX}:${name}`
}

/** True when localStorage is usable (it is absent in some SSR/test contexts). */
export function isStorageAvailable(): boolean {
  try {
    const probe = key('__probe__')
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readJson<T>(name: string, fallback: T): T {
  if (!isStorageAvailable()) return fallback
  try {
    const raw = window.localStorage.getItem(key(name))
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    // Corrupt or unreadable payload — fall back rather than crash the app.
    return fallback
  }
}

export function writeJson(name: string, value: unknown): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled. The in-memory store still works for
    // the current session, so we deliberately swallow this.
  }
}

export function removeKey(name: string): void {
  if (!isStorageAvailable()) return
  try {
    window.localStorage.removeItem(key(name))
  } catch {
    // Nothing useful to do.
  }
}

/** Remove every key this app owns, leaving other origins/sites untouched. */
export function clearAll(): void {
  if (!isStorageAvailable()) return
  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const raw = window.localStorage.key(i)
      if (raw && raw.startsWith(`${PREFIX}:`)) doomed.push(raw)
    }
    doomed.forEach((raw) => window.localStorage.removeItem(raw))
  } catch {
    // Nothing useful to do.
  }
}

export const STORAGE_KEYS = {
  database: 'db.v1',
  session: 'session.v1',
} as const
