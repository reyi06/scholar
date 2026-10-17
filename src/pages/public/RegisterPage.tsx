import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  LinkButton,
  Select,
} from '../../components/ui'
import { MUNICIPALITIES_ONLY } from '../../lib/constants.ts'
import { DEMO_MODE } from '../../lib/api.ts'
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
  useDocumentTitle('Create a student account')
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

    toast.success(
      'Account created',
      'Complete your student profile to improve your scholarship matches.',
    )
    navigate('/student/profile', { replace: true })
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:py-16 lg:px-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create a student account
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            A student account lets you save scholarships, submit applications, file your semester
            registration as a grantee, and follow the status of your grants.
          </p>
        </div>

        <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
          {[
            'Save a shortlist of scholarships you are interested in',
            'Submit applications and track their review status',
            'File semester registration if you are an existing grantee',
            'See confirmed grant records once an administrator confirms them',
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="mt-0.5 text-brand-600 dark:text-brand-400">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {DEMO_MODE ? (
          <Alert tone="warning" title="Demonstration only">
            This form does not contact a server and no verification email is sent. The account is created
            only in this browser's storage, and the password is saved in plain text because there is no
            backend. Do not reuse a real password here.
          </Alert>
        ) : null}
      </div>

      <Card>
        <CardHeader title="Your details" description="All fields are required." />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error ? <Alert tone="danger" title="Could not create your account">{error}</Alert> : null}

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
              placeholder="name@example.com"
              hint="Used only as your sign-in name in this prototype. No email is sent."
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

            <div className="grid gap-5 sm:grid-cols-2">
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
            </div>

            <Button type="submit" loading={loading} fullWidth size="lg">
              Create account
            </Button>

            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-brand-700 dark:text-brand-300">
                Sign in
              </Link>
            </p>
          </form>
        </CardBody>
      </Card>

      <div className="lg:col-span-2">
        <LinkButton to="/" variant="ghost" size="sm">
          ← Back to home
        </LinkButton>
      </div>
    </div>
  )
}
