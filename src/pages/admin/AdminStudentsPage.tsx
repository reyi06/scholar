import { useState, type FormEvent } from 'react'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  DefinitionList,
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
  type Column,
  type SelectOption,
} from '../../components/ui'
import { studentsApi } from '../../lib/api.ts'
import { EDUCATION_LEVEL_LABELS, MUNICIPALITIES } from '../../lib/constants.ts'
import { formatCurrency, formatDate, formatNumber, fullName } from '../../lib/format.ts'
import {
  emailFormat,
  hasErrors,
  required,
  validateForm,
  type FormErrors,
  type Validator,
} from '../../lib/validation.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import type { StudentRecord } from '../../types/index.ts'

const PAGE_SIZE = 10

const MUNICIPALITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Municipalities' },
  ...MUNICIPALITIES.map((name) => ({ value: name, label: name })),
]

type EditValues = {
  firstName: string
  lastName: string
  email: string
}

const EDIT_SCHEMA: Partial<Record<keyof EditValues, Validator[]>> = {
  firstName: [required('First name')],
  lastName: [required('Last name')],
  email: [required('Email'), emailFormat()],
}

/**
 * Administrator student register.
 *
 * Everything here is private: it is only reachable behind the administrator
 * route guard. The register stays a scannable table; the full record opens in a
 * dialog. Account edits are validated, and deletion carries a warning because it
 * cascades to the student's applications, registrations, grants and
 * notifications.
 */
