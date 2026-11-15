import { afterEach, describe, expect, it, vi } from 'vitest'
import { mailTransport } from '../server/mailer.ts'

/**
 * The mail seam's failure behaviour.
 *
 * A transport that resolves when the provider rejected the message is worse
 * than no provider at all: the interface would tell a student a code was sent.
 * These pin both directions.
 */
function withEnv(values: Record<string, string | undefined>) {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key])
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('mailTransport', () => {
  it('uses the console transport by default', () => {
    const restore = withEnv({ MAIL_TRANSPORT: undefined })
    expect(mailTransport().delivery).toBe('log')
    restore()
  })

  it('sends through Resend when it is configured', async () => {
    const restore = withEnv({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM: 'Scholar <codes@mail.example.com>',
    })

    const fetchMock = vi.fn(async () => new Response('{"id":"abc"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const transport = mailTransport()
    expect(transport.delivery).toBe('email')

    await transport.send({ to: 'maria@example.com', subject: 'Your code', text: '123456' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body).toMatchObject({
      from: 'Scholar <codes@mail.example.com>',
      to: ['maria@example.com'],
      subject: 'Your code',
      text: '123456',
    })

    restore()
  })

  it('throws when Resend rejects the message', async () => {
    const restore = withEnv({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: 're_test_key',
      MAIL_FROM: 'Scholar <codes@mail.example.com>',
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('domain not verified', { status: 403 })))

    await expect(
      mailTransport().send({ to: 'maria@example.com', subject: 'Your code', text: '123456' }),
    ).rejects.toThrow(/403/)

    restore()
  })

  it('refuses to pretend when Resend is named but not configured', async () => {
    const restore = withEnv({
      MAIL_TRANSPORT: 'resend',
      RESEND_API_KEY: undefined,
      MAIL_FROM: undefined,
    })

    const transport = mailTransport()
    expect(transport.delivery).toBe('none')
    await expect(
      transport.send({ to: 'maria@example.com', subject: 'Your code', text: '123456' }),
    ).rejects.toThrow(/No mail transport/)

    restore()
  })
})
