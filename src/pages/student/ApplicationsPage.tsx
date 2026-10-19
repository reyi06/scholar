import { useState } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Tabs,
  type TabItem,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { applicationsApi, scholarshipsApi } from '../../lib/api.ts'
import { formatDate } from '../../lib/format.ts'
import type { Application } from '../../types/index.ts'

type FilterId = 'all' | 'in-progress' | 'approved' | 'closed'

/** Statuses that count as an application still being processed. */
const IN_PROGRESS = ['draft', 'submitted', 'under-review', 'needs-info']

function matchesFilter(application: Application, filter: FilterId): boolean {
  if (filter === 'all') return true
  if (filter === 'approved') return application.status === 'approved'
  if (filter === 'closed') return application.status === 'rejected'
  return IN_PROGRESS.includes(application.status)
}

/**
 * The student's applications.
 *
 * A single vertical list, grouped by mode with tabs. Each row links to the
 * application's own page, where the report and timeline live.
 */
export function ApplicationsPage() {
  useDocumentTitle('My Applications')
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const [filter, setFilter] = useState<FilterId>('all')

  const state = useAsync(async () => {
    if (!userId) {
      return { applications: [] as Application[], names: new Map<string, string>() }
    }
    const [applications, scholarships] = await Promise.all([
      applicationsApi.listForStudent(userId),
      scholarshipsApi.listAll(),
    ])
    return {
      applications,
      names: new Map(scholarships.map((scholarship) => [scholarship.id, scholarship.name])),
    }
  }, [userId])

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to see your applications."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const applications = state.data?.applications ?? []
  const names = state.data?.names ?? new Map<string, string>()
  const visible = applications.filter((application) => matchesFilter(application, filter))

  const tabs: TabItem<FilterId>[] = [
    { id: 'all', label: 'All', count: applications.length },
    {
      id: 'in-progress',
      label: 'In Progress',
      count: applications.filter((application) => matchesFilter(application, 'in-progress')).length,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: applications.filter((application) => matchesFilter(application, 'approved')).length,
    },
    {
      id: 'closed',
      label: 'Closed',
      count: applications.filter((application) => matchesFilter(application, 'closed')).length,
    },
  ]

  return (
    <div className="space-y-10">
      <PageHeader
        title="My Applications"
        description="Track the scholarships you applied for through Scholar."
        actions={
          <LinkButton to="/scholarships" variant="outline">
            Browse Scholarships
          </LinkButton>
        }
      />

      {state.loading ? (
        <LoadingState label="Loading your applications…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <div className="space-y-6">
          <Alert tone="info">
            Only scholarships applied for inside this system are tracked here; applications handled on a
            provider's own website do not appear in this list.
          </Alert>

          <Tabs tabs={tabs} active={filter} onChange={setFilter} label="Application Status" />

          {visible.length === 0 ? (
            <EmptyState
              title={applications.length === 0 ? 'No applications yet' : 'No applications in this view'}
              description={
                applications.length === 0
                  ? 'You have not started an internal application yet. Browse the directory to find a scholarship you can apply for here.'
                  : 'No applications match this status. Try another tab.'
              }
              action={<LinkButton to="/scholarships">Browse Scholarships</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-ink-800">
              {visible.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/student/applications/${application.id}`}
                        className="text-sm font-medium text-slate-900 transition-colors hover:text-brand-800 dark:text-slate-100 dark:hover:text-brand-300"
                      >
                        {names.get(application.scholarshipId) ?? 'Scholarship application'}
                      </Link>
                      <StatusBadge kind="application" status={application.status} />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Reference {application.referenceNo} · submitted {formatDate(application.submittedAt)}
                    </p>
                  </div>
                  <Link
                    to={`/student/applications/${application.id}`}
                    className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-200"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
