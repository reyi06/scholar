/**
 * Failed-login throttling.
 *
 * Without it, `/api/auth/login` is an unlimited password oracle: an attacker can
 * try a list of guesses as fast as the network allows, and the only cost is time.
 *
 * Two counters, because they defend against different things:
 *  - **per account** stops one account being ground down
 *  - **per address** stops one machine walking a list of accounts
 *
 * In memory, which is a deliberate simplification for a single-process
 * deployment. A multi-instance deployment must move this to shared storage;
 * that is worth stating rather than discovering.
 *
 * The response for a locked-out attempt is deliberately the same regardless of
 * whether the account exists, so the throttle cannot be used to enumerate
 * addresses.
 */

const WINDOW_MS = 15 * 60_000
const ACCOUNT_LIMIT = 5
const ADDRESS_LIMIT = 20

interface Entry {
  failures: number
  /** When the current window started. */
  since: number
}

const accountFailures = new Map<string, Entry>()
const addressFailures = new Map<string, Entry>()

function read(map: Map<string, Entry>, key: string, limit: number): { blocked: boolean; retryAfter: number } {
  const entry = map.get(key)
  if (!entry) return { blocked: false, retryAfter: 0 }

  const elapsed = Date.now() - entry.since
  if (elapsed > WINDOW_MS) {
    map.delete(key)
    return { blocked: false, retryAfter: 0 }
  }

  if (entry.failures >= limit) {
    return { blocked: true, retryAfter: Math.ceil((WINDOW_MS - elapsed) / 1000) }
  }

  return { blocked: false, retryAfter: 0 }
}

function bump(map: Map<string, Entry>, key: string): void {
  const now = Date.now()
  const entry = map.get(key)

  if (!entry || now - entry.since > WINDOW_MS) {
    map.set(key, { failures: 1, since: now })
    return
  }

  entry.failures += 1

  // Keep a long-running process from growing these maps without bound.
  if (map.size > 2000) {
    for (const [candidate, value] of map) {
      if (now - value.since > WINDOW_MS) map.delete(candidate)
    }
  }
}

export interface ThrottleVerdict {
  blocked: boolean
  retryAfterSeconds: number
}

/** Checked before the password is even looked at. */
export function loginThrottle(email: string, address: string | null): ThrottleVerdict {
  const account = read(accountFailures, email, ACCOUNT_LIMIT)
  const byAddress = address ? read(addressFailures, address, ADDRESS_LIMIT) : { blocked: false, retryAfter: 0 }

  if (!account.blocked && !byAddress.blocked) {
    return { blocked: false, retryAfterSeconds: 0 }
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.max(account.retryAfter, byAddress.retryAfter),
  }
}

/** Called only on a genuine credential failure. */
export function recordLoginFailure(email: string, address: string | null): void {
  bump(accountFailures, email)
  if (address) bump(addressFailures, address)
}

/** Called on success, so a legitimate user is not punished for earlier typos. */
export function clearLoginFailures(email: string): void {
  accountFailures.delete(email)
}

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

const REGISTRATION_LIMIT = 10
const REGISTRATION_WINDOW_MS = 60 * 60_000
const registrationAttempts = new Map<string, number[]>()

/**
 * Registration is not authenticated, so an address allowance is the only
 * practical limit on account spam. Ten per hour is generous for a household and
 * small enough to make bulk creation unattractive. In memory, like the login
 * counters, so it is a single-process control.
 */
export function registrationThrottle(address: string | null): ThrottleVerdict {
  if (!address) return { blocked: false, retryAfterSeconds: 0 }

  const now = Date.now()
  const recent = (registrationAttempts.get(address) ?? []).filter(
    (at) => now - at < REGISTRATION_WINDOW_MS,
  )

  if (recent.length >= REGISTRATION_LIMIT) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((REGISTRATION_WINDOW_MS - (now - recent[0])) / 1000),
    }
  }

  return { blocked: false, retryAfterSeconds: 0 }
}

export function recordRegistration(address: string | null): void {
  if (!address) return
  const now = Date.now()
  const recent = (registrationAttempts.get(address) ?? []).filter(
    (at) => now - at < REGISTRATION_WINDOW_MS,
  )
  recent.push(now)
  registrationAttempts.set(address, recent)

  if (registrationAttempts.size > 2000) {
    for (const [key, times] of registrationAttempts) {
      if (times.every((at) => now - at >= REGISTRATION_WINDOW_MS)) registrationAttempts.delete(key)
    }
  }
}
