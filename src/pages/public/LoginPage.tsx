import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  LinkButton,
} from '../../components/ui'
import { demoApi } from '../../lib/api.ts'
import { emailFormat, hasErrors, required, validateForm, type FormErrors } from '../../lib/validation.ts'
import { useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { LoginInput } from '../../types/index.ts'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState<LoginInput>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors<LoginInput>>({})

  const { run, loading, error } = useAsyncAction(login)

  // Test sign-in details, surfaced so the accounts can be filled in with one click.
  const demoAccounts = demoApi.accounts()

  // Send the user back to whatever they were trying to reach, if anything.
  const redirectTo = (location.state as { from?: string } | null)?.from

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const validationErrors = validateForm(values, {
      email: [required('Email address'), emailFormat()],
      password: [required('Password')],
    })
    setErrors(validationErrors)
    if (hasErrors(validationErrors)) return

    const user = await run(values)
    if (!user) return

    toast.success(`Welcome back, ${user.firstName}`)
    navigate(redirectTo ?? (user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'), {
      replace: true,
    })
  }

  const fillTestAccount = (account: { email: string; password: string }) => {
    setValues({ email: account.email, password: account.password })
    setErrors({})
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:py-16 lg:px-8">
      <div className="space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to your account
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Access your applications, semester registration and confirmed grant records. Administrators
            sign in here too.
          </p>
        </div>

        <Card>
          <CardHeader title="Test accounts" description="Sign in with either role to look around." />
          <CardBody className="space-y-3">
            {demoAccounts.map((account) => (
              <div
                key={account.role}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{account.label}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fillTestAccount(account)}>
                  Use this account
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Sign in" />
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error ? <Alert tone="danger" title="Could not sign you in">{error}</Alert> : null}

            <Input
              id="login-email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={values.email}
              error={errors.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={values.password}
              error={errors.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              Sign in
            </Button>

            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              No account yet?{' '}
              <Link to="/register" className="font-medium text-brand-700 dark:text-brand-300">
                Create a student account
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
