import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Input } from '../../components/ui'
import { StudentDetailsFields } from '../../components/StudentDetailsFields.tsx'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { validateStudentDetails, toStudentDetailPayload } from '../../lib/studentDetails.ts'
import { hasErrors, type FormErrors } from '../../lib/validation.ts'
import type { EducationLevel, StudentDetailsValues } from '../../types/index.ts'

/**
 * The one-time step for an account created through Google.
 *
 * Google returns a name and an email address and nothing else, while every
 * page behind the student area needs a profile — and scholarship eligibility
 * needs these details specifically. Asking once here is what makes the rest of
 * the app truthful: a student record always has a profile behind it.
 *
 * The fields are the same component registration uses, so a Google student and
 * a password student end up with an identically shaped record.
 */
export function WelcomePage() {
  useDocumentTitle('Complete Your Profile')
  const { user, completeProfile, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [details, setDetails] = useState<StudentDetailsValues>({
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
  })
  const [errors, setErrors] = useState<FormErrors<StudentDetailsValues & { firstName: string; lastName: string }>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const nameErrors: typeof errors = {}
    if (!firstName.trim()) nameErrors.firstName = 'Enter your first name.'
    if (!lastName.trim()) nameErrors.lastName = 'Enter your last name.'

    const detailErrors = validateStudentDetails(details)
    const combined = { ...detailErrors, ...nameErrors }
    setErrors(combined as typeof errors)
    if (Object.keys(combined).length > 0 && hasErrors(combined)) return

    setSaving(true)
    try {
      await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...toStudentDetailPayload(details),
        educationLevel: details.educationLevel as EducationLevel,
      })
      toast.success('Profile complete', 'You can change any of these later from My profile.')
      navigate('/student/dashboard', { replace: true })
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16 sm:py-20">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Complete Your Profile</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Google gave us your name and email address. These details are what the scholarship office
        uses to match you to listings, and they are needed before you can apply.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Input
          id="welcome-email"
          label="Email Address"
          value={user?.email ?? ''}
          readOnly
          disabled
          hint="From your Google account. Contact the office to change it."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="welcome-first-name"
            label="First Name"
            required
            autoComplete="given-name"
            value={firstName}
            error={errors.firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <Input
            id="welcome-last-name"
            label="Last Name"
            required
            autoComplete="family-name"
            value={lastName}
            error={errors.lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
        </div>

        <StudentDetailsFields
          idPrefix="welcome"
          values={details}
          errors={errors}
          onChange={(key, value) => setDetails((current) => ({ ...current, [key]: value }))}
        />

        <Button type="submit" loading={saving} fullWidth>
          {saving ? 'Saving…' : 'Finish setting up'}
        </Button>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Signed in with the wrong account?{' '}
          <button
            type="button"
            className="text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
            onClick={() => {
              void logout()
            }}
          >
            Sign out
          </button>
        </p>
      </form>
    </div>
  )
}
