import { useState } from 'react'
import { Badge, Button, Textarea } from './ui'
import { SUPPORT_STATUS_LABELS } from '../lib/constants.ts'
import { SUPPORT_STATUS_TONES } from '../lib/tones.ts'
import { formatDate } from '../lib/format.ts'
import type { SupportStatus, SupportTicket } from '../types/index.ts'

interface SupportTicketThreadProps {
  ticket: SupportTicket
  /** Staff see who asked and can close or reopen. */
  staff?: boolean
  onReply: (id: string, body: string) => Promise<void>
  onStatus?: (id: string, status: SupportStatus) => Promise<void>
}

/**
 * One ticket, with its exchange. Shared by the student page and the office page
 * so a reply reads the same on both sides.
 */
export function SupportTicketThread({
  ticket,
  staff = false,
  onReply,
  onStatus,
}: SupportTicketThreadProps) {
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      setDraft('')
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="py-6 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {ticket.subject}
        </h2>
        <Badge tone={SUPPORT_STATUS_TONES[ticket.status]}>
          {SUPPORT_STATUS_LABELS[ticket.status]}
        </Badge>
      </div>

      <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">
        {ticket.reference}
        {staff ? ` · ${ticket.studentName}` : ''} · opened {formatDate(ticket.createdAt)}
      </p>

      <ol className="mt-4 space-y-4">
        {ticket.messages.map((message) => (
          <li
            key={message.id}
            className={
              message.authorRole === 'staff'
                ? 'border-l-2 border-brand-800 pl-4 dark:border-brand-300'
                : 'border-l-2 border-slate-200 pl-4 dark:border-ink-700'
            }
          >
            <p className="text-xs font-medium tracking-wide text-slate-900 uppercase dark:text-slate-100">
              {message.authorRole === 'staff' ? 'Scholarship Office' : message.authorName}
              <span className="ml-2 font-normal normal-case tracking-normal">
                {formatDate(message.createdAt)}
              </span>
            </p>
            <p className="mt-1 max-w-[70ch] text-sm leading-relaxed whitespace-pre-line text-slate-900 dark:text-slate-100">
              {message.body}
            </p>
          </li>
        ))}
      </ol>

      {ticket.status === 'closed' ? (
        <p className="mt-4 text-sm text-slate-900 dark:text-slate-100">
          This ticket is closed. Open a new one if you need more help.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <Textarea
            id={`reply-${ticket.id}`}
            label={staff ? 'Reply to the Student' : 'Add a Reply'}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          {error ? (
            <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || draft.trim().length < 2}
              onClick={() => void act(() => onReply(ticket.id, draft.trim()))}
            >
              Send Reply
            </Button>
            {staff && onStatus ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void act(() => onStatus(ticket.id, 'closed'))}
              >
                Close Ticket
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {staff && onStatus && ticket.status === 'closed' ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-4"
          disabled={busy}
          onClick={() => void act(() => onStatus(ticket.id, 'open'))}
        >
          Reopen Ticket
        </Button>
      ) : null}
    </article>
  )
}
