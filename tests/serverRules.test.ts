import { describe, expect, it } from 'vitest'
import { nextReference } from '../server/ids.ts'
import { googleIsAuthoritative } from '../server/googleAuth.ts'
import type { GoogleIdentity } from '../server/googleAuth.ts'

/**
 * Reference numbers.
 *
 * A collision here would break the one thing the office uses to identify a
 * record, so the sequence has to be read from what already exists rather than
 * from a counter that resets with the process.
 */
describe('nextReference', () => {
  it('starts at one when nothing exists', () => {
    expect(nextReference('APP', [], 2026)).toBe('SCH-APP-2026-0001')
  })

  it('continues from the highest existing number', () => {
    expect(nextReference('APP', ['SCH-APP-2026-0001', 'SCH-APP-2026-0007'], 2026)).toBe(
      'SCH-APP-2026-0008',
    )
  })

  it('ignores numbers belonging to another kind or year', () => {
    expect(
      nextReference('GRT', ['SCH-APP-2026-0009', 'SCH-GRT-2025-0042'], 2026),
    ).toBe('SCH-GRT-2026-0001')
  })

  it('ignores a malformed entry instead of producing NaN', () => {
    expect(nextReference('APP', ['SCH-APP-2026-abc'], 2026)).toBe('SCH-APP-2026-0001')
  })
})

/**
 * Whether Google is authoritative for the address.
 *
 * The distinction decides whether an address may be trusted as proof of identity;
 * getting it wrong is how an account gets taken over.
 */
describe('googleIsAuthoritative', () => {
  const identity = (overrides: Partial<GoogleIdentity>): GoogleIdentity => ({
    sub: 'sub-1',
    email: 'someone@example.com',
    emailVerified: true,
    givenName: 'Some',
    familyName: 'One',
    hostedDomain: null,
    picture: null,
    ...overrides,
  })

  it('trusts a gmail.com address', () => {
    expect(googleIsAuthoritative(identity({ email: 'someone@gmail.com' }))).toBe(true)
  })

  it('trusts a Workspace address with a hosted domain', () => {
    expect(
      googleIsAuthoritative(identity({ email: 'staff@school.edu.ph', hostedDomain: 'school.edu.ph' })),
    ).toBe(true)
  })

  it('does not trust an arbitrary domain just because it is verified', () => {
    expect(
      googleIsAuthoritative(identity({ email: 'someone@example.com', emailVerified: true })),
    ).toBe(false)
  })

  it('does not trust an unverified account even with a hosted domain', () => {
    expect(
      googleIsAuthoritative(identity({ email: 'a@b.com', emailVerified: false, hostedDomain: 'b.com' })),
    ).toBe(false)
  })
})
