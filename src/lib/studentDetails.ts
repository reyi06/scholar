import {
  decimalBetween,
  hasErrors,
  minLength,
  pastDate,
  phoneFormat,
  required,
  validateForm,
  type FormErrors,
} from './validation.ts'
import type { StudentDetailsValues } from '../types/index.ts'

/**
 * The student-details shared by every sign-up path.
 *
 * Validation lives here rather than in either form so registration and the
 * Google profile step cannot accept different things — a divergence would mean
 * two students with differently-shaped records depending on how they signed in.
 */

export const EMPTY_STUDENT_DETAILS: StudentDetailsValues = {
  phone: '',
  municipality: '',
  barangay: '',
  birthDate: '',
  educationLevel: '',
  school: '',
  course: '',
  yearLevel: '',
  address: '',
  gwa: '',
  householdIncome: '',
  guardianName: '',
  guardianContact: '',
}

/**
 * Rules for the required details.
 *
 * Deliberately absent: address, GWA, household income and the guardian fields.
 * They are real eligibility inputs, but a first-year student has no GWA yet
 * and not everyone knows the household figure — making them mandatory would
 * block sign-up over information the student cannot supply. They are asked
 * for, marked optional, and can be added later from the profile.
 */
export function validateStudentDetails(
  values: StudentDetailsValues,
): FormErrors<StudentDetailsValues> {
  return validateForm(values, {
    phone: [required('Mobile number'), phoneFormat()],
    municipality: [required('Municipality')],
    barangay: [required('Barangay'), minLength(2, 'Barangay')],
    birthDate: [required('Birth date'), pastDate('Birth date')],
    educationLevel: [required('Education level')],
    school: [required('School'), minLength(2, 'School')],
    course: [required('Course or strand'), minLength(2, 'Course or strand')],
    yearLevel: [required('Year level')],
    gwa: [decimalBetween(1, 5, 'GWA')],
  })
}

export function hasStudentDetailErrors(values: StudentDetailsValues): boolean {
  return hasErrors(validateStudentDetails(values))
}

/** `null` rather than `NaN` for the optional numeric fields, which the API expects. */
function optionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Shape the details for the API. Form controls produce strings; the domain
 * wants a number for GWA and income and `null` when unknown.
 */
export function toStudentDetailPayload(values: StudentDetailsValues) {
  return {
    phone: values.phone.trim(),
    municipality: values.municipality,
    barangay: values.barangay.trim(),
    birthDate: values.birthDate,
    educationLevel: values.educationLevel,
    school: values.school.trim(),
    course: values.course.trim(),
    yearLevel: values.yearLevel,
    address: values.address.trim(),
    gwa: optionalNumber(values.gwa),
    householdIncome: optionalNumber(values.householdIncome),
    guardianName: values.guardianName.trim(),
    guardianContact: values.guardianContact.trim(),
  }
}
