import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Checkbox, Input } from '../../components/ui'
import { StudentDetailsFields } from '../../components/StudentDetailsFields.tsx'
import {
  emailFormat,
  hasErrors,
  minLength,
  required,
  validateForm,
  type FormErrors,
} from '../../lib/validation.ts'
import {
  EMPTY_STUDENT_DETAILS,
  toStudentDetailPayload,
  validateStudentDetails,
} from '../../lib/studentDetails.ts'
import { useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { EducationLevel, StudentDetailsValues } from '../../types/index.ts'

/**
 * Registration, in two steps.
 *
 * The student details are prerequisites rather than a later profile edit: a
 * municipal scholarship needs a barangay, an age-limited one needs a birth
 * date, and a listing for college students is noise to a senior-high applicant.
 * Collected here, the account is useful from its first page.
 *
 * Split across two steps because fourteen fields in one column is the kind of
 * form people abandon — and because the first step is the only part carrying a
 * secret, so the second can be revisited and corrected freely.
 */

interface RegisterFormValues extends StudentDetailsValues {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  /** Required: the Data Privacy Act expects a notice at the point of collection. */
  acceptedPrivacy: boolean
}

const EMPTY: RegisterFormValues = {
  ...EMPTY_STUDENT_DETAILS,
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptedPrivacy: false,
}

export function RegisterPage() {
  useDocumentTitle('Create an Account')
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2>(1)
  const [values, setValues] = useState<RegisterFormValues>(EMPTY)
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({})

  const { run, loading, error } = useAsyncAction(async (input: RegisterFormValues) => {
    if (input.password !== input.confirmPassword) {
      throw new Error('The two passwords do not match.')
    }

    return register({
      email: input.email.trim(),
      password: input.password,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      ...toStudentDetailPayload(input),
      educationLevel: input.educationLevel as EducationLevel,
    })
  })

  const update = <K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const updateDetails = <K extends keyof StudentDetailsValues>(
    key: K,
    value: StudentDetailsValues[K],
  ) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  /**
   * Validate only the fields the current step shows, so a student is never told
   * about a field they have not reached yet.
   */
  function validateStep(current: 1 | 2): FormErrors<RegisterFormValues> {
    if (current === 1) {
      const found = validateForm(values, {
        firstName: [required('First name'), minLength(2, 'First name')],
        lastName: [required('Last name'), minLength(2, 'Last name')],
        email: [required('Email address'), emailFormat()],
        password: [required('Password'), minLength(8, 'Password')],
        confirmPassword: [required('Password confirmation')],
      })

      if (!values.acceptedPrivacy) {
        found.acceptedPrivacy = 'Read the privacy notice and confirm before continuing.'
      }

      return found
    }

    return validateStudentDetails(values)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateStep(step)
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    if (step === 1) {
      setStep(2)
      window.scrollTo({ top: 0 })
      return
    }

    const user = await run(values)
    if (!user) return

    toast.success(
      'Account created',
      'Confirm your email address from My profile so the office can reach you.',
    )
    navigate('/student/profile', { replace: true })
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:py-20">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Create a Student Account</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Save listings, submit applications and follow their progress.
      </p>

      <ol className="mt-8 flex items-center gap-3 text-sm">
        {[
          { step: 1 as const, label: 'Account' },
          { step: 2 as const, label: 'Student Details' },
        ].map((item, index) => (
          <li key={item.step} className="flex items-center gap-3">
            {index > 0 ? (
              <span aria-hidden="true" className="h-px w-6 bg-slate-300 dark:bg-ink-700" />
            ) : null}
            <span
              className={
                step === item.step
                  ? 'font-medium text-brand-800 dark:text-brand-300'
                  : 'text-slate-500 dark:text-slate-400'
              }
              aria-current={step === item.step ? 'step' : undefined}
            >
              {item.step}. {item.label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {step === 1 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                id="register-first-name"
                label="First Name"
                required
                autoComplete="given-name"
                value={values.firstName}
                error={errors.firstName}
                onChange={(event) => update('firstName', event.target.value)}
              />
              <Input
                id="register-last-name"
                label="Last Name"
                required
                autoComplete="family-name"
                value={values.lastName}
                error={errors.lastName}
                onChange={(event) => update('lastName', event.target.value)}
              />
            </div>

            <Input
              id="register-email"
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              hint="Used to confirm your account and to reach you about applications."
              value={values.email}
              error={errors.email}
              onChange={(event) => update('email', event.target.value)}
            />

            <Input
              id="register-password"
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              hint="At least 8 characters."
              value={values.password}
              error={errors.password}
              onChange={(event) => update('password', event.target.value)}
            />

            <Input
              id="register-confirm-password"
              label="Confirm Password"
              type="password"
              required
              autoComplete="new-password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              onChange={(event) => update('confirmPassword', event.target.value)}
            />

            {/* The notice belongs at the point of collection, not in a footer
                link the student may never open. */}
            <Checkbox
              id="register-privacy"
              label={
                <>
                  I have read the{' '}
                  <Link
                    to="/privacy"
                    className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
                  >
                    Privacy Notice
                  </Link>{' '}
                  and understand how my details and documents will be used.
                </>
              }
              checked={values.acceptedPrivacy}
              error={errors.acceptedPrivacy}
              onChange={(event) => update('acceptedPrivacy', event.target.checked)}
            />

            <Button type="submit" fullWidth>
              Continue
            </Button>
          </>
        ) : (
          <>
            <StudentDetailsFields
              idPrefix="register"
              values={values}
              errors={errors}
              onChange={updateDetails}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={loading}>
                Create Account
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStep(1)
                  setErrors({})
                }}
              >
                Back
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