export function AdminStudentsPage() {
  useDocumentTitle('Students')
  const toast = useToast()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [municipality, setMunicipality] = useState('all')
  const [page, setPage] = useState(1)

  const [viewingId, setViewingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentRecord | null>(null)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<EditValues>({ firstName: '', lastName: '', email: '' })
  const [editErrors, setEditErrors] = useState<FormErrors<EditValues>>({})

  const { data, loading, error, reload } = useAsync(
    () => studentsApi.list({ query: debouncedQuery, municipality }, page, PAGE_SIZE),
    [debouncedQuery, municipality, page],
  )

  const detail = useAsync(
    () => (viewingId ? studentsApi.get(viewingId) : Promise.resolve(null)),
    [viewingId],
  )

  const accountAction = useAsyncAction(
    async (userId: string, patch: { firstName: string; lastName: string; email: string }) => {
      await studentsApi.updateAccount(userId, patch)
      return true
    },
  )

  const deleteAction = useAsyncAction(async (userId: string) => {
    await studentsApi.remove(userId)
    return true
  })

  const hasFilters = debouncedQuery.trim() !== '' || municipality !== 'all'
  const detailRecord = detail.data

  function clearFilters() {
    setQuery('')
    setMunicipality('all')
    setPage(1)
  }

  function closeView() {
    setViewingId(null)
  }

  function openEdit(record: StudentRecord) {
    setEditUserId(record.user.id)
    setEditValues({
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      email: record.user.email,
    })
    setEditErrors({})
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editUserId) return
    const nextErrors = validateForm(editValues, EDIT_SCHEMA)
    setEditErrors(nextErrors)
    if (hasErrors(nextErrors)) return
    const ok = await accountAction.run(editUserId, {
      firstName: editValues.firstName.trim(),
      lastName: editValues.lastName.trim(),
      email: editValues.email.trim(),
    })
    if (ok) {
      toast.success('Student account updated', 'Demo mode: this change is stored in your browser only.')
      setEditUserId(null)
      reload()
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const ok = await deleteAction.run(deleteTarget.user.id)
    if (ok) {
      toast.success(
        'Student removed',
        `${fullName(deleteTarget.user.firstName, deleteTarget.user.lastName)} and their records were deleted.`,
      )
      setDeleteTarget(null)
      reload()
    }
  }

  const columns: Column<StudentRecord>[] = [
    {
      key: 'name',
      header: 'Student',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {fullName(row.user.firstName, row.user.lastName)}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      accessor: (row) => row.user.email,
    },
    {
      key: 'studentNumber',
      header: 'Student no.',
      accessor: (row) => row.profile?.studentNumber || '—',
    },
    {
      key: 'municipality',
      header: 'Municipality',
      accessor: (row) => row.profile?.municipality || '—',
    },
    {
      key: 'school',
      header: 'School / course',
      render: (row) => (
        <div className="flex flex-col">
          <span>{row.profile?.school || '—'}</span>
          {row.profile?.course ? (
            <span className="text-xs text-slate-500 dark:text-slate-400">{row.profile.course}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'yearLevel',
      header: 'Year level',
      accessor: (row) => row.profile?.yearLevel || '—',
    },
    {
      key: 'applications',
      header: 'Applications',
      align: 'right',
      accessor: (row) => formatNumber(row.applicationCount),
    },
    {
      key: 'grants',
      header: 'Grants',
      align: 'right',
      accessor: (row) => formatNumber(row.grantCount),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="outline" size="sm" onClick={() => setViewingId(row.user.id)}>
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${fullName(row.user.firstName, row.user.lastName)}`}
            onClick={() => openEdit(row)}
          >
            <Icon name="edit" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${fullName(row.user.firstName, row.user.lastName)}`}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={() => setDeleteTarget(row)}
          >
            <Icon name="trash" className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  const detailItems = detailRecord
    ? (() => {
        const profile = detailRecord.profile
        const gwa = profile?.gwa ?? null
        const income = profile?.householdIncome ?? null
        return [
          { label: 'Full Name', value: fullName(detailRecord.user.firstName, detailRecord.user.lastName) },
          { label: 'Email', value: detailRecord.user.email },
          { label: 'Student Number', value: profile?.studentNumber || '—' },
          { label: 'Phone', value: profile?.phone || '—' },
          { label: 'Municipality', value: profile?.municipality || '—' },
          { label: 'Barangay', value: profile?.barangay || '—' },
          { label: 'Address', value: profile?.address || '—', wide: true },
          { label: 'Birth Date', value: profile?.birthDate ? formatDate(profile.birthDate) : '—' },
          {
            label: 'Education Level',
            value: profile ? EDUCATION_LEVEL_LABELS[profile.educationLevel] : '—',
          },
          { label: 'School', value: profile?.school || '—' },
          { label: 'Course', value: profile?.course || '—' },
          { label: 'Year Level', value: profile?.yearLevel || '—' },
          { label: 'General Weighted Average', value: gwa !== null ? formatNumber(gwa) : '—' },
          { label: 'Household Income', value: income !== null ? formatCurrency(income) : '—' },
          { label: 'Guardian', value: profile?.guardianName || '—' },
          { label: 'Guardian Contact', value: profile?.guardianContact || '—' },
          { label: 'Applications Submitted', value: formatNumber(detailRecord.applicationCount) },
          { label: 'Confirmed Grants', value: formatNumber(detailRecord.grantCount) },
        ]
      })()
    : []

  return (
    <div className="space-y-10">
      <PageHeader
        title="Students"
        description="Registered student accounts. This area contains private information and is never shown on public routes."
      />

      {deleteAction.error ? (
        <Alert tone="danger" title="The student could not be removed">
          {deleteAction.error}
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              id="student-search"
              label="Search Students"
              hideLabel
              placeholder="Search name, email, school or student number"
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-48">
            <Select
              id="student-municipality"
              aria-label="Municipality"
              options={MUNICIPALITY_OPTIONS}
              value={municipality}
              onChange={(event) => {
                setMunicipality(event.target.value)
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

        {loading ? (
          <LoadingState label="Loading students…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data ? (
          <>
            {data.items.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No students match your filters' : 'No students yet'}
                description={
                  hasFilters
                    ? 'Try a different search term or reset the filters to see every student.'
                    : 'Students appear here once they create an account.'
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Reset Filters
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
                <DataTable
                  columns={columns}
                  rows={data.items}
                  getRowId={(row) => row.user.id}
                  caption="Registered students"
                />
              </div>
            )}
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </div>

      <Dialog
        open={viewingId !== null}
        onClose={closeView}
        title="Student record"
        description="Private record from the administrator area."
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeView}>
              Close
            </Button>
            {detailRecord ? (
              <Button
                onClick={() => {
                  closeView()
                  openEdit(detailRecord)
                }}
              >
                Edit account
              </Button>
            ) : null}
          </>
        }
      >
        {detail.loading ? (
          <LoadingState label="Loading student record…" />
        ) : detail.error ? (
          <ErrorState message={detail.error} onRetry={detail.reload} />
        ) : detailRecord ? (
          <div className="space-y-6">
            <Alert tone="warning" title="Private student information">
              This record is only available inside the administrator area. Never expose student names,
              contact details or academic records on a public route.
            </Alert>
            <DefinitionList columns={2} items={detailItems} />
          </div>
        ) : (
          <EmptyState
            title="Record Not Available"
            description="This student may have been removed from the workspace."
          />
        )}
      </Dialog>

      <Dialog
        open={editUserId !== null}
        onClose={() => setEditUserId(null)}
        title="Edit student account"
        description="Update the account details the student uses to sign in."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditUserId(null)}
              disabled={accountAction.loading}
            >
              Cancel
            </Button>
            <Button type="submit" form="student-account-form" loading={accountAction.loading}>
              Save Changes
            </Button>
          </>
        }
      >
        <form id="student-account-form" className="space-y-4" onSubmit={handleEditSubmit} noValidate>
          {accountAction.error ? (
            <Alert tone="danger" title="We could not update this account">
              {accountAction.error}
            </Alert>
          ) : null}
          <Input
            id="student-first-name"
            label="First Name"
            required
            value={editValues.firstName}
            error={editErrors.firstName}
            onChange={(event) => setEditValues((prev) => ({ ...prev, firstName: event.target.value }))}
          />
          <Input
            id="student-last-name"
            label="Last Name"
            required
            value={editValues.lastName}
            error={editErrors.lastName}
            onChange={(event) => setEditValues((prev) => ({ ...prev, lastName: event.target.value }))}
          />
          <Input
            id="student-email"
            label="Email Address"
            type="email"
            required
            value={editValues.email}
            error={editErrors.email}
            onChange={(event) => setEditValues((prev) => ({ ...prev, email: event.target.value }))}
          />
        </form>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this student?"
        description={
          deleteTarget
            ? `Deleting ${fullName(deleteTarget.user.firstName, deleteTarget.user.lastName)} also removes their applications, semester registrations, grant records and notifications. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Student"
        tone="danger"
        loading={deleteAction.loading}
      />
    </div>
  )
}
