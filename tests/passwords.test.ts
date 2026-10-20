import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../server/passwords.ts'

/**
 * Credential hashing.
 *
 * This is the one place where a regression is not cosmetic: a hash that can be
 * read back, or a comparison that accepts the wrong password, is a breach.
 */
describe('password hashing', () => {
  it('accepts the original password', () => {
    const stored = hashPassword('correct horse battery staple')
    expect(verifyPassword('correct horse battery staple', stored)).toBe(true)
  })

  it('refuses a wrong password', () => {
    const stored = hashPassword('defense123')
    expect(verifyPassword('defense124', stored)).toBe(false)
    expect(verifyPassword('', stored)).toBe(false)
  })

  it('never stores the password itself', () => {
    const stored = hashPassword('defense123')
    expect(stored).not.toContain('defense123')
    expect(stored.startsWith('scrypt:')).toBe(true)
  })

  it('produces a different hash for the same password (salted)', () => {
    expect(hashPassword('same-password')).not.toBe(hashPassword('same-password'))
  })

  it('refuses a malformed stored value rather than throwing', () => {
    expect(verifyPassword('anything', '')).toBe(false)
    expect(verifyPassword('anything', 'plaintext')).toBe(false)
    expect(verifyPassword('anything', 'scrypt:abc')).toBe(false)
  })

  it('refuses a hash of a different length', () => {
    // A truncated digest must fail cleanly; timingSafeEqual throws on a length
    // mismatch, so the guard before it matters.
    expect(verifyPassword('anything', 'scrypt:00112233:abcd')).toBe(false)
  })
})
