import { useState } from 'react'
import {
  EmptyState,
  ErrorState,
  LoadingList,
  PageHeader,
  Section,
  Select,
} from '../../components/ui'
import { SupportTicketThread } from '../../components/SupportTicketThread.tsx'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import { supportApi } from '../../lib/api.ts'
import type { SupportStatus } from '../../types/index.ts'

const STATUS_OPTIONS: { value: SupportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tickets' },
  { value: 'open', label: 'Open' },
  { value: 'answered', label: 'Answered' },
  { value: 'closed', label: 'Closed' },
]

/**
 * The office side of support. Same thread component as the student page, plus
 * the two things only staff can do: answer, and close or reopen.
 */
export function AdminSupportPage() {
  useDocumentTitle('Support Tickets')
  const toast = useToast()
  const [status, setStatus] = useState<SupportStatus | 'all'>('all')

  const tickets = useAsync(() => supportApi.list(status), [status])
  const rows = tickets.data ?? []

  const reply = async (id: string, body: string) => {
    await supportApi.reply(id, body)
    tickets.reload()
  }

  const changeStatus = async (id: string, next: SupportStatus) => {
    await supportApi.setStatus(id, next)
    toast.success(next === 'closed' ? 'Ticket closed.' : 'Ticket reopened.')
    tickets.reload()
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Support Tickets"
        description="Questions students submitted from the support page, newest activity first. A reply marks the ticket answered; closing ends the conversation."
        actions={
          <Select
            id="ticket-status"
            label="Status"
            hideLabel
            value={status}
            options={STATUS_OPTIONS}
            onChange={(event) => setStatus(event.target.value as SupportStatus | 'all')}
          />
        }
      />

      <Section divider={false}>
        {tickets.loading ? <LoadingList rows={3} /> : null}
        {tickets.error ? <ErrorState message={tickets.error} onRetry={tickets.reload} /> : null}

        {!tickets.loading && !tickets.error ? (
          rows.length === 0 ? (
            <EmptyState
              title="No Tickets Here"
              description="Nothing matches this filter. Students open tickets from the support page."
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-ink-800">
              {rows.map((ticket) => (
                <li key={ticket.id}>
                  <SupportTicketThread
                    ticket={ticket}
                    staff
                    onReply={reply}
                    onStatus={changeStatus}
                  />
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Section>
    </div>
  )
}
