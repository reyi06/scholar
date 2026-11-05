import { describe, expect, it } from 'vitest'
import {
  applicationDecisionAllowed,
  isIsoDate,
  isPastDeadline,
  isUniqueViolation,
  registrationDecisionAllowed,
} from '../server/rules.ts'

describe('deadlines', () => {
  it('treats an earlier date as past and the same day as still open', () => {
    expect(isPastDeadline('2026-10-01', '2026-10-28')).toBe(true)
    expect(isPastDeadline('2026-10-28', '2026-10-28')).toBe(false)
    expect(isPastDeadline('2026-11-01', '2026-10-28')).toBe(false)
  })

  it('accepts real calendar dates and rejects invented ones', () => {
    expect(isIsoDate('2026-02-28')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('28-02-2026')).toBe(false)
    expect(isIsoDate('2026-2-8')).toBe(false)
  })
})

describe('application decisions', () => {
  it('allows the normal review path', () => {
    expect(applicationDecisionAllowed('submitted', 'under-review', false)).toBe(true)
    expect(applicationDecisionAllowed('under-review', 'approved', false)).toBe(true)
    expect(applicationDecisionAllowed('needs-info', 'rejected', false)).toBe(true)
  })

  it('allows a rejected application to be reopened', () => {
    expect(applicationDecisionAllowed('rejected', 'under-review', false)).toBe(true)
  })

  it('does not allow a silent re-decision to the same status', () => {
    expect(applicationDecisionAllowed('approved', 'approved', false)).toBe(false)
  })

  it('locks the decision once a grant exists', () => {
    expect(applicationDecisionAllowed('approved', 'rejected', true)).toBe(false)
    expect(applicationDecisionAllowed('under-review', 'approved', true)).toBe(false)
  })

  it('does not let a draft be decided', () => {
    expect(applicationDecisionAllowed('draft', 'approved', false)).toBe(false)
  })
})

describe('registration decisions', () => {
  it('allows pending to a decision and a rejected registration to be corrected', () => {
    expect(registrationDecisionAllowed('pending', 'verified')).toBe(true)
    expect(registrationDecisionAllowed('pending', 'rejected')).toBe(true)
    expect(registrationDecisionAllowed('rejected', 'verified')).toBe(true)
  })

  it('locks a verified registration', () => {
    expect(registrationDecisionAllowed('verified', 'rejected')).toBe(false)
    expect(registrationDecisionAllowed('verified', 'verified')).toBe(false)
  })
})

describe('unique violations', () => {
  it('recognises P2002 and can narrow to a field', () => {
    const error = { code: 'P2002', meta: { target: ['studentId', 'scholarshipId'] } }
    expect(isUniqueViolation(error)).toBe(true)
    expect(isUniqueViolation(error, 'scholarshipId')).toBe(true)
    expect(isUniqueViolation(error, 'referenceNo')).toBe(false)
    expect(isUniqueViolation({ code: 'P2025' })).toBe(false)
    expect(isUniqueViolation(new Error('nope'))).toBe(false)
  })
})
