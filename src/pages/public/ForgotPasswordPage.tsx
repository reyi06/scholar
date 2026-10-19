import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Field, Input } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAsyncAction } from '../../hooks/useAsync.ts'
import { authApi } from '../../lib/api.ts'
import { useToast } from '../../context/toastContext.ts'

/**
 * Password reset, in two steps.
 *
 * The code and the new password are submitted together, so a verified code is
 * never left sitting in the page as a bearer token for a later request. The
 * server consumes it and sets the password in one transaction of intent.
 *
 * Step one answers identically whether or not the address exists — the same
 * rule as the OTP endpoint — so this page cannot be used to discover which
 * students are registered.
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Reset Your Password')
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState<null | { delivery: 'log' | 'email' | 'none' }>(null)
  const [cooldown, setCooldown] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const request = useAsyncAction(async () => {
    const result = await authApi.requestCode(email.trim(), 'reset-password')
    setSent({ delivery: result.delivery })
    setCooldown(result.resendAfterSeconds)
    return result
  })

  const reset = useAsyncAction(async () => {
    await authApi.resetPassword({ email: email.trim(), code: code.trim(), password })
    setDone(true)
    toast.success('Password changed', 'Sign in with your new password.')
    return true
  })

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Password Changed</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Every device signed in to this account has been signed out. Use your new password to sign
          in.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
        >
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Reset Your Password</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        We will send a six-digit code to your email address.
      </p>

      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (sent === null) void request.run()
          else void reset.run()
        }}
      >
        {request.error ? <Alert tone="danger">{request.error}</Alert> : null}
        {reset.error ? <Alert tone="danger">{reset.error}</Alert> : null}

        <Field htmlFor="reset-email" label="Email Address">
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent !== null}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>

        {sent === null ? null : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {sent.delivery === 'email'
                ? 'If that address has an account, a code is on its way. It expires in ten minutes.'
                : sent.delivery === 'log'
                  ? 'A code was generated for the account, if one exists. This server has no mail configured, so the code was printed to its log.'
                  : 'No mail transport is configured on this server, so no code could be delivered.'}
            </p>

            <Field
              htmlFor="reset-code"
              label="Six-digit Code"
              hint="Codes expire after ten minutes and can only be used once."
            >
              <Input
                id="reset-code"
                value={code}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              />
            </Field>

            <Field
              htmlFor="reset-password"
              label="New Password"
              hint="At least 8 characters."
            >
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          </>
        )}

        <Button
          type="submit"
          fullWidth
          loading={request.loading || reset.loading}
          disabled={
            sent === null
              ? email.trim().length === 0
              : code.length !== 6 || password.length < 8
          }
        >
          {sent === null ? 'Send me a code' : 'Set new password'}
        </Button>

        {sent !== null && cooldown > 0 ? (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            You can request another code in {cooldown}s.
          </p>
        ) : null}
      </form>

      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        Remembered it?{' '}
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
