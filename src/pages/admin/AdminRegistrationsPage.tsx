import { useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Textarea,
  type Column,
  type SelectOption,
} from '../../components/ui'
import { registrationsApi, studentsApi } from '../../lib/api.ts'
import { ACADEMIC_YEARS, REGISTRATION_STATUSES, REGISTRATION_STATUS_LABELS, SEMESTERS } from '../../lib/constants.ts'
import { formatDate, formatNumber, fullName } from '../../lib/format.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { RegistrationStatus, SemesterRegistration } from '../../types/index.ts'

const PAGE_SIZE = 10

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  ...REGISTRATION_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

const ACADEMIC_YEAR_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Academic Years' },
  ...ACADEMIC_YEARS.map((year) => ({ value: year, label: `AY ${year}` })),
]

const SEMESTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Semesters' },
  ...SEMESTERS.map((semester) => ({ value: semester, label: semester })),
]

/**
 * Semester registrations filed by students who already hold a grant.
 * Verification and rejection both route through a confirmation dialog, and a
 * rejection requires a short reason.
 */
export function AdminRegistrationsPage() {
  useDocumentTitle('Semester Registrations')
  const toast = useToast()
  const { user } = useAuth()
  const actor = user ? fullName(user.firstName, user.lastName) : 'Administrator'

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<RegistrationStatus | 'all'>('all')
  const [academicYear, setAcademicYear] = useState('all')
  const [semester, setSemester] = useState('all')
  const [page, setPage] = useState(1)

  const debouncedQuery = useDebouncedValue(query, 300)

  const students = useAsync(() => studentsApi.list({}, 1, 200), [])

  const list = useAsync(
    () =>
      registrationsApi.list(
        { query: debouncedQuery, status, academicYear, semester },
        page,
        PAGE_SIZE,
      ),
    [debouncedQuery, status, academicYear, semester, page],
  )

  const [decision, setDecision] = useState<{ id: string; status: RegistrationStatus } | null>(null)
  const [remarks, setRemarks] = useState('')
  const [remarksError, setRemarksError] = useState<string | null>(null)

  const decisionAction = useAsyncAction(
    (id: string, next: RegistrationStatus, actingName: string, remark: string) =>
      registrationsApi.updateStatus(id, next, {
        remarks: remark.trim() ? remark.trim() : undefined,
        actor: actingName,
      }),
  )

  const studentNames = new Map(
    (students.data?.items ?? []).map((record) => [
      record.user.id,
      fullName(record.user.firstName, record.user.lastName),
    ]),
  )

  const hasFilters =
    debouncedQuery.trim() !== '' || status !== 'all' || academicYear !== 'all' || semester !== 'all'

  function clearFilters(): void {
    setQuery('')
    setStatus('all')
    setAcademicYear('all')
    setSemester('all')
    setPage(1)
  }

  const columns: Column<SemesterRegistration>[] = [
    {
      key: 'referenceNo',
      header: 'Reference no.',
      accessor: (row) => <span className="font-medium text-slate-900 dark:text-slate-100">{row.referenceNo}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      accessor: (row) => studentNames.get(row.studentId) ?? 'Unknown student',
    },
    { key: 'academicYear', header: 'Academic year', accessor: (row) => row.academicYear },
    { key: 'semester', header: 'Semester', accessor: (row) => row.semester },
    { key: 'school', header: 'School', accessor: (row) => row.school || '—' },
    {
      key: 'unitsEnrolled',
      header: 'Units',
      align: 'right',
      accessor: (row) => formatNumber(row.unitsEnrolled),
    },
    {
      key: 'gwa',
      header: 'GWA',
      align: 'right',
      accessor: (row) => (row.gwa === null ? '—' : row.gwa.toFixed(2)),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge kind="registration" status={row.status} />,
    },
    { key: 'submittedAt', header: 'Submitted', accessor: (row) => formatDate(row.submittedAt) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={row.status === 'verified'}
            onClick={() => {
              setDecision({ id: row.id, status: 'verified' })
              setRemarks('')
              setRemarksError(null)
            }}
          >
            Verify
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Reject ${row.referenceNo}`}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            disabled={row.status === 'rejected'}
            onClick={() => {
              setDecision({ id: row.id, status: 'rejected' })
              setRemarks('')
              setRemarksError(null)
            }}
          >
            <Icon name="close" className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  function closeDecision(): void {
    setDecision(null)
    setRemarks('')
    setRemarksError(null)
  }

  async function handleDecision(): Promise<void> {
    if (!decision) return
    const trimmed = remarks.trim()
    if (decision.status === 'rejected' && trimmed.length < 5) {
      setRemarksError('Add a short reason (at least 5 characters) for rejecting this registration.')
      return
    }
    const result = await decisionAction.run(decision.id, decision.status, actor, trimmed)
    if (!result) return
    toast.success(
      `Registration ${REGISTRATION_STATUS_LABELS[decision.status].toLowerCase()}`,
      `Reference ${result.referenceNo} was updated.`,
    )
    closeDecision()
    list.reload()
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Semester Registrations"
        description="Verify the semester re-registration of students who already hold a grant."
      />

      <Alert tone="info">
        Semester registration is filed by students who already have a confirmed grant, so they can keep
        receiving assistance for a new term. It is tracked separately from new scholarship applications.
      </Alert>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              id="registrations-search"
              label="Search Registrations"
              hideLabel
              placeholder="Search reference no., student or school"
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-36">
            <Select
              id="registrations-status"
              aria-label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as RegistrationStatus | 'all')
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-44">
            <Select
              id="registrations-year"
              aria-label="Academic Year"
              options={ACADEMIC_YEAR_OPTIONS}
              value={academicYear}
              onChange={(event) => {
                setAcademicYear(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-40">
            <Select
              id="registrations-semester"
              aria-label="Semester"
              options={SEMESTER_OPTIONS}
              value={semester}
              onChange={(event) => {
                setSemester(event.target.value)
                setPage(1)
              }}
            />
          </div>
          {hasFilters ? (
            <Button variant="ghost" onClick={clearFilters} className="shrink-0">
              Reset
            </Button>
          ) : null}
        </div>

        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <LoadingState label="Loading registrations…" />
        ) : list.data ? (
          <>
            {list.data.items.length === 0 ? (
              <EmptyState
                title="No Registrations Match These Filters"
                description="Try clearing the search box or choosing a different status, academic year or semester."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Reset Filters
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
                <DataTable
                  columns={columns}
                  rows={list.data.items}
                  getRowId={(row) => row.id}
                  caption="Semester registrations"
                />
              </div>
            )}
            <Pagination
              page={list.data.page}
              totalPages={list.data.totalPages}
              total={list.data.total}
              pageSize={list.data.pageSize}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={decision !== null}
        onClose={closeDecision}
        onConfirm={handleDecision}
        title={decision?.status === 'rejected' ? 'Reject registration' : 'Verify registration'}
        description={
          decision
            ? `The registration will be marked as ${REGISTRATION_STATUS_LABELS[decision.status].toLowerCase()}.`
            : undefined
        }
        confirmLabel={decision?.status === 'rejected' ? 'Reject' : 'Verify'}
        tone={decision?.status === 'rejected' ? 'danger' : 'primary'}
        loading={decisionAction.loading}
      >
        <div className="space-y-3">
          <Textarea
            id="registration-remarks"
            label={decision?.status === 'rejected' ? 'Reason for rejection' : 'Remarks (optional)'}
            required={decision?.status === 'rejected'}
            rows={3}
            value={remarks}
            onChange={(event) => {
              setRemarks(event.target.value)
              if (remarksError) setRemarksError(null)
            }}
            error={remarksError ?? undefined}
            hint="Remarks are attached to the registration and shown to the student."
          />
          {decisionAction.error ? (
            <Alert tone="danger" title="We could not save this change">
              {decisionAction.error}
            </Alert>
          ) : null}
        </div>
      </ConfirmDialog>
    </div>
  )
}
