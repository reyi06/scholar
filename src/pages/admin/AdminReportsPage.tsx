import { useState } from 'react'
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Select,
  StatCard,
  type Column,
  type SelectOption,
} from '../../components/ui'
import { reportsApi, type BreakdownRow } from '../../lib/api.ts'
import { exportCsv, timestampSlug } from '../../lib/csv.ts'
import { formatCurrency, formatNumber } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

type Metric = 'count' | 'amount'

/** `2026-10` -> `Oct 2026`, so month labels read naturally. */
function formatMonthLabel(label: string): string {
  const [year, month] = label.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(date.getTime())) return label
  return date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
}

interface BreakdownCardProps {
  title: string
  description?: string
  rows: BreakdownRow[]
  /** Base name for the downloaded CSV file. */
  filename: string
  metric?: Metric
  loading?: boolean
  emptyTitle: string
}

/**
 * One breakdown report: a table plus an inline bar for quick visual
 * comparison, with a CSV export of exactly the rows currently shown.
 */
function BreakdownCard({
  title,
  description,
  rows,
  filename,
  metric = 'count',
  loading = false,
  emptyTitle,
}: BreakdownCardProps) {
  const maxValue = rows.reduce(
    (max, row) => Math.max(max, metric === 'amount' ? row.amount : row.count),
    0,
  )
  const showAmount = metric === 'amount' || rows.some((row) => row.amount > 0)

  const columns: Column<BreakdownRow>[] = [
    { key: 'label', header: 'Label', accessor: (row) => row.label, className: 'w-1/3' },
    {
      key: 'bar',
      header: 'Share',
      render: (row) => {
        const value = metric === 'amount' ? row.amount : row.count
        const percent = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0
        return (
          <div
            className="h-2 w-full max-w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="img"
            aria-label={`${row.label}: ${percent}% of the largest value`}
          >
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
          </div>
        )
      },
    },
    { key: 'count', header: 'Count', align: 'right', accessor: (row) => formatNumber(row.count) },
  ]

  if (showAmount) {
    columns.push({
      key: 'amount',
      header: 'Amount',
      align: 'right',
      accessor: (row) => formatCurrency(row.amount),
    })
  }

  function handleExport(): void {
    const headers = showAmount ? ['Label', 'Count', 'Amount (PHP)'] : ['Label', 'Count']
    const csvRows = rows.map((row) =>
      showAmount ? [row.label, row.count, row.amount] : [row.label, row.count],
    )
    exportCsv(`${filename}-${timestampSlug()}.csv`, headers, csvRows)
  }

  return (
    <Card>
      <CardHeader
        title={title}
        description={description}
        actions={
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Icon name="download" className="size-4" />}
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            Download CSV
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.label}
        loading={loading}
        caption={title}
        empty={
          <EmptyState
            title={emptyTitle}
            description="No records are available for this breakdown yet."
          />
        }
      />
    </Card>
  )
}

export function AdminReportsPage() {
  useDocumentTitle('Reports')

  const [month, setMonth] = useState('all')

  const reports = useAsync(async () => {
    const [overview, byStatus, byScholarship, byMonth, registrationsByStatus, byMunicipality] =
      await Promise.all([
        reportsApi.overview(),
        reportsApi.applicationsByStatus(),
        reportsApi.applicationsByScholarship(),
        reportsApi.applicationsByMonth(),
        reportsApi.registrationsByStatus(),
        reportsApi.grantsByMunicipality(),
      ])
    return { overview, byStatus, byScholarship, byMonth, registrationsByStatus, byMunicipality }
  }, [])

  const overview = reports.data?.overview ?? null
  const byMonth = reports.data?.byMonth ?? []

  const monthOptions: SelectOption[] = [
    { value: 'all', label: 'All months' },
    ...byMonth.map((row) => ({ value: row.label, label: formatMonthLabel(row.label) })),
  ]

  const filteredMonths = byMonth.filter((row) => month === 'all' || row.label === month)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational totals and breakdowns across scholarships, applications, registrations and grants."
        actions={
          <Select
            id="reports-month"
            label="Month"
            options={monthOptions}
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="w-48"
          />
        }
      />

      {reports.error ? <ErrorState message={reports.error} onRetry={reports.reload} /> : null}

      {!reports.error && reports.loading && !reports.data ? (
        <LoadingState label="Loading reports…" />
      ) : null}

      {!reports.error && reports.data ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Scholarships"
              value={overview ? formatNumber(overview.totalScholarships) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.openScholarships)} open · ${formatNumber(overview.draftScholarships)} draft`
                  : undefined
              }
              icon={<Icon name="graduation" className="size-5" />}
            />
            <StatCard
              label="Students"
              value={overview ? formatNumber(overview.totalStudents) : '—'}
              icon={<Icon name="users" className="size-5" />}
            />
            <StatCard
              label="Applications"
              value={overview ? formatNumber(overview.totalApplications) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.pendingApplications)} awaiting a decision`
                  : undefined
              }
              tone="brand"
              icon={<Icon name="inbox" className="size-5" />}
            />
            <StatCard
              label="Semester registrations"
              value={overview ? formatNumber(overview.totalRegistrations) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.pendingRegistrations)} pending verification`
                  : undefined
              }
              tone="warning"
              icon={<Icon name="calendar" className="size-5" />}
            />
            <StatCard
              label="Grant records"
              value={overview ? formatNumber(overview.totalGrants) : '—'}
              hint={overview ? `${formatNumber(overview.activeGrants)} active` : undefined}
              icon={<Icon name="award" className="size-5" />}
            />
            <StatCard
              label="Total amount released"
              value={overview ? formatCurrency(overview.totalAmountReleased) : '—'}
              tone="success"
              icon={<Icon name="chart" className="size-5" />}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BreakdownCard
              title="Applications by status"
              description="Where every application currently sits in the review process."
              rows={reports.data?.byStatus ?? []}
              filename="applications-by-status"
              loading={reports.loading}
              emptyTitle="No applications to break down"
            />
            <BreakdownCard
              title="Applications by scholarship"
              description="Which listings receive the most applications."
              rows={reports.data?.byScholarship ?? []}
              filename="applications-by-scholarship"
              loading={reports.loading}
              emptyTitle="No applications to break down"
            />
            <BreakdownCard
              title="Applications by month"
              description={
                month === 'all'
                  ? 'Application volume by the month each one was submitted.'
                  : `Showing ${formatMonthLabel(month)} only. Other tables cover all time.`
              }
              rows={filteredMonths}
              filename="applications-by-month"
              loading={reports.loading}
              emptyTitle="No applications submitted in the selected month"
            />
            <BreakdownCard
              title="Registrations by status"
              description="Verification progress for existing-grantee registrations."
              rows={reports.data?.registrationsByStatus ?? []}
              filename="registrations-by-status"
              loading={reports.loading}
              emptyTitle="No registrations to break down"
            />
            <BreakdownCard
              title="Grants by municipality"
              description="Confirmed grant totals and counts per student municipality."
              rows={reports.data?.byMunicipality ?? []}
              filename="grants-by-municipality"
              metric="amount"
              loading={reports.loading}
              emptyTitle="No grants to break down"
            />
          </section>
        </>
      ) : null}
    </div>
  )
}
