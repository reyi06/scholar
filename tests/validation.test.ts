import { describe, expect, it } from 'vitest'
import {
  decimalBetween,
  emailFormat,
  hasErrors,
  minLength,
  pastDate,
  phoneFormat,
  required,
  validateForm,
} from '../src/lib/validation.ts'

/**
 * Form validation.
 *
 * The messages are user-facing, so the assertions check both that a bad value is
 * rejected and that an empty optional value is not.
 */
describe('validators', () => {
  it('requires a value and names the field', () => {
    expect(required('First name')('')).toMatch(/First name is required/)
    expect(required('First name')('Maria')).toBeUndefined()
  })

  it('enforces a minimum length', () => {
    expect(minLength(8, 'Password')('short')).toMatch(/at least 8/)
    expect(minLength(8, 'Password')('longenough')).toBeUndefined()
  })

  it('accepts ordinary addresses and rejects malformed ones', () => {
    expect(emailFormat()('maria.santos@example.com')).toBeUndefined()
    expect(emailFormat()('not-an-address')).toMatch(/valid email/)
    // Empty is allowed here; `required` is what makes a field mandatory.
    expect(emailFormat()('')).toBeUndefined()
  })

  it('accepts Philippine numbers in the shapes people actually type', () => {
    expect(phoneFormat()('09171234567')).toBeUndefined()
    expect(phoneFormat()('+63 917 123 4567')).toBeUndefined()
    expect(phoneFormat()('123')).toMatch(/valid Philippine/)
  })

  it('rejects a birth date in the future and an implausible year', () => {
    expect(pastDate('Birth date')('2004-05-12')).toBeUndefined()
    expect(pastDate('Birth date')('2999-01-01')).toMatch(/future/)
    expect(pastDate('Birth date')('1800-01-01')).toMatch(/not plausible/)
  })

  it('keeps a GWA inside the Philippine range', () => {
    expect(decimalBetween(1, 5, 'GWA')('1.75')).toBeUndefined()
    expect(decimalBetween(1, 5, 'GWA')('0.5')).toMatch(/between 1 and 5/)
    expect(decimalBetween(1, 5, 'GWA')('')).toBeUndefined()
  })
})

describe('validateForm', () => {
  it('returns one message per failing field and nothing for valid ones', () => {
    const errors = validateForm(
      { email: '', password: 'short' },
      {
        email: [required('Email address'), emailFormat()],
        password: [required('Password'), minLength(8, 'Password')],
      },
    )

    expect(errors.email).toMatch(/required/)
    expect(errors.password).toMatch(/at least 8/)
    expect(hasErrors(errors)).toBe(true)
  })

  it('reports no errors for a valid form', () => {
    const errors = validateForm(
      { email: 'a@example.com', password: 'longenough' },
      { email: [emailFormat()], password: [minLength(8, 'Password')] },
    )
    expect(hasErrors(errors)).toBe(false)
  })
})
