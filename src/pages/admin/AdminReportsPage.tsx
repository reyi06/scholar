import { useState } from 'react'
import {
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Section,
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

interface BreakdownTableProps {
  title: string
  description?: string
  rows: BreakdownRow[]
  /** Base name for the downloaded CSV file. */
  filename: string
  metric?: Metric
}

/**
 * One breakdown report: a table with a thin proportion bar and a CSV export of
 * exactly the rows shown. Grouped with a `Section` rather than a card, and only
 * rendered by the page when it actually has rows.
 */
function BreakdownTable({ title, description, rows, filename, metric = 'count' }: BreakdownTableProps) {
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
            className="h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800"
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
    <Section
      divider={false}
      title={title}
      description={description}
      actions={
        <Button
          variant="outline"
          size="sm"
          leadingIcon={<Icon name="download" className="size-4" />}
          onClick={handleExport}
        >
          Download CSV
        </Button>
      }
    >
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <DataTable columns={columns} rows={rows} getRowId={(row) => row.label} caption={title} />
      </div>
    </Section>
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

  const reportData = reports.data ?? null
  const overview = reportData?.overview ?? null
  const byMonth = reportData?.byMonth ?? []

  const monthOptions: SelectOption[] = [
    { value: 'all', label: 'All Months' },
    ...byMonth.map((row) => ({ value: row.label, label: formatMonthLabel(row.label) })),
  ]

  const filteredMonths = byMonth.filter((row) => month === 'all' || row.label === month)

  const breakdowns = reportData
    ? [
        {
          title: 'Applications by Status',
          description: 'Where every application currently sits in the review process.',
          rows: reportData.byStatus,
          filename: 'applications-by-status',
          metric: 'count' as Metric,
        },
        {
          title: 'Applications by Scholarship',
          description: 'Which listings receive the most applications.',
          rows: reportData.byScholarship,
          filename: 'applications-by-scholarship',
          metric: 'count' as Metric,
        },
        {
          title: 'Applications by Month',
          description:
            month === 'all'
              ? 'Application volume by the month each one was submitted.'
              : `Showing ${formatMonthLabel(month)} only. The other tables cover all time.`,
          rows: filteredMonths,
          filename: 'applications-by-month',
          metric: 'count' as Metric,
        },
        {
          title: 'Registrations by Status',
          description: 'Verification progress for existing-grantee registrations.',
          rows: reportData.registrationsByStatus,
          filename: 'registrations-by-status',
          metric: 'count' as Metric,
        },
        {
          title: 'Grants by Municipality',
          description: 'Confirmed grant totals and counts per student municipality.',
          rows: reportData.byMunicipality,
          filename: 'grants-by-municipality',
          metric: 'amount' as Metric,
        },
      ].filter((breakdown) => breakdown.rows.length > 0)
    : []

  return (
    <div className="space-y-10">
      <PageHeader
        title="Reports"
        description="Operational totals and breakdowns across scholarships, applications, registrations and grants."
      />

      <div className="max-w-xs">
        <Select
          id="reports-month"
          label="Month"
          options={monthOptions}
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>

      {reports.error ? <ErrorState message={reports.error} onRetry={reports.reload} /> : null}

      {!reports.error && reports.loading && !reports.data ? (
        <LoadingState label="Loading reports…" />
      ) : null}

      {!reports.error && reportData ? (
        <>
          <section
            aria-label="Overview"
            className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-200 py-6 sm:grid-cols-3 lg:grid-cols-6 dark:border-ink-800"
          >
            <StatCard
              label="Scholarships"
              value={overview ? formatNumber(overview.totalScholarships) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.openScholarships)} open · ${formatNumber(overview.draftScholarships)} draft`
                  : undefined
              }
            />
            <StatCard label="Students" value={overview ? formatNumber(overview.totalStudents) : '—'} />
            <StatCard
              label="Applications"
              value={overview ? formatNumber(overview.totalApplications) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.pendingApplications)} awaiting a decision`
                  : undefined
              }
            />
            <StatCard
              label="Semester Registrations"
              value={overview ? formatNumber(overview.totalRegistrations) : '—'}
              hint={
                overview
                  ? `${formatNumber(overview.pendingRegistrations)} pending verification`
                  : undefined
              }
            />
            <StatCard
              label="Grant Records"
              value={overview ? formatNumber(overview.totalGrants) : '—'}
              hint={overview ? `${formatNumber(overview.activeGrants)} active` : undefined}
            />
            <StatCard
              label="Released in Total"
              value={overview ? formatCurrency(overview.totalAmountReleased) : '—'}
            />
          </section>

          {breakdowns.length === 0 ? (
            <EmptyState
              title="No Breakdowns to Show"
              description="Breakdowns appear here once there are applications, registrations or grants to report on."
            />
          ) : (
            breakdowns.map((breakdown) => (
              <BreakdownTable
                key={breakdown.filename}
                title={breakdown.title}
                description={breakdown.description}
                rows={breakdown.rows}
                filename={breakdown.filename}
                metric={breakdown.metric}
              />
            ))
          )}
        </>
      ) : null}
    </div>
  )
}
