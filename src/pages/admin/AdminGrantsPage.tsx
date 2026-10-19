import { useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Textarea,
  type Column,
  type SelectOption,
} from '../../components/ui'
import {
  applicationsApi,
  grantsApi,
  scholarshipsApi,
  studentsApi,
  type GrantInput,
} from '../../lib/api.ts'
import { ACADEMIC_YEARS, GRANT_STATUSES, SEMESTERS } from '../../lib/constants.ts'
import { formatCurrency, formatDate, fullName } from '../../lib/format.ts'
import { numberBetween, oneOf, required, validateValue } from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import type { Application, Grant, GrantStatus } from '../../types/index.ts'

const PAGE_SIZE = 10

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...GRANT_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

const ACADEMIC_YEAR_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All academic years' },
  ...ACADEMIC_YEARS.map((year) => ({ value: year, label: `AY ${year}` })),
]

const SEMESTER_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All semesters' },
  ...SEMESTERS.map((semester) => ({ value: semester, label: semester })),
]

const YEAR_FORM_OPTIONS: SelectOption[] = ACADEMIC_YEARS.map((year) => ({
  value: year,
  label: `AY ${year}`,
}))

const SEMESTER_FORM_OPTIONS: SelectOption[] = SEMESTERS.map((semester) => ({
  value: semester,
  label: semester,
}))

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface GrantFormState {
  studentId: string
  scholarshipId: string
  academicYear: string
  semester: string
  amount: string
  status: GrantStatus
  releasedAt: string
  remarks: string
}

interface GrantFormErrors {
  studentId?: string
  scholarshipId?: string
  amount?: string
  academicYear?: string
  semester?: string
  releasedAt?: string
}

interface ConfirmFormState {
  amount: string
  academicYear: string
  semester: string
  remarks: string
}

interface ConfirmFormErrors {
  amount?: string
  academicYear?: string
  semester?: string
}

/**
 * Confirmed grant records.
 *
 * The awaiting-confirmation band is the point of this screen: confirming an
 * approved application here — and only here — is what turns it into a grant
 * record. Everything below it is the register of confirmed grants.
 */
