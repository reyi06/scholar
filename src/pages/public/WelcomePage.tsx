import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Input, Select } from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { MUNICIPALITIES_ONLY } from '../../lib/constants.ts'
import type { CompleteProfileInput } from '../../types/index.ts'

/**
 * The one-time step for an account created through Google.
 *
 * Google returns a name and an email address and nothing else, while every
 * page behind the student area needs a municipality, a contact number and
 * eventually a school. Asking once here is what makes the rest of the app
 * truthful: a student record always has a profile behind it.
 *
 * Reached only while `profileComplete` is false; the route guard sends the
 * student here and releases them when this succeeds.
 */
export function WelcomePage() {
  useDocumentTitle('Complete your profile')
  const { user, completeProfile, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [values, setValues] = useState<CompleteProfileInput>({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    municipality: '',
    phone: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError('Enter your first and last name.')
      return
    }
    if (!values.municipality) {
      setError('Choose the municipality you live in.')
      return
    }

    setSaving(true)
    try {
      await completeProfile(values)
      toast.success('Profile complete', 'You can add your school and course from My profile.')
      navigate('/student/dashboard', { replace: true })
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Complete your profile
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Google gave us your name and email address. These extra details are what the scholarship
        office uses to match you to listings.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Input
          id="welcome-email"
          label="Email address"
          value={user?.email ?? ''}
          readOnly
          disabled
          hint="From your Google account. Contact the office to change it."
        />

        <Input
          id="welcome-first-name"
          label="First name"
          required
          autoComplete="given-name"
          value={values.firstName}
          onChange={(event) => setValues({ ...values, firstName: event.target.value })}
        />

        <Input
          id="welcome-last-name"
          label="Last name"
          required
          autoComplete="family-name"
          value={values.lastName}
          onChange={(event) => setValues({ ...values, lastName: event.target.value })}
        />

        <Select
          id="welcome-municipality"
          label="Municipality or city"
          required
          placeholder="Select where you live"
          options={MUNICIPALITIES_ONLY.map((name) => ({ value: name, label: name }))}
          value={values.municipality}
          onChange={(event) => setValues({ ...values, municipality: event.target.value })}
        />

        <Input
          id="welcome-phone"
          label="Contact number"
          type="tel"
          autoComplete="tel"
          placeholder="09XX XXX XXXX"
          hint="Optional. Used only for scholarship correspondence."
          value={values.phone}
          onChange={(event) => setValues({ ...values, phone: event.target.value })}
        />

        <Button type="submit" disabled={saving} className="w-full">
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
