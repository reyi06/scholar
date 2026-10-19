import { Input } from './ui/Input.tsx'
import { Select } from './ui/Select.tsx'
import { EDUCATION_LEVELS, MUNICIPALITIES_ONLY, YEAR_LEVELS } from '../lib/constants.ts'
import type { FormErrors } from '../lib/validation.ts'
import type { StudentDetailsValues } from '../types/index.ts'

/**
 * The student details collected at sign-up.
 *
 * One component rather than two copies, because registration and the Google
 * profile step must ask for exactly the same things — a divergence there would
 * mean two students with different records depending on how they signed in.
 *
 * These are prerequisites, not profile niceties: a municipal scholarship needs
 * a barangay, an age-limited one needs a birth date, and a listing aimed at
 * college students is noise to a senior-high applicant.
 */

const MUNICIPALITY_OPTIONS = MUNICIPALITIES_ONLY.map((name) => ({ value: name, label: name }))
const YEAR_LEVEL_OPTIONS = YEAR_LEVELS.map((name) => ({ value: name, label: name }))

export interface StudentDetailsFieldsProps {
  /** Prefix for field ids, so both forms keep unique, labelled controls. */
  idPrefix: string
  values: StudentDetailsValues
  errors: FormErrors<StudentDetailsValues>
  onChange: <K extends keyof StudentDetailsValues>(
    key: K,
    value: StudentDetailsValues[K],
  ) => void
}

export function StudentDetailsFields({
  idPrefix,
  values,
  errors,
  onChange,
}: StudentDetailsFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id={id('phone')}
          label="Mobile Number"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+63 917 000 0000"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => onChange('phone', event.target.value)}
        />
        <Input
          id={id('birthDate')}
          label="Birth Date"
          type="date"
          required
          autoComplete="bday"
          value={values.birthDate}
          error={errors.birthDate}
          onChange={(event) => onChange('birthDate', event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          id={id('municipality')}
          label="Municipality or City"
          required
          placeholder="Select your municipality or city"
          options={MUNICIPALITY_OPTIONS}
          value={values.municipality}
          error={errors.municipality}
          onChange={(event) => onChange('municipality', event.target.value)}
        />
        <Input
          id={id('barangay')}
          label="Barangay"
          required
          value={values.barangay}
          error={errors.barangay}
          hint="Some listings are open only to residents of certain LGUs."
          onChange={(event) => onChange('barangay', event.target.value)}
        />
      </div>

      <Select
        id={id('educationLevel')}
        label="Education Level"
        required
        placeholder="Select your education level"
        options={EDUCATION_LEVELS}
        value={values.educationLevel}
        error={errors.educationLevel}
        onChange={(event) => onChange('educationLevel', event.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id={id('school')}
          label="School"
          required
          placeholder="Name of your school or university"
          value={values.school}
          error={errors.school}
          onChange={(event) => onChange('school', event.target.value)}
        />
        <Input
          id={id('course')}
          label="Course or Strand"
          required
          placeholder="e.g. BS Information Technology"
          value={values.course}
          error={errors.course}
          onChange={(event) => onChange('course', event.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          id={id('yearLevel')}
          label="Year Level"
          required
          placeholder="Select your year level"
          options={YEAR_LEVEL_OPTIONS}
          value={values.yearLevel}
          error={errors.yearLevel}
          onChange={(event) => onChange('yearLevel', event.target.value)}
        />
        <Input
          id={id('gwa')}
          label="General Weighted Average"
          inputMode="decimal"
          placeholder="e.g. 1.75"
          hint="Optional. Leave blank if you do not know it yet."
          value={values.gwa}
          error={errors.gwa}
          onChange={(event) => onChange('gwa', event.target.value)}
        />
      </div>

      <Input
        id={id('address')}
        label="Complete Address"
        hint="Optional. Street and house number."
        value={values.address}
        onChange={(event) => onChange('address', event.target.value)}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          id={id('householdIncome')}
          label="Annual Household Income"
          inputMode="numeric"
          placeholder="e.g. 180000"
          hint="Optional. In pesos, used to check need-based listings."
          value={values.householdIncome}
          onChange={(event) => onChange('householdIncome', event.target.value)}
        />
        <Input
          id={id('guardianName')}
          label="Guardian Name"
          hint="Optional."
          value={values.guardianName}
          onChange={(event) => onChange('guardianName', event.target.value)}
        />
      </div>

      <Input
        id={id('guardianContact')}
        label="Guardian Contact Number"
        type="tel"
        hint="Optional."
        value={values.guardianContact}
        onChange={(event) => onChange('guardianContact', event.target.value)}
      />
    </>
  )
}
