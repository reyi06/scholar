import { useEffect, useState } from 'react'
import { Badge } from './ui/Badge.tsx'
import { Button } from './ui/Button.tsx'
import { Field } from './ui/Field.tsx'
import { Input } from './ui/Input.tsx'
import { Section } from './ui/Section.tsx'
import { useAuth } from '../context/authContext.ts'
import { useToast } from '../context/toastContext.ts'
import { useAsyncAction } from '../hooks/useAsync.ts'
import { authApi } from '../lib/api.ts'

/**
 * Confirm the signed-in account's email address with a one-time code.
 *
 * Shown on the profile page. Deliberately not a gate: verification is a
 * signal, not a permission, so a student whose mail is not configured can
 * still apply. The section simply disappears once the address is confirmed.
 *
 * The wording of the "code sent" state comes from the server, which reports
 * where the message actually went — so a development server says the code is
 * in its log rather than claiming an email was delivered.
 */
export function EmailVerificationSection() {
  const { user, refresh } = useAuth()
  const toast = useToast()

  const [code, setCode] = useState('')
  const [sent, setSent] = useState<null | { delivery: 'log' | 'email' | 'none' }>(null)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Count the resend window down rather than leaving a dead button.
  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const send = useAsyncAction(async () => {
    if (!user) return null
    setError(null)
    const result = await authApi.requestCode(user.email, 'verify-email')
    setSent({ delivery: result.delivery })
    setCooldown(result.resendAfterSeconds)
    return result
  })

  const confirm = useAsyncAction(async () => {
    if (!user) return null
    setError(null)
    const updated = await authApi.verifyEmailCode(user.email, code.trim())
    if (updated) refresh()
    toast.success('Email confirmed', 'Your address is now verified.')
    setCode('')
    setSent(null)
    return updated
  })

  if (!user || user.role !== 'student') return null

  if (user.emailVerified) {
    return (
      <Section title="Email Address">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
          <Badge tone="success">Verified</Badge>
        </div>
      </Section>
    )
  }

  return (
    <Section
      title="Email Address"
      description="Confirm your address so the scholarship office can reach you about an application."
    >
      <div className="max-w-md space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">{user.email}</span>
          <Badge tone="warning">Not confirmed</Badge>
        </div>

        {sent === null ? (
          <div>
            <Button
              onClick={() => void send.run()}
              disabled={send.loading || cooldown > 0}
              variant="outline"
            >
              {send.loading
                ? 'Sending…'
                : cooldown > 0
                  ? `Send a code (${cooldown}s)`
                  : 'Send me a code'}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void confirm.run()
            }}
          >
            {/* The server says where the message went; say the same thing. */}
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {sent.delivery === 'email'
                ? 'A six-digit code is on its way. It expires in ten minutes.'
                : sent.delivery === 'log'
                  ? 'A six-digit code was generated. This server has no mail configured, so the code was printed to its log.'
                  : 'No mail transport is configured on this server, so no code could be delivered.'}
            </p>

            <Field
              htmlFor="verify-code"
              label="Six-digit Code"
              error={error ?? confirm.error ?? undefined}
            >
              <Input
                id="verify-code"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                aria-describedby="verify-code-error"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={confirm.loading || code.length !== 6}>
                {confirm.loading ? 'Checking…' : 'Confirm address'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={cooldown > 0 || send.loading}
                onClick={() => void send.run()}
              >
                {cooldown > 0 ? `Send again (${cooldown}s)` : 'Send again'}
              </Button>
            </div>
          </form>
        )}

        {send.error ? (
          <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {send.error}
          </p>
        ) : null}
      </div>
    </Section>
  )
}
