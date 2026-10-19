import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Input, Select } from '../../components/ui'
import { MUNICIPALITIES_ONLY } from '../../lib/constants.ts'
import {
  emailFormat,
  hasErrors,
  minLength,
  phoneFormat,
  required,
  validateForm,
  type FormErrors,
} from '../../lib/validation.ts'
import { useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'

interface RegisterFormValues {
  firstName: string
  lastName: string
  email: string
  phone: string
  municipality: string
  password: string
  confirmPassword: string
}

const MUNICIPALITY_OPTIONS = MUNICIPALITIES_ONLY.map((name) => ({ value: name, label: name }))

export function RegisterPage() {
  useDocumentTitle('Create an account')
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [values, setValues] = useState<RegisterFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    municipality: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors<RegisterFormValues>>({})

  const { run, loading, error } = useAsyncAction(async (input: RegisterFormValues) => {
    if (input.password !== input.confirmPassword) {
      throw new Error('The two passwords do not match.')
    }
    return register({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      municipality: input.municipality,
      phone: input.phone,
    })
  })

  const update = <K extends keyof RegisterFormValues>(key: K, value: RegisterFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateForm(values, {
      firstName: [required('First name'), minLength(2, 'First name')],
      lastName: [required('Last name'), minLength(2, 'Last name')],
      email: [required('Email address'), emailFormat()],
      phone: [required('Mobile number'), phoneFormat()],
      municipality: [required('Municipality')],
      password: [required('Password'), minLength(8, 'Password')],
      confirmPassword: [required('Password confirmation')],
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    const user = await run(values)
    if (!user) return

    toast.success('Account created', 'Complete your profile to improve your scholarship matches.')
    navigate('/student/profile', { replace: true })
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        Create a student account
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Save listings, submit applications and follow their progress.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            id="register-first-name"
            label="First name"
            required
            autoComplete="given-name"
            value={values.firstName}
            error={errors.firstName}
            onChange={(event) => update('firstName', event.target.value)}
          />
          <Input
            id="register-last-name"
            label="Last name"
            required
            autoComplete="family-name"
            value={values.lastName}
            error={errors.lastName}
            onChange={(event) => update('lastName', event.target.value)}
          />
        </div>

        <Input
          id="register-email"
          label="Email address"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={(event) => update('email', event.target.value)}
        />

        <Input
          id="register-phone"
          label="Mobile number"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+63 917 000 0000"
          value={values.phone}
          error={errors.phone}
          onChange={(event) => update('phone', event.target.value)}
        />

        <Select
          id="register-municipality"
          label="Municipality or city"
          required
          placeholder="Select your municipality or city"
          options={MUNICIPALITY_OPTIONS}
          value={values.municipality}
          error={errors.municipality}
          onChange={(event) => update('municipality', event.target.value)}
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
          label="Confirm password"
          type="password"
          required
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
        />

        <Button type="submit" loading={loading} fullWidth>
          Create account
        </Button>
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
