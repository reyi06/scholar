import type { ReactNode } from 'react'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  StatCard,
  type Column,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { grantsApi, scholarshipsApi } from '../../lib/api.ts'
import { formatCurrency, formatDate } from '../../lib/format.ts'
import type { Grant } from '../../types/index.ts'

export function MyGrantsPage() {
  useDocumentTitle('My grants')
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const state = useAsync(async () => {
    if (!userId) return { grants: [] as Grant[], names: new Map<string, string>() }
    const [grants, scholarships] = await Promise.all([
      grantsApi.listForStudent(userId),
      scholarshipsApi.listAll(),
    ])
    return {
      grants,
      names: new Map(scholarships.map((scholarship) => [scholarship.id, scholarship.name])),
    }
  }, [userId])

  if (!user) {
    return (
      <EmptyState
        title="You are not signed in"
        description="Sign in with a student account to view your grants."
        action={<LinkButton to="/login">Sign in</LinkButton>}
      />
    )
  }

  const grants = state.data?.grants ?? []
  const names = state.data?.names ?? new Map<string, string>()
  const totalReleased = grants.reduce((sum, grant) => sum + grant.amount, 0)

  const columns: Column<Grant>[] = [
    {
      key: 'referenceNo',
      header: 'Reference',
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-white">{row.referenceNo}</span>
      ),
    },
    {
      key: 'scholarship',
      header: 'Scholarship',
      render: (row) => names.get(row.scholarshipId) ?? 'Listing unavailable',
    },
    { key: 'term', header: 'Academic term', render: (row) => `${row.academicYear} · ${row.semester}` },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge kind="grant" status={row.status} />,
    },
    { key: 'releasedAt', header: 'Released', render: (row) => formatDate(row.releasedAt) },
    { key: 'confirmedBy', header: 'Confirmed by', render: (row) => row.confirmedBy },
    { key: 'remarks', header: 'Remarks', render: (row) => row.remarks ?? '—' },
  ]

  let body: ReactNode
  if (state.loading) {
    body = <LoadingState label="Loading your grants…" />
  } else if (state.error) {
    body = <ErrorState message={state.error} onRetry={state.reload} />
  } else {
    body = (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Confirmed grants"
            value={grants.length}
            hint="Grant records confirmed by an administrator"
            tone="success"
          />
          <StatCard
            label="Total released"
            value={formatCurrency(totalReleased)}
            hint="Across all your confirmed grants"
          />
        </div>

        {grants.length === 0 ? (
          <EmptyState
            title="No confirmed grants yet"
            description="A grant appears here only after an administrator confirms a grant record. An approved application on its own is not a grant."
            action={<LinkButton to="/student/applications">View my applications</LinkButton>}
          />
        ) : (
          <Card>
            <DataTable
              columns={columns}
              rows={grants}
              getRowId={(row) => row.id}
              caption="Your confirmed grants"
            />
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My grants"
        description="Confirmed grant records and the amounts released to you."
      />
      <Alert tone="info" title="Grants are confirmed separately from applications">
        An application can be approved without becoming a grant. A grant record only exists once an
        administrator confirms it, so this page can stay empty even while you have pending or approved
        applications.
      </Alert>
      {body}
    </div>
  )
}
