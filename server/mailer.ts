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
  /**
   * Optional HTML alternative. Kept beside the text rather than instead of it:
   * a client that cannot render HTML still gets a readable message, and a
   * plain-text part is what keeps a code out of a spam filter.
   */
  html?: string
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

/**
 * Resend, over its REST API.
 *
 * Called with fetch rather than the SDK: the seam needs one POST, and a
 * dependency that exists to save three lines is a dependency to keep patched.
 * Resend answers 200 with the message id, and anything else is a failure that
 * must surface, because a request that reports success and delivers nothing is
 * the one outcome this seam exists to prevent.
 */
function resendTransport(apiKey: string, from: string): MailTransport {
  return {
    delivery: 'email',
    async send(message) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(
          `Resend rejected the message (${response.status}): ${detail.slice(0, 300)}`,
        )
      }

      // The id is the only handle for following a message in the dashboard,
      // so it goes to the log rather than being discarded.
      const accepted = (await response.json().catch(() => null)) as { id?: string } | null
      if (accepted?.id) console.log(`[mail] accepted ${accepted.id} for ${message.to}`)
    },
  }
}

export function mailTransport(): MailTransport {
  const configured = (process.env.MAIL_TRANSPORT ?? 'console').trim().toLowerCase()
  if (configured === 'console') return consoleTransport

  if (configured === 'resend') {
    const apiKey = (process.env.RESEND_API_KEY ?? '').trim()
    const from = (process.env.MAIL_FROM ?? '').trim()
    // Both are required. Falling through to the unconfigured transport keeps
    // the failure at send time, where the caller can report it.
    if (apiKey && from) return resendTransport(apiKey, from)
  }

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
  const subject =
    input.purpose === 'verify-email' ? 'Confirm your email address' : 'Reset your password'

  const text = [
    `Use this code to ${action}:`,
    '',
    `    ${input.code}`,
    '',
    `The code expires in ${minutes} minutes and can only be used once.`,
    '',
    'If you did not request this, you can ignore this message - nothing has',
    `changed. For anything else, contact ${input.contactEmail}.`,
  ].join('\n')

  return {
    to: input.to,
    subject,
    text,
    html: otpHtml({ code: input.code, action, minutes, contactEmail: input.contactEmail }),
  }
}

/**
 * The HTML alternative.
 *
 * Written as a table and inline styles on purpose: mail clients strip
 * stylesheets, and Outlook ignores most of what is left. One column, no images,
 * no web fonts, so it renders the same in Gmail, Outlook and a phone.
 */
function otpHtml(input: {
  code: string
  action: string
  minutes: number
  contactEmail: string
}): string {
  const shell = (inner: string) => `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f4f1ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ef;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e0dc;border-radius:8px;overflow:hidden;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <tr>
              <td style="background:#4a1216;padding:20px 28px;">
                <p style="margin:0;color:#e6c98a;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Province of Pampanga</p>
                <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:600;">Scholar</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${inner}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;border-top:1px solid #e5e0dc;">
                <p style="margin:0;color:#57534e;font-size:12px;line-height:18px;">
                  Scholarship information and grant records for Pampanga.<br />
                  Questions? Write to ${input.contactEmail}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  return shell(`
    <p style="margin:0 0 8px;color:#1c1917;font-size:16px;line-height:24px;">Use this code to ${input.action}:</p>
    <p style="margin:18px 0;padding:18px 0;border-top:1px solid #e5e0dc;border-bottom:1px solid #e5e0dc;text-align:center;color:#4a1216;font-size:34px;font-weight:700;letter-spacing:10px;font-family:Consolas,Menlo,monospace;">${input.code}</p>
    <p style="margin:0 0 16px;color:#1c1917;font-size:14px;line-height:22px;">The code expires in ${input.minutes} minutes and can only be used once.</p>
    <p style="margin:0;color:#57534e;font-size:13px;line-height:20px;">If you did not request this, you can ignore this message. Nothing has changed.</p>
  `)
}

/**
 * Small artificial pause used by the caller after a send, so response times do
 * not reveal whether an address exists.
 */
export const uniformDeliveryDelayMs = 180

export async function settleDeliveryDelay(): Promise<void> {
  await sleep(uniformDeliveryDelayMs)
}
