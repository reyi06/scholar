import { useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  DataTable,
  DefinitionList,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Textarea,
  type ButtonVariant,
  type Column,
  type SelectOption,
} from '../../components/ui'
import { applicationsApi, scholarshipsApi, studentsApi } from '../../lib/api.ts'
import { APPLICATION_STATUSES, APPLICATION_STATUS_LABELS } from '../../lib/constants.ts'
import { formatDate, formatDateTime, fullName } from '../../lib/format.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { Application, ApplicationStatus } from '../../types/index.ts'

const PAGE_SIZE = 10

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...APPLICATION_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

/**
 * The four review decisions an administrator can record.
 * `approved` is deliberately not the same as a confirmed grant — a separate
 * confirmation on the grant records screen is still required.
 */
const DECISION_ACTIONS: { status: ApplicationStatus; label: string; variant: ButtonVariant }[] = [
  { status: 'under-review', label: 'Mark under review', variant: 'outline' },
  { status: 'needs-info', label: 'Request information', variant: 'outline' },
  { status: 'approved', label: 'Approve', variant: 'primary' },
  { status: 'rejected', label: 'Reject', variant: 'danger' },
]

export function AdminApplicationsPage() {
  useDocumentTitle('Applications')
  const toast = useToast()
  const { user } = useAuth()
  const actor = user ? fullName(user.firstName, user.lastName) : 'Administrator'

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ApplicationStatus | 'all'>('all')
  const [scholarshipId, setScholarshipId] = useState('all')
  const [page, setPage] = useState(1)

  const debouncedQuery = useDebouncedValue(query, 300)

  // Lookup tables so the list can show names instead of bare identifiers.
  const scholarships = useAsync(() => scholarshipsApi.options(), [])
  const students = useAsync(() => studentsApi.list({}, 1, 200), [])

  const list = useAsync(
    () =>
      applicationsApi.list(
        { query: debouncedQuery, status, scholarshipId },
        page,
        PAGE_SIZE,
      ),
    [debouncedQuery, status, scholarshipId, page],
  )

  // Applications that passed review but have no confirmed grant record yet.
  const awaiting = useAsync(() => applicationsApi.awaitingGrantConfirmation(), [])

  const [reviewId, setReviewId] = useState<string | null>(null)
  const [decision, setDecision] = useState<ApplicationStatus | null>(null)
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState<string | null>(null)

  const review = useAsync(
    () => (reviewId ? applicationsApi.get(reviewId) : Promise.resolve(null)),
    [reviewId],
  )

  const decisionAction = useAsyncAction(
    (id: string, next: ApplicationStatus, actingName: string, decisionNote: string) =>
      applicationsApi.updateStatus(id, next, { note: decisionNote, actor: actingName }),
  )

  const scholarshipNames = new Map(
    (scholarships.data ?? []).map((option) => [option.id, option.name]),
  )
  const studentNames = new Map(
    (students.data?.items ?? []).map((record) => [
      record.user.id,
      fullName(record.user.firstName, record.user.lastName),
    ]),
  )
  const awaitingIds = new Set((awaiting.data ?? []).map((item) => item.id))

  const scholarshipOptions: SelectOption[] = [
    { value: 'all', label: 'All scholarships' },
    ...(scholarships.data ?? []).map((option) => ({ value: option.id, label: option.name })),
  ]

  const columns: Column<Application>[] = [
    {
      key: 'referenceNo',
      header: 'Reference no.',
      accessor: (row) => <span className="font-medium text-slate-900 dark:text-white">{row.referenceNo}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      accessor: (row) => studentNames.get(row.studentId) ?? 'Unknown student',
    },
    {
      key: 'scholarship',
      header: 'Scholarship',
      accessor: (row) => scholarshipNames.get(row.scholarshipId) ?? 'Removed listing',
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge kind="application" status={row.status} />,
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      accessor: (row) => formatDate(row.submittedAt),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      accessor: (row) => formatDate(row.updatedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <Button variant="outline" size="sm" onClick={() => setReviewId(row.id)}>
          Review
        </Button>
      ),
    },
  ]

  function resetDecision(): void {
    setDecision(null)
    setNote('')
    setNoteError(null)
  }

  function closeReview(): void {
    setReviewId(null)
    resetDecision()
  }

  async function handleDecision(): Promise<void> {
    if (!reviewId || !decision) return
    const trimmed = note.trim()
    if (trimmed.length < 5) {
      setNoteError('Add a short note (at least 5 characters) explaining this decision.')
      return
    }
    const result = await decisionAction.run(reviewId, decision, actor, trimmed)
    if (!result) return
    toast.success(
      `Application marked ${APPLICATION_STATUS_LABELS[decision].toLowerCase()}`,
      `Reference ${result.referenceNo} was updated.`,
    )
    resetDecision()
    list.reload()
    review.reload()
    awaiting.reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Review and decide on scholarship applications submitted through Pampanga GrantConnect."
      />

      <Alert tone="info" title="Only applications submitted through this system appear here">
        Applications handled on a provider's own website are not tracked in this system. For those
        listings we only link to the provider, so their progress never shows up in this list.
      </Alert>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchInput
            id="applications-search"
            label="Search applications"
            placeholder="Reference no., student or scholarship"
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
          />
          <Select
            id="applications-status"
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ApplicationStatus | 'all')
              setPage(1)
            }}
          />
          <Select
            id="applications-scholarship"
            label="Scholarship"
            options={scholarshipOptions}
            value={scholarshipId}
            onChange={(event) => {
              setScholarshipId(event.target.value)
              setPage(1)
            }}
          />
        </CardBody>
      </Card>

      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}

      {!list.error && list.loading && !list.data ? (
        <LoadingState label="Loading applications…" />
      ) : null}

      {!list.error && list.data ? (
        <Card>
          <DataTable
            columns={columns}
            rows={list.data.items}
            getRowId={(row) => row.id}
            loading={list.loading}
            caption="Scholarship applications"
            empty={
              <EmptyState
                icon={<Icon name="inbox" className="size-8" />}
                title="No applications match these filters"
                description="Try clearing the search box or choosing a different status or scholarship."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setStatus('all')
                      setScholarshipId('all')
                      setPage(1)
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            }
          />
          <div className="px-4 pb-4">
            <Pagination
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              pageSize={list.data.pageSize}
              onPageChange={setPage}
            />
          </div>
        </Card>
      ) : null}

      <Dialog
        open={reviewId !== null}
        onClose={closeReview}
        size="xl"
        title={
          review.data && !review.loading
            ? `Application ${review.data.referenceNo}`
            : 'Application review'
        }
        description="Review the submission, record a decision, and note anything the student should know."
        footer={
          <Button variant="outline" onClick={closeReview}>
            Close
          </Button>
        }
      >
        {review.loading ? <LoadingState label="Loading application…" /> : null}
        {review.error ? <ErrorState message={review.error} onRetry={review.reload} /> : null}

        {review.data && !review.loading ? (
          <div className="space-y-6">
            <DefinitionList
              items={[
                {
                  label: 'Student',
                  value: studentNames.get(review.data.studentId) ?? 'Unknown student',
                },
                {
                  label: 'Scholarship',
                  value: scholarshipNames.get(review.data.scholarshipId) ?? 'Removed listing',
                },
                { label: 'Status', value: <StatusBadge kind="application" status={review.data.status} /> },
                { label: 'Submitted', value: formatDateTime(review.data.submittedAt) },
                { label: 'Last updated', value: formatDateTime(review.data.updatedAt) },
                { label: 'Reviewed by', value: review.data.reviewedBy ?? 'Not yet reviewed' },
              ]}
            />

            {review.data.status === 'approved' ? (
              awaitingIds.has(review.data.id) ? (
                <Alert
                  tone="warning"
                  title="Approving does not create a grant record"
                  actions={
                    <LinkButton to="/admin/grants" size="sm" variant="outline">
                      Go to Grant Records
                    </LinkButton>
                  }
                >
                  This application is approved, but no confirmed grant exists for it yet. A grant
                  record must be confirmed separately on the Grant Records page before any funds are
                  recorded.
                </Alert>
              ) : (
                <Alert tone="success" title="Grant record already confirmed">
                  A grant record has already been confirmed for this application on the Grant Records
                  page.
                </Alert>
              )
            ) : (
              <Alert tone="warning" title="Approving does not create a grant record">
                Marking an application as approved only records the review decision. A grant record
                must be confirmed separately on the Grant Records page before any funds are released.
              </Alert>
            )}

            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Motivation</h3>
              <p className="mt-2 text-sm whitespace-pre-line text-slate-700 dark:text-slate-200">
                {review.data.motivation || 'No motivation statement was provided.'}
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Responses</h3>
              {review.data.responses.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This application did not include any additional responses.
                </p>
              ) : (
                <DefinitionList
                  className="mt-2"
                  columns={1}
                  items={review.data.responses.map((entry) => ({
                    label: entry.label,
                    value: entry.value || '—',
                  }))}
                />
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h3>
              {review.data.documentNames.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  No document names were listed with this application.
                </p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                  {review.data.documentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Timeline</h3>
              {review.data.timeline.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This application has no recorded activity yet.
                </p>
              ) : (
                <ol className="mt-2 space-y-3">
                  {review.data.timeline.map((entry, index) => (
                    <li
                      key={`${entry.status}-${entry.at}-${index}`}
                      className="flex flex-col gap-1 border-l-2 border-slate-200 pl-3 dark:border-slate-700"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge kind="application" status={entry.status} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(entry.at)}
                        </span>
                        {entry.actor ? (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            by {entry.actor}
                          </span>
                        ) : null}
                      </div>
                      {entry.note ? (
                        <p className="text-sm text-slate-700 dark:text-slate-200">{entry.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Record a decision</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Each decision needs a short note. The note is stored on the timeline and a
                notification is raised for the student in-app.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DECISION_ACTIONS.map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant}
                    size="sm"
                    onClick={() => {
                      setDecision(action.status)
                      setNoteError(null)
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={decision !== null}
        onClose={resetDecision}
        onConfirm={handleDecision}
        title="Confirm review decision"
        description={
          decision
            ? `This will mark the application as ${APPLICATION_STATUS_LABELS[decision].toLowerCase()}.`
            : undefined
        }
        confirmLabel="Apply decision"
        tone={decision === 'rejected' ? 'danger' : 'primary'}
        loading={decisionAction.loading}
      >
        <div className="space-y-3">
          <Textarea
            id="application-decision-note"
            label="Note for the decision"
            required
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
              if (noteError) setNoteError(null)
            }}
            error={noteError ?? undefined}
            hint="Recorded on the application timeline and included in the student's notification."
          />
          {decisionAction.error ? (
            <Alert tone="danger" title="We could not save this decision">
              {decisionAction.error}
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  )
}