export function AdminGrantsPage() {
  useDocumentTitle('Grant records')
  const toast = useToast()
  const { user } = useAuth()
  const actor = user ? fullName(user.firstName, user.lastName) : 'Administrator'

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<GrantStatus | 'all'>('all')
  const [academicYear, setAcademicYear] = useState('all')
  const [semester, setSemester] = useState('all')
  const [page, setPage] = useState(1)

  const debouncedQuery = useDebouncedValue(query, 300)

  const scholarships = useAsync(() => scholarshipsApi.options(), [])
  const students = useAsync(() => studentsApi.list({}, 1, 200), [])
  const awaiting = useAsync(() => applicationsApi.awaitingGrantConfirmation(), [])

  const list = useAsync(
    () => grantsApi.list({ query: debouncedQuery, status, academicYear, semester }, page, PAGE_SIZE),
    [debouncedQuery, status, academicYear, semester, page],
  )

  const totalReleased = useAsync(() => grantsApi.totalReleased(), [])

  const scholarshipNames = new Map(
    (scholarships.data ?? []).map((option) => [option.id, option.name]),
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

  /* ---------------- Confirm an approved application ---------------- */

  const [confirmApp, setConfirmApp] = useState<Application | null>(null)
  const [confirmForm, setConfirmForm] = useState<ConfirmFormState>({
    amount: '',
    academicYear: ACADEMIC_YEARS[1],
    semester: SEMESTERS[0],
    remarks: '',
  })
  const [confirmErrors, setConfirmErrors] = useState<ConfirmFormErrors>({})
  const [confirming, setConfirming] = useState(false)

  const confirmAction = useAsyncAction(
    (
      applicationId: string,
      options: { amount: number; academicYear: string; semester: string; remarks?: string; actor: string },
    ) => grantsApi.confirmFromApplication(applicationId, options),
  )

  function openConfirm(application: Application): void {
    setConfirmApp(application)
    setConfirmForm({
      amount: '',
      academicYear: ACADEMIC_YEARS[1],
      semester: SEMESTERS[0],
      remarks: '',
    })
    setConfirmErrors({})
    setConfirming(false)
  }

  function closeConfirm(): void {
    setConfirmApp(null)
    setConfirming(false)
    setConfirmErrors({})
  }

  function validateConfirm(): ConfirmFormErrors {
    const errors: ConfirmFormErrors = {}
    const amountError = validateValue(confirmForm.amount, [
      required('Amount'),
      numberBetween(1, 5_000_000, 'Amount'),
    ])
    if (amountError) errors.amount = amountError
    const yearError = validateValue(confirmForm.academicYear, [
      required('Academic year'),
      oneOf(ACADEMIC_YEARS, 'Academic year'),
    ])
    if (yearError) errors.academicYear = yearError
    const semesterError = validateValue(confirmForm.semester, [
      required('Semester'),
      oneOf(SEMESTERS, 'Semester'),
    ])
    if (semesterError) errors.semester = semesterError
    return errors
  }

  function requestConfirm(): void {
    const errors = validateConfirm()
    setConfirmErrors(errors)
    if (Object.keys(errors).length > 0) return
    setConfirming(true)
  }

  async function handleConfirmGrant(): Promise<void> {
    if (!confirmApp) return
    const result = await confirmAction.run(confirmApp.id, {
      amount: Number(confirmForm.amount),
      academicYear: confirmForm.academicYear,
      semester: confirmForm.semester,
      remarks: confirmForm.remarks.trim() ? confirmForm.remarks.trim() : undefined,
      actor,
    })
    if (!result) return
    toast.success(
      'Grant record confirmed',
      `Reference ${result.referenceNo} created for ${result.semester}, AY ${result.academicYear}.`,
    )
    closeConfirm()
    list.reload()
    awaiting.reload()
    totalReleased.reload()
  }

  /* ---------------- Manual create / edit ---------------- */

  const [creating, setCreating] = useState(false)
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null)
  const [grantForm, setGrantForm] = useState<GrantFormState>({
    studentId: '',
    scholarshipId: '',
    academicYear: ACADEMIC_YEARS[1],
    semester: SEMESTERS[0],
    amount: '',
    status: 'active',
    releasedAt: todayIso(),
    remarks: '',
  })
  const [grantErrors, setGrantErrors] = useState<GrantFormErrors>({})

  const saveAction = useAsyncAction((id: string | null, input: GrantInput) =>
    id ? grantsApi.update(id, input) : grantsApi.create(input, actor),
  )

  const grantDialogOpen = creating || editingGrant !== null

  function openCreate(): void {
    setCreating(true)
    setEditingGrant(null)
    setGrantForm({
      studentId: '',
      scholarshipId: '',
      academicYear: ACADEMIC_YEARS[1],
      semester: SEMESTERS[0],
      amount: '',
      status: 'active',
      releasedAt: todayIso(),
      remarks: '',
    })
    setGrantErrors({})
  }

  function openEdit(grant: Grant): void {
    setCreating(false)
    setEditingGrant(grant)
    setGrantForm({
      studentId: grant.studentId,
      scholarshipId: grant.scholarshipId,
      academicYear: grant.academicYear,
      semester: grant.semester,
      amount: String(grant.amount),
      status: grant.status,
      releasedAt: grant.releasedAt.slice(0, 10),
      remarks: grant.remarks ?? '',
    })
    setGrantErrors({})
  }

  function closeGrantDialog(): void {
    setCreating(false)
    setEditingGrant(null)
  }

  function validateGrant(): GrantFormErrors {
    const errors: GrantFormErrors = {}
    const studentError = validateValue(grantForm.studentId, [required('Student')])
    if (studentError) errors.studentId = studentError
    const scholarshipError = validateValue(grantForm.scholarshipId, [required('Scholarship')])
    if (scholarshipError) errors.scholarshipId = scholarshipError
    const amountError = validateValue(grantForm.amount, [
      required('Amount'),
      numberBetween(1, 5_000_000, 'Amount'),
    ])
    if (amountError) errors.amount = amountError
    const yearError = validateValue(grantForm.academicYear, [
      required('Academic year'),
      oneOf(ACADEMIC_YEARS, 'Academic year'),
    ])
    if (yearError) errors.academicYear = yearError
    const semesterError = validateValue(grantForm.semester, [
      required('Semester'),
      oneOf(SEMESTERS, 'Semester'),
    ])
    if (semesterError) errors.semester = semesterError
    const releasedError = validateValue(grantForm.releasedAt, [required('Released date')])
    if (releasedError) errors.releasedAt = releasedError
    return errors
  }

  async function handleSaveGrant(): Promise<void> {
    const errors = validateGrant()
    setGrantErrors(errors)
    if (Object.keys(errors).length > 0) return

    const input: GrantInput = {
      studentId: grantForm.studentId,
      scholarshipId: grantForm.scholarshipId,
      academicYear: grantForm.academicYear,
      semester: grantForm.semester,
      amount: Number(grantForm.amount),
      status: grantForm.status,
      releasedAt: grantForm.releasedAt,
      remarks: grantForm.remarks.trim() ? grantForm.remarks.trim() : undefined,
    }

    const result = await saveAction.run(editingGrant ? editingGrant.id : null, input)
    if (!result) return
    toast.success(
      editingGrant ? 'Grant record updated' : 'Grant record created',
      `Reference ${result.referenceNo}.`,
    )
    closeGrantDialog()
    list.reload()
    totalReleased.reload()
  }

  /* ---------------- Delete ---------------- */

  const [deletingGrant, setDeletingGrant] = useState<Grant | null>(null)
  const deleteAction = useAsyncAction(async (id: string) => {
    await grantsApi.remove(id)
    return true
  })

  async function handleDelete(): Promise<void> {
    if (!deletingGrant) return
    const result = await deleteAction.run(deletingGrant.id)
    if (!result) return
    toast.success('Grant record deleted', `Reference ${deletingGrant.referenceNo} was removed.`)
    setDeletingGrant(null)
    list.reload()
    awaiting.reload()
    totalReleased.reload()
  }

  /* ---------------- Table ---------------- */

  const columns: Column<Grant>[] = [
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
    {
      key: 'scholarship',
      header: 'Scholarship',
      accessor: (row) => scholarshipNames.get(row.scholarshipId) ?? 'Removed listing',
    },
    { key: 'academicYear', header: 'Academic year', accessor: (row) => row.academicYear },
    { key: 'semester', header: 'Semester', accessor: (row) => row.semester },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => <span className="tabular-nums">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (row) => <StatusBadge kind="grant" status={row.status} />,
    },
    { key: 'releasedAt', header: 'Released', accessor: (row) => formatDate(row.releasedAt) },
    { key: 'confirmedBy', header: 'Confirmed by', accessor: (row) => row.confirmedBy },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${row.referenceNo}`}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={() => setDeletingGrant(row)}
          >
            <Icon name="trash" className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  const awaitingList = awaiting.data ?? []

  return (
    <div className="space-y-10">
      <PageHeader
        title="Grant records"
        description="Confirm approved applications into grant records and manage every released grant."
      />

      <section className="rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Awaiting grant confirmation
            {awaiting.data !== null ? (
              <span className="ml-1.5 font-normal text-slate-500 dark:text-slate-400">
                ({awaitingList.length})
              </span>
            ) : null}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Confirmed here — and only here — an approved application becomes a grant record.
          </p>
        </div>

        {awaiting.error ? (
          <div className="p-5">
            <ErrorState message={awaiting.error} onRetry={awaiting.reload} />
          </div>
        ) : awaiting.loading && awaiting.data === null ? (
          <div className="p-5">
            <LoadingState label="Loading pending applications…" />
          </div>
        ) : awaitingList.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
            No approved applications are waiting. Every approval already has a confirmed grant record.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-ink-800">
            {awaitingList.map((application) => (
              <li
                key={application.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {studentNames.get(application.studentId) ?? 'Unknown student'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {scholarshipNames.get(application.scholarshipId) ?? 'Removed listing'} ·{' '}
                    {application.referenceNo} · submitted {formatDate(application.submittedAt)}
                  </p>
                </div>
                <Button size="sm" onClick={() => openConfirm(application)}>
                  Confirm grant
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Total released across all confirmed grants:{' '}
        <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
          {totalReleased.data === null ? '—' : formatCurrency(totalReleased.data)}
        </span>
      </p>

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              id="grants-search"
              label="Search grants"
              hideLabel
              placeholder="Search reference no., student or scholarship"
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-36">
            <Select
              id="grants-status"
              aria-label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as GrantStatus | 'all')
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-44">
            <Select
              id="grants-year"
              aria-label="Academic year"
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
              id="grants-semester"
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
          <Button
            variant="outline"
            leadingIcon={<Icon name="plus" className="size-4" />}
            onClick={openCreate}
            className="shrink-0"
          >
            Add grant record
          </Button>
        </div>

        {list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : list.loading && !list.data ? (
          <LoadingState label="Loading grant records…" />
        ) : list.data ? (
          <>
            {list.data.items.length === 0 ? (
              <EmptyState
                title="No grant records match these filters"
                description="Try resetting the filters, or confirm an approved application from the panel above."
                action={
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Reset filters
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
                <DataTable
                  columns={columns}
                  rows={list.data.items}
                  getRowId={(row) => row.id}
                  caption="Grant records"
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

      {/* ---------------- Confirm grant dialog ---------------- */}
      <Dialog
        open={confirmApp !== null}
        onClose={closeConfirm}
        size="lg"
        title={confirmApp ? `Confirm grant for ${confirmApp.referenceNo}` : 'Confirm grant'}
        description="Record the amount and term for this approved application. This creates the grant record."
        footer={
          <>
            <Button variant="outline" onClick={closeConfirm} disabled={confirmAction.loading}>
              Cancel
            </Button>
            <Button onClick={requestConfirm} loading={confirmAction.loading}>
              Confirm grant
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert tone="warning" title="This is the only path that creates a confirmed grant">
            Confirming here turns an approved application into a real grant record. Approving an
            application on the Applications page never does this on its own.
          </Alert>

          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Student</dt>
              <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                {confirmApp ? studentNames.get(confirmApp.studentId) ?? 'Unknown student' : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Scholarship</dt>
              <dd className="mt-1 text-sm text-slate-800 dark:text-slate-200">
                {confirmApp ? scholarshipNames.get(confirmApp.scholarshipId) ?? 'Removed listing' : '—'}
              </dd>
            </div>
          </dl>

          <Input
            id="confirm-amount"
            label="Amount (PHP)"
            type="number"
            min={1}
            step={100}
            required
            value={confirmForm.amount}
            onChange={(event) => setConfirmForm({ ...confirmForm, amount: event.target.value })}
            error={confirmErrors.amount}
            hint="The amount released for this grant."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="confirm-year"
              label="Academic year"
              options={YEAR_FORM_OPTIONS}
              value={confirmForm.academicYear}
              onChange={(event) => setConfirmForm({ ...confirmForm, academicYear: event.target.value })}
              error={confirmErrors.academicYear}
            />
            <Select
              id="confirm-semester"
              label="Semester"
              options={SEMESTER_FORM_OPTIONS}
              value={confirmForm.semester}
              onChange={(event) => setConfirmForm({ ...confirmForm, semester: event.target.value })}
              error={confirmErrors.semester}
            />
          </div>

          <Textarea
            id="confirm-remarks"
            label="Remarks (optional)"
            rows={3}
            value={confirmForm.remarks}
            onChange={(event) => setConfirmForm({ ...confirmForm, remarks: event.target.value })}
          />

          {confirmAction.error ? (
            <Alert tone="danger" title="We could not confirm this grant">
              {confirmAction.error}
            </Alert>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirmGrant}
        title="Confirm grant record"
        confirmLabel="Yes, confirm grant"
        loading={confirmAction.loading}
        description={
          confirmApp
            ? `A grant of ${formatCurrency(Number(confirmForm.amount))} will be recorded for ${confirmForm.semester}, AY ${confirmForm.academicYear}. This cannot be undone from here without deleting the record.`
            : undefined
        }
      />

      {/* ---------------- Create / edit dialog ---------------- */}
      <Dialog
        open={grantDialogOpen}
        onClose={closeGrantDialog}
        size="lg"
        title={editingGrant ? `Edit grant ${editingGrant.referenceNo}` : 'Add grant record'}
        description="Create or adjust a grant record. Manual records are not linked to an application."
        footer={
          <>
            <Button variant="outline" onClick={closeGrantDialog} disabled={saveAction.loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveGrant} loading={saveAction.loading}>
              {editingGrant ? 'Save changes' : 'Create grant record'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            id="grant-student"
            label="Student"
            required
            placeholder="Select a student"
            options={(students.data?.items ?? []).map((record) => ({
              value: record.user.id,
              label: fullName(record.user.firstName, record.user.lastName),
            }))}
            value={grantForm.studentId}
            onChange={(event) => setGrantForm({ ...grantForm, studentId: event.target.value })}
            error={grantErrors.studentId}
          />
          <Select
            id="grant-scholarship"
            label="Scholarship"
            required
            placeholder="Select a scholarship"
            options={(scholarships.data ?? []).map((option) => ({
              value: option.id,
              label: option.name,
            }))}
            value={grantForm.scholarshipId}
            onChange={(event) => setGrantForm({ ...grantForm, scholarshipId: event.target.value })}
            error={grantErrors.scholarshipId}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="grant-amount"
              label="Amount (PHP)"
              type="number"
              min={1}
              step={100}
              required
              value={grantForm.amount}
              onChange={(event) => setGrantForm({ ...grantForm, amount: event.target.value })}
              error={grantErrors.amount}
            />
            <Select
              id="grant-status"
              label="Status"
              options={GRANT_STATUSES.map((option) => ({ value: option.value, label: option.label }))}
              value={grantForm.status}
              onChange={(event) =>
                setGrantForm({ ...grantForm, status: event.target.value as GrantStatus })
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              id="grant-year"
              label="Academic year"
              options={YEAR_FORM_OPTIONS}
              value={grantForm.academicYear}
              onChange={(event) => setGrantForm({ ...grantForm, academicYear: event.target.value })}
              error={grantErrors.academicYear}
            />
            <Select
              id="grant-semester"
              label="Semester"
              options={SEMESTER_FORM_OPTIONS}
              value={grantForm.semester}
              onChange={(event) => setGrantForm({ ...grantForm, semester: event.target.value })}
              error={grantErrors.semester}
            />
            <Input
              id="grant-released"
              label="Released date"
              type="date"
              required
              value={grantForm.releasedAt}
              onChange={(event) => setGrantForm({ ...grantForm, releasedAt: event.target.value })}
              error={grantErrors.releasedAt}
            />
          </div>

          <Textarea
            id="grant-remarks"
            label="Remarks (optional)"
            rows={3}
            value={grantForm.remarks}
            onChange={(event) => setGrantForm({ ...grantForm, remarks: event.target.value })}
          />

          {saveAction.error ? (
            <Alert tone="danger" title="We could not save this grant record">
              {saveAction.error}
            </Alert>
          ) : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={deletingGrant !== null}
        onClose={() => setDeletingGrant(null)}
        onConfirm={handleDelete}
        title="Delete grant record"
        confirmLabel="Delete record"
        tone="danger"
        loading={deleteAction.loading}
        description={
          deletingGrant
            ? `Reference ${deletingGrant.referenceNo} will be permanently removed. This cannot be undone.`
            : undefined
        }
      />
    </div>
  )
}
