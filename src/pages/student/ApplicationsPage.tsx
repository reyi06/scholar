import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Alert,
  Card,
  CardBody,
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

export function ApplicationsPage() {
  useDocumentTitle('My applications')
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
        title="You are not signed in"
        description="Sign in with a student account to see your applications."
        action={<LinkButton to="/login">Sign in</LinkButton>}
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
      label: 'In progress',
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

  let body: ReactNode
  if (state.loading) {
    body = <LoadingState label="Loading your applications…" />
  } else if (state.error) {
    body = <ErrorState message={state.error} onRetry={state.reload} />
  } else {
    body = (
      <div className="space-y-4">
        <Tabs tabs={tabs} active={filter} onChange={setFilter} label="Application status" />
        {visible.length === 0 ? (
          <EmptyState
            title={applications.length === 0 ? 'No applications yet' : 'No applications in this view'}
            description={
              applications.length === 0
                ? 'You have not started an internal application yet. Browse the directory to find a scholarship you can apply for here.'
                : 'No applications match this status. Try another tab.'
            }
            action={<LinkButton to="/scholarships">Browse scholarships</LinkButton>}
          />
        ) : (
          <div className="space-y-3">
            {visible.map((application) => (
              <Card key={application.id}>
                <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                        <Link
                          to={`/student/applications/${application.id}`}
                          className="transition hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          {names.get(application.scholarshipId) ?? 'Scholarship application'}
                        </Link>
                      </h2>
                      <StatusBadge kind="application" status={application.status} />
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Reference {application.referenceNo} · submitted {formatDate(application.submittedAt)}
                    </p>
                  </div>
                  <LinkButton
                    to={`/student/applications/${application.id}`}
                    variant="outline"
                    size="sm"
                  >
                    View details
                  </LinkButton>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My applications"
        description="Track the scholarships you applied for through GrantConnect."
        actions={
          <LinkButton to="/scholarships" variant="outline">
            Browse scholarships
          </LinkButton>
        }
      />
      <Alert tone="info" title="Internal applications only">
        Only scholarships applied for inside this system are tracked here. Scholarships with an
        external application link are handled entirely on the provider's own website, so their
        progress does not appear in this list.
      </Alert>
      {body}
    </div>
  )
}
