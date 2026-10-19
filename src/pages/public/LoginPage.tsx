import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Alert, Button, Input } from '../../components/ui'
import { GoogleSignInButton } from '../../components/GoogleSignInButton.tsx'
import { demoApi } from '../../lib/api.ts'
import { emailFormat, hasErrors, required, validateForm, type FormErrors } from '../../lib/validation.ts'
import { useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { LoginInput } from '../../types/index.ts'

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { login, googleEnabled } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [values, setValues] = useState<LoginInput>({ email: '', password: '' })
  const [errors, setErrors] = useState<FormErrors<LoginInput>>({})

  const { run, loading, error } = useAsyncAction(login)

  const testAccounts = demoApi.accounts()
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
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign In</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Access your applications, semester registration and grants.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <Input
          id="login-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          required
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

        <Button type="submit" loading={loading} fullWidth>
          Sign In
        </Button>
      </form>

      {/* Google sign-in is offered only when the API reports a client id, so a
          deployment without one never shows a control that cannot work. */}
      {googleEnabled ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200 dark:bg-ink-800" />
            <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-ink-800" />
          </div>
          <GoogleSignInButton
            onError={(message) => {
              toast.error('Google sign-in failed', message)
            }}
          />
        </>
      ) : null}

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        No account yet?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
        >
          Create a student account
        </Link>
      </p>

      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          to="/forgot-password"
          className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
        >
          Forgot your password?
        </Link>
      </p>

      <div className="mt-10 border-t border-slate-200 pt-5 dark:border-ink-800">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Test accounts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {testAccounts.map((account) => (
            <Button
              key={account.role}
              variant="outline"
              size="sm"
              onClick={() => fillTestAccount(account)}
            >
              {account.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
