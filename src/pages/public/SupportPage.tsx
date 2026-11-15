import { useState } from 'react'
import { Link } from 'react-router'
import { SUPPORT_CATEGORY_LABELS } from '../../lib/constants.ts'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LinkButton,
  LoadingList,
  Section,
  Select,
  Textarea,
} from '../../components/ui'
import { SupportTicketThread } from '../../components/SupportTicketThread.tsx'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAuth } from '../../context/authContext.ts'
import { settingsApi, supportApi, type SupportTicketInput } from '../../lib/api.ts'
import type { SupportCategory } from '../../types/index.ts'

const CATEGORIES: SupportCategory[] = ['account', 'application', 'documents', 'grants', 'other']

/**
 * Support.
 *
 * A ticket belongs to the account that opened it, so the answer always has
 * somewhere to arrive. Signed-out visitors get the office address and the FAQ
 * instead of a form whose reply they could never read.
 */
export function SupportPage() {
  useDocumentTitle('Support')
  const { user } = useAuth()
  const toast = useToast()

  const [category, setCategory] = useState<SupportCategory>('account')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No request until there is a session: a signed-out visit has nothing to list,
  // and the endpoint would answer 401 for the privilege.
  const tickets = useAsync(
    () => (user ? supportApi.list() : Promise.resolve([])),
    [user?.id],
  )
  const settings = useAsync(() => settingsApi.get(), [])

  const submit = async () => {
    setSending(true)
    setError(null)
    try {
      const input: SupportTicketInput = {
        category,
        subject: subject.trim(),
        body: message.trim(),
      }
      await supportApi.create(input)
      setSubject('')
      setMessage('')
      toast.success('Ticket opened. The office reply will appear here.')
      tickets.reload()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not open the ticket.')
    } finally {
      setSending(false)
    }
  }

  const reply = async (id: string, body: string) => {
    await supportApi.reply(id, body)
    tickets.reload()
  }

  return (
    <>
      <section className="bg-brand-800 dark:bg-ink-900">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
          <p className="text-xs font-medium tracking-[0.18em] text-gold-300 uppercase">Support</p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How Can We Help?
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-12">
        {!user ? (
          <Section divider={false} title="Open a Ticket">
            <div className="space-y-4 text-sm text-slate-900 dark:text-slate-100">
              <p>
                Sign in to open a ticket. Replies from the scholarship office appear on this page,
                so the answer stays with you and the office can see what you already asked.
              </p>
              {settings.data?.contactEmail ? (
                <p>
                  If you cannot sign in, write to {settings.data.contactEmail} and the office will
                  help you regain access.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <LinkButton to="/login">Sign In</LinkButton>
                <LinkButton to="/register" variant="outline">
                  Create Account
                </LinkButton>
                <LinkButton to="/faqs" variant="outline">
                  Read the FAQs
                </LinkButton>
              </div>
            </div>
          </Section>
        ) : (
          <div className="space-y-12">
            <Section divider={false} title="Open a Ticket">
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void submit()
                }}
              >
                <Select
                  id="ticket-category"
                  label="What is it about?"
                  value={category}
                  options={CATEGORIES.map((value) => ({
                    value,
                    label: SUPPORT_CATEGORY_LABELS[value],
                  }))}
                  onChange={(event) => setCategory(event.target.value as SupportCategory)}
                />

                <Input
                  id="ticket-subject"
                  label="Subject"
                  value={subject}
                  maxLength={120}
                  placeholder="Short summary of the problem"
                  onChange={(event) => setSubject(event.target.value)}
                />

                <Textarea
                  id="ticket-message"
                  label="Message"
                  rows={5}
                  maxLength={4000}
                  hint="Say what you were doing, what you expected, and what happened instead."
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />

                {error ? (
                  <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  disabled={sending || subject.trim().length < 5 || message.trim().length < 10}
                >
                  {sending ? 'Sending' : 'Open Ticket'}
                </Button>
              </form>
            </Section>

            <Section title="Your Tickets">
              {tickets.loading ? <LoadingList rows={2} /> : null}
              {tickets.error ? (
                <ErrorState message={tickets.error} onRetry={tickets.reload} />
              ) : null}

              {!tickets.loading && !tickets.error ? (
                (tickets.data ?? []).length === 0 ? (
                  <EmptyState
                    title="No Tickets Yet"
                    description="Tickets you open, and the office replies to them, will appear here."
                  />
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                    {(tickets.data ?? []).map((ticket) => (
                      <li key={ticket.id}>
                        <SupportTicketThread ticket={ticket} onReply={reply} />
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </Section>
          </div>
        )}

        <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-900 dark:border-ink-800 dark:text-slate-100">
          Most questions are answered in the{' '}
          <Link
            to="/faqs"
            className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
          >
            frequently asked questions
          </Link>
          {settings.data?.contactEmail ? `, or by writing to ${settings.data.contactEmail}` : ''}.
        </p>
      </div>
    </>
  )
}
