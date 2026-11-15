/**
 * Short message service seam.
 *
 * The same shape as `mailer.ts`, for the same reason: delivery is a deployment
 * decision, so the server asks for a transport and never cares which one it
 * gets. The console transport is the default and prints the message, code
 * included, to the server log, which is how the loop is demonstrated.
 *
 * Wiring a real provider means implementing `send` for it and setting
 * `SMS_TRANSPORT`. Nothing else changes. The provider is deliberately not
 * hard-coded here: Philippine gateways differ in payload shape, and guessing
 * one would be a stub that has never spoken to the real API.
 *
 * `send` resolves only when a transport has accepted the message and throws
 * otherwise. Nothing may report that a text was sent when it was not.
 */

export interface SmsMessage {
  /** Destination in E.164 form, e.g. `+639171234567`. */
  to: string
  /** Short, plain text. One segment is the target; long messages cost more. */
  text: string
}

/** Reported to the browser so the UI can say where the message actually went. */
export type SmsDelivery = 'log' | 'sms' | 'none'

export interface SmsTransport {
  delivery: SmsDelivery
  send(message: SmsMessage): Promise<void>
}

const consoleTransport: SmsTransport = {
  delivery: 'log',
  async send(message) {
    const rule = '='.repeat(64)
    process.stdout.write(
      [
        '',
        rule,
        '  TEXT NOT SENT - console transport',
        `  To:   ${message.to}`,
        '',
        ...message.text.split('\n').map((line) => `  ${line}`),
        rule,
        '',
      ].join('\n') + '\n',
    )
  },
}

/**
 * Configured but not wired up. Throws rather than pretending: a deployment that
 * asked for SMS and has no provider is a configuration fault, not a silent
 * success that leaves a student waiting for a code.
 */
const unconfiguredTransport: SmsTransport = {
  delivery: 'none',
  async send() {
    throw new Error(
      'No SMS transport is configured. Set SMS_TRANSPORT and the matching credentials.',
    )
  },
}

export function smsTransport(): SmsTransport {
  const configured = (process.env.SMS_TRANSPORT ?? 'console').trim().toLowerCase()
  if (configured === 'console') return consoleTransport
  return unconfiguredTransport
}

/**
 * Normalise a Philippine mobile number to E.164.
 *
 * Accepts the shapes people actually type: `0917 123 4567`, `0917-123-4567`,
 * `+63 917 123 4567`, `639171234567`, and with or without the leading zero.
 * Returns null rather than guessing when the digits do not fit, so a bad number
 * is refused at the boundary instead of being sent into a provider.
 */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s()\-.]/g, '')

  const match = /^(?:\+?63|0)?(9\d{9})$/.exec(digits)
  if (!match) return null

  return `+63${match[1]}`
}

/**
 * Compose a one-time code text.
 *
 * Shorter than the email version on purpose: a text is read on a lock screen
 * and billed by the segment. It carries the code, what it is for, and how long
 * it lasts, and nothing else.
 */
export function buildSmsCode(input: {
  code: string
  purpose: 'verify-email' | 'reset-password'
  expiresInSeconds: number
}): string {
  const minutes = Math.round(input.expiresInSeconds / 60)
  const action = input.purpose === 'reset-password' ? 'reset your password' : 'confirm your number'

  return `Scholar: ${input.code} is your code to ${action}. It expires in ${minutes} minutes. Do not share it.`
}
