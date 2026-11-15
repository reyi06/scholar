import { describe, expect, it } from 'vitest'
import { buildSmsCode, normalisePhone } from '../server/sms.ts'

/**
 * Phone numbers.
 *
 * A wrong destination is a code sent to a stranger, so the boundary refuses
 * anything that is not a recognisable Philippine mobile number rather than
 * guessing at it.
 */
describe('normalisePhone', () => {
  it('accepts the local form with a leading zero', () => {
    expect(normalisePhone('0917 123 4567')).toBe('+639171234567')
    expect(normalisePhone('0917-123-4567')).toBe('+639171234567')
  })

  it('accepts the country code with or without a plus', () => {
    expect(normalisePhone('+63 917 123 4567')).toBe('+639171234567')
    expect(normalisePhone('639171234567')).toBe('+639171234567')
  })

  it('accepts a bare mobile prefix', () => {
    expect(normalisePhone('9171234567')).toBe('+639171234567')
  })

  it('rejects landlines, short numbers and junk', () => {
    expect(normalisePhone('(045) 123 4567')).toBeNull()
    expect(normalisePhone('12345')).toBeNull()
    expect(normalisePhone('0917-123')).toBeNull()
    expect(normalisePhone('not a number')).toBeNull()
    expect(normalisePhone('')).toBeNull()
  })

  it('rejects a mobile number with the wrong digit count', () => {
    expect(normalisePhone('091712345678')).toBeNull()
    expect(normalisePhone('0917123456')).toBeNull()
  })
})

describe('buildSmsCode', () => {
  it('carries the code, the purpose and the expiry in one segment', () => {
    const text = buildSmsCode({ code: '123456', purpose: 'reset-password', expiresInSeconds: 600 })
    expect(text).toContain('123456')
    expect(text).toContain('reset your password')
    expect(text).toContain('10 minutes')
    expect(text.length).toBeLessThan(160)
  })
})
