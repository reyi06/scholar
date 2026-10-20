import { describe, expect, it } from 'vitest'
import {
  EMPTY_STUDENT_DETAILS,
  toStudentDetailPayload,
  validateStudentDetails,
} from '../src/lib/studentDetails.ts'

/**
 * The student-details block shared by registration and the Google profile step.
 *
 * One schema for both paths is what stops a Google account and a password
 * account from ending up with differently-shaped records.
 */
describe('validateStudentDetails', () => {
  it('requires every field eligibility depends on', () => {
    const errors = validateStudentDetails(EMPTY_STUDENT_DETAILS)

    for (const field of [
      'phone',
      'municipality',
      'barangay',
      'birthDate',
      'educationLevel',
      'school',
      'course',
      'yearLevel',
    ] as const) {
      expect(errors[field], field).toBeTruthy()
    }
  })

  it('does not require a GWA, income or address', () => {
    const errors = validateStudentDetails(EMPTY_STUDENT_DETAILS)
    expect(errors.gwa).toBeUndefined()
    expect(errors.householdIncome).toBeUndefined()
    expect(errors.address).toBeUndefined()
  })

  it('accepts a complete set of details', () => {
    const errors = validateStudentDetails({
      ...EMPTY_STUDENT_DETAILS,
      phone: '09171234567',
      municipality: 'Apalit',
      barangay: 'San Juan',
      birthDate: '2004-05-12',
      educationLevel: 'college',
      school: 'Pampanga State University',
      course: 'BS Information Technology',
      yearLevel: '2nd Year',
    })

    expect(errors).toEqual({})
  })

  it('rejects a GWA outside the grading range', () => {
    const errors = validateStudentDetails({
      ...EMPTY_STUDENT_DETAILS,
      gwa: '9.00',
    })
    expect(errors.gwa).toMatch(/between 1 and 5/)
  })
})

describe('toStudentDetailPayload', () => {
  it('converts blank optional numbers to null rather than NaN', () => {
    const payload = toStudentDetailPayload(EMPTY_STUDENT_DETAILS)
    expect(payload.gwa).toBeNull()
    expect(payload.householdIncome).toBeNull()
  })

  it('parses provided numbers', () => {
    const payload = toStudentDetailPayload({
      ...EMPTY_STUDENT_DETAILS,
      gwa: '1.75',
      householdIncome: '180000',
    })
    expect(payload.gwa).toBe(1.75)
    expect(payload.householdIncome).toBe(180000)
  })

  it('trims the free-text fields', () => {
    const payload = toStudentDetailPayload({
      ...EMPTY_STUDENT_DETAILS,
      barangay: '  San Juan  ',
      school: '  Pampanga State University ',
    })
    expect(payload.barangay).toBe('San Juan')
    expect(payload.school).toBe('Pampanga State University')
  })
})
