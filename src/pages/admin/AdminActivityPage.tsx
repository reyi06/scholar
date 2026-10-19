import { useState } from 'react'
import { Badge, type BadgeTone } from '../../components/ui/Badge.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { ErrorState, LoadingState } from '../../components/ui/States.tsx'
import { PageHeader } from '../../components/ui/PageHeader.tsx'
import { Section } from '../../components/ui/Section.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { auditApi } from '../../lib/api.ts'
import { formatDateTime } from '../../lib/format.ts'

/**
 * The activity trail.
 *
 * Read-only by construction: entries are appended by the server and nothing
 * here can edit or remove one. The question this page answers is the one an
 * audit asks — who opened this student's document, who released this grant —
 * and a trail that could be edited would not answer it.
 *
 * Filters match the start of the action verb, so `document.` covers every
 * document action without an enumeration that would drift as actions are added.
 */

const FAMILIES = [
  { value: 'all', label: 'All Activity' },
  { value: 'document.', label: 'Documents' },
  { value: 'application.', label: 'Applications' },
  { value: 'grant.', label: 'Grants' },
  { value: 'student.', label: 'Students' },
  { value: 'scholarship.', label: 'Listings' },
  { value: 'announcement.', label: 'Announcements' },
  { value: 'data.', label: 'Data Requests' },
]

function toneFor(action: string): BadgeTone {
  if (action.startsWith('document.')) return action.endsWith('rejected') ? 'warning' : 'info'
  if (action === 'grant.confirmed') return 'success'
  if (action.startsWith('application.')) return 'brand'
  if (action.startsWith('data.')) return 'gold'
  if (action.endsWith('deleted')) return 'danger'
  return 'neutral'
}

export function AdminActivityPage() {
  useDocumentTitle('Activity')

  const [family, setFamily] = useState('all')
  const [page, setPage] = useState(1)

  const state = useAsync(
    () =>
      auditApi.list({
        action: family === 'all' ? undefined : family,
        page,
        pageSize: 25,
      }),
    [family, page],
  )

  const entries = state.data?.items ?? []
  const totalPages = state.data?.totalPages ?? 1
  const total = state.data?.total ?? 0

  return (
    <div className="space-y-10">
      <PageHeader
        title="Activity"
        description="A record of administrative acts: documents opened, decisions taken, grants released. Entries are append-only and cannot be edited or removed here."
        actions={
          <Select
            id="activity-family"
            label="Activity"
            hideLabel
            value={family}
            options={FAMILIES}
            onChange={(event) => {
              setFamily(event.target.value)
              setPage(1)
            }}
          />
        }
      />

      <Section
        title={total === 0 ? 'Activity' : `${total} ${total === 1 ? 'Entry' : 'Entries'}`}
        description="Pinned to the newest first. A grant confirmation is the entry that matters most, because it is the act that released funds."
      >
        {state.loading ? <LoadingState label="Loading activity…" /> : null}
        {state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}

        {!state.loading && !state.error && entries.length === 0 ? (
          <EmptyState
            title="Nothing Recorded Yet"
            description="Administrative acts will appear here as they happen — opening a student's document, deciding an application, confirming a grant."
          />
        ) : null}

        {!state.loading && !state.error && entries.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-200 dark:divide-ink-800">
              {entries.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <time
                      dateTime={entry.at}
                      className="text-xs text-slate-500 dark:text-slate-400"
                    >
                      {formatDateTime(entry.at)}
                    </time>
                    <Badge tone={toneFor(entry.action)}>{entry.action}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {entry.actorName} · {entry.actorRole === 'admin' ? 'Administrator' : 'Student'}
                  </p>
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Newer
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Older
                </Button>
              </div>
            ) : null}
          </>
        ) : null}
      </Section>
    </div>
  )
}
