import { useState } from 'react'
import {
  Alert,
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  type Column,
  type SelectOption,
} from '../../components/ui'
import { DeadlineBadge } from '../../components/DeadlineBadge.tsx'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import { scholarshipsApi } from '../../lib/api.ts'
import {
  MUNICIPALITIES,
  SCHOLARSHIP_STATUSES,
  SCHOLARSHIP_TYPE_LABELS,
  SCHOLARSHIP_TYPES,
} from '../../lib/constants.ts'
import { formatDate } from '../../lib/format.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useToast } from '../../context/toastContext.ts'
import type { Scholarship, ScholarshipFilters, ScholarshipStatus, ScholarshipType } from '../../types/index.ts'

const PAGE_SIZE = 10

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All types' },
  ...SCHOLARSHIP_TYPES.map((option) => ({ value: option.value, label: option.label })),
]

const MUNICIPALITY_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All municipalities' },
  ...MUNICIPALITIES.map((name) => ({ value: name, label: name })),
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All statuses' },
  ...SCHOLARSHIP_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

/**
 * Administrator scholarship register.
 *
 * Unlike the public directory this list includes drafts, so an administrator can
 * find listings that are not yet published. Status changes and deletions are
 * both confirmed before they run.
 */
export function AdminScholarshipsPage() {
  useDocumentTitle('Manage scholarships')
  const toast = useToast()

  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const [type, setType] = useState<ScholarshipType | 'all'>('all')
  const [municipality, setMunicipality] = useState<string>('all')
  const [status, setStatus] = useState<ScholarshipStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState<Scholarship | null>(null)
  const [statusTarget, setStatusTarget] = useState<Scholarship | null>(null)

  // `includeDrafts` is read by the API but is not part of the public filter type,
  // so the extra flag is carried on an annotated intersection.
  const filters: ScholarshipFilters & { includeDrafts: boolean } = {
    query: debouncedQuery,
    type,
    municipality,
    status,
    includeDrafts: true,
  }

  const { data, loading, error, reload } = useAsync(
    () => scholarshipsApi.list(filters, page, PAGE_SIZE),
    [debouncedQuery, type, municipality, status, page],
  )

  const deleteAction = useAsyncAction(async (id: string) => {
    await scholarshipsApi.remove(id)
    return true
  })

  const statusAction = useAsyncAction(async (id: string, next: ScholarshipStatus) => {
    await scholarshipsApi.setStatus(id, next)
    return true
  })

  const hasFilters =
    debouncedQuery.trim() !== '' || type !== 'all' || municipality !== 'all' || status !== 'all'

  function clearFilters() {
    setQuery('')
    setType('all')
    setMunicipality('all')
    setStatus('all')
    setPage(1)
  }

  const statusChange = statusTarget
    ? statusTarget.status === 'open'
      ? { next: 'closed' as const, verb: 'Close' }
      : { next: 'open' as const, verb: 'Publish' }
    : null

  async function handleDelete() {
    if (!deleteTarget) return
    const ok = await deleteAction.run(deleteTarget.id)
    if (ok) {
      toast.success('Scholarship deleted', `“${deleteTarget.name}” has been removed from this workspace.`)
      setDeleteTarget(null)
      reload()
    }
  }

  async function handleStatusChange() {
    if (!statusTarget || !statusChange) return
    const ok = await statusAction.run(statusTarget.id, statusChange.next)
    if (ok) {
      toast.success('Status updated', `“${statusTarget.name}” is now ${statusChange.next}.`)
      setStatusTarget(null)
      reload()
    }
  }

  const columns: Column<Scholarship>[] = [
    {
      key: 'name',
      header: 'Scholarship',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-slate-100">{row.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{row.provider}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => SCHOLARSHIP_TYPE_LABELS[row.type],
    },
    {
      key: 'municipality',
      header: 'Municipality',
      accessor: (row) => row.municipality,
    },
    {
      key: 'deadline',
      header: 'Deadline',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-slate-700 dark:text-slate-200">{formatDate(row.deadline)}</span>
          <DeadlineBadge deadline={row.deadline} open={row.status === 'open'} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge kind="scholarship" status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <LinkButton to={`/admin/scholarships/${row.id}/edit`} variant="outline" size="sm">
            Edit
          </LinkButton>
          <Button
            variant="ghost"
            size="sm"
            aria-label={row.status === 'open' ? `Close ${row.name}` : `Publish ${row.name}`}
            onClick={() => setStatusTarget(row)}
          >
            <Icon name={row.status === 'open' ? 'close' : 'check'} className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${row.name}`}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
            onClick={() => setDeleteTarget(row)}
          >
            <Icon name="trash" className="size-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-10">
      <PageHeader
        title="Scholarships"
        description="Create, edit and retire every scholarship listing, including drafts that are not yet published."
        actions={<LinkButton to="/admin/scholarships/new">New scholarship</LinkButton>}
      />

      {deleteAction.error || statusAction.error ? (
        <Alert tone="danger" title="That action did not complete">
          {deleteAction.error ?? statusAction.error}
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              id="scholarship-search"
              label="Search scholarships"
              hideLabel
              placeholder="Search name, provider or keyword"
              value={query}
              onChange={(value) => {
                setQuery(value)
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-40">
            <Select
              id="scholarship-type"
              aria-label="Type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(event) => {
                setType(event.target.value as ScholarshipType | 'all')
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-36">
            <Select
              id="scholarship-status"
              aria-label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ScholarshipStatus | 'all')
                setPage(1)
              }}
            />
          </div>
          <div className="sm:w-44">
            <Select
              id="scholarship-municipality"
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
          <LoadingState label="Loading scholarships…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data ? (
          <>
            {data.items.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No scholarships match your filters' : 'No scholarships yet'}
                description={
                  hasFilters
                    ? 'Try a different search term or reset the filters to see every listing.'
                    : 'Create a scholarship listing to start collecting applications.'
                }
                action={
                  hasFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Reset filters
                    </Button>
                  ) : (
                    <LinkButton to="/admin/scholarships/new">New scholarship</LinkButton>
                  )
                }
              />
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
                <DataTable
                  columns={columns}
                  rows={data.items}
                  getRowId={(row) => row.id}
                  caption="Scholarship listings"
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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete this scholarship?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” and any bookmarks pointing at it will be removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete scholarship"
        tone="danger"
        loading={deleteAction.loading}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        title={statusChange ? `${statusChange.verb} this listing?` : 'Change status'}
        description={
          statusTarget && statusChange
            ? statusChange.next === 'open'
              ? `“${statusTarget.name}” will become visible to students in the public directory.`
              : `“${statusTarget.name}” will stop accepting new applications.`
            : ''
        }
        confirmLabel={statusChange?.verb ?? 'Confirm'}
        loading={statusAction.loading}
      />
    </div>
  )
}
