import { setTimeout as sleep } from 'node:timers/promises'

/**
 * Where outgoing messages go.
 *
 * This is a seam, not a shortcut. Delivery is a deployment decision, so the
 * rest of the server asks for a transport and never cares which one it gets.
 * Development and demonstrations use the console transport, which prints the
 * message — including a one-time code — to the server log, so the whole loop
 * is visible on one screen.
 *
 * Wiring a real email service means implementing `send` for it and setting
 * MAIL_TRANSPORT. Nothing else changes.
 *
 * `send` resolves only when a transport has actually accepted the message and
 * throws otherwise. Callers surface that failure. Nothing in this project may
 * report that an email was sent when it was not (business rule 10).
 */

export interface MailMessage {
  to: string
  subject: string
  /** Plain text. A code must survive being read off a phone screen. */
  text: string
}

/** Reported to the browser so the UI can say where the message actually went. */
export type MailDelivery = 'log' | 'email' | 'none'

export interface MailTransport {
  delivery: MailDelivery
  send(message: MailMessage): Promise<void>
}

/**
 * Print to the server log. The default, and the right choice for a
 * demonstration: the panel can watch the code appear.
 */
const consoleTransport: MailTransport = {
  delivery: 'log',
  async send(message) {
    // Deliberately loud and boxed so it is findable in a busy log.
    const rule = '─'.repeat(64)
    process.stdout.write(
      [
        '',
        rule,
        '  MESSAGE NOT SENT — console transport',
        `  To:      ${message.to}`,
        `  Subject: ${message.subject}`,
        '',
        ...message.text.split('\n').map((line) => `  ${line}`),
        rule,
        '',
      ].join('\n') + '\n',
    )
  },
}

/**
 * Configured, but with no transport wired up yet.
 *
 * Throws rather than pretending: if a deployment has mail switched on and
 * nothing to send with, that is a configuration fault and should be loud, not
 * a silent success that leaves a student waiting for a code that never comes.
 */
const unconfiguredTransport: MailTransport = {
  delivery: 'none',
  async send() {
    throw new Error(
      'No mail transport is configured. Set MAIL_TRANSPORT and the matching credentials.',
    )
  },
}

export function mailTransport(): MailTransport {
  const configured = (process.env.MAIL_TRANSPORT ?? 'console').trim().toLowerCase()
  if (configured === 'console') return consoleTransport
  return unconfiguredTransport
}

/**
 * Compose a one-time code message.
 *
 * Kept here rather than inline at the call site so the wording, the expiry and
 * the "ignore this if it was not you" line stay consistent — which is both a
 * security requirement and the thing a panel will ask about.
 */
export function buildOtpMessage(input: {
  to: string
  code: string
  purpose: 'verify-email' | 'reset-password'
  expiresInSeconds: number
  contactEmail: string
}): MailMessage {
  const minutes = Math.round(input.expiresInSeconds / 60)
  const action =
    input.purpose === 'verify-email'
      ? 'confirm your email address'
      : 'reset your password'

  return {
    to: input.to,
    subject:
      input.purpose === 'verify-email'
        ? 'Confirm your email address'
        : 'Reset your password',
    text: [
      `Use this code to ${action}:`,
      '',
      `    ${input.code}`,
      '',
      `The code expires in ${minutes} minutes and can only be used once.`,
      '',
      'If you did not request this, you can ignore this message — nothing has',
      `changed. For anything else, contact ${input.contactEmail}.`,
    ].join('\n'),
  }
}

/**
 * Small artificial pause used by the caller after a send, so response times do
 * not reveal whether an address exists.
 */
export const uniformDeliveryDelayMs = 180

export async function settleDeliveryDelay(): Promise<void> {
  await sleep(uniformDeliveryDelayMs)
}
