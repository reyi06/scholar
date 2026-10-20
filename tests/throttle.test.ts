import { describe, expect, it } from 'vitest'
import { clearLoginFailures, loginThrottle, recordLoginFailure } from '../server/throttle.ts'

/**
 * Failed-login throttling.
 *
 * The counters are module-level and in memory, so every test uses its own
 * address and account to stay independent.
 */
describe('loginThrottle', () => {
  it('allows attempts below the account limit', () => {
    const email = 'below@example.com'
    for (let i = 0; i < 4; i += 1) recordLoginFailure(email, null)
    expect(loginThrottle(email, null).blocked).toBe(false)
  })

  it('blocks the account on the fifth failure and offers a retry window', () => {
    const email = 'blocked@example.com'
    for (let i = 0; i < 5; i += 1) recordLoginFailure(email, null)

    const verdict = loginThrottle(email, null)
    expect(verdict.blocked).toBe(true)
    expect(verdict.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('does not spill a lockout onto another account', () => {
    const locked = 'locked@example.com'
    for (let i = 0; i < 5; i += 1) recordLoginFailure(locked, null)
    expect(loginThrottle('innocent@example.com', null).blocked).toBe(false)
  })

  it('does not lock an account because another address failed', () => {
    const address = '203.0.113.9'
    for (let i = 0; i < 5; i += 1) recordLoginFailure(`noise${i}@example.com`, address)
    expect(loginThrottle('quiet@example.com', '203.0.113.10').blocked).toBe(false)
  })

  it('clears the account counter after a successful sign-in', () => {
    const email = 'forgetful@example.com'
    for (let i = 0; i < 4; i += 1) recordLoginFailure(email, null)
    clearLoginFailures(email)
    // Four more failures are the new first four, not eight.
    for (let i = 0; i < 4; i += 1) recordLoginFailure(email, null)
    expect(loginThrottle(email, null).blocked).toBe(false)
  })
})
