import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  StatCard,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import {
  announcementsApi,
  applicationsApi,
  grantsApi,
  registrationsApi,
  savedApi,
  scholarshipsApi,
} from '../../lib/api.ts'
import { formatCurrency, formatDate, truncate } from '../../lib/format.ts'

/** Statuses that still count as an application in progress. */
const ACTIVE_STATUSES = ['draft', 'submitted', 'under-review', 'needs-info']

export function StudentDashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const dashboard = useAsync(async () => {
    if (!userId) return null
    const [saved, applications, registrations, grants, closingSoon, announcements, scholarships] =
      await Promise.all([
        savedApi.listForStudent(userId),
        applicationsApi.listForStudent(userId),
        registrationsApi.listForStudent(userId),
        grantsApi.listForStudent(userId),
        scholarshipsApi.closingSoon(4),
        announcementsApi.list('students'),
        scholarshipsApi.listAll(),
      ])
    return { saved, applications, registrations, grants, closingSoon, announcements, scholarships }
  }, [userId])

  if (!user) {
    return (
      <EmptyState
        title="You are not signed in"
        description="Sign in with a student account to see your dashboard."
        action={<LinkButton to="/login">Sign in</LinkButton>}
      />
    )
  }

  const data = dashboard.data

  let body: ReactNode
  if (dashboard.loading) {
    body = <LoadingState label="Loading your dashboard…" />
  } else if (dashboard.error) {
    body = <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
  } else if (!data) {
    body = (
      <EmptyState
        title="Nothing to show yet"
        description="Your dashboard fills up as you save scholarships and submit applications."
        action={<LinkButton to="/scholarships">Browse scholarships</LinkButton>}
      />
    )
  } else {
    const scholarshipNames = new Map(data.scholarships.map((item) => [item.id, item.name]))
    const activeApplications = data.applications.filter((application) =>
      ACTIVE_STATUSES.includes(application.status),
    )
    const pendingRegistrations = data.registrations.filter((item) => item.status === 'pending')
    const totalReleased = data.grants.reduce((sum, grant) => sum + grant.amount, 0)

    body = (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Saved scholarships"
            value={data.saved.length}
            hint="On your shortlist"
            icon="★"
            to="/student/saved"
          />
          <StatCard
            label="Applications in progress"
            value={activeApplications.length}
            hint="Draft, submitted, under review or needing information"
            tone="brand"
            to="/student/applications"
          />
          <StatCard
            label="Pending registrations"
            value={pendingRegistrations.length}
            hint="Semester registrations awaiting verification"
            tone="warning"
            to="/student/semester-registration"
          />
          <StatCard
            label="Confirmed grants"
            value={data.grants.length}
            hint={`${formatCurrency(totalReleased)} released in total`}
            tone="success"
            to="/student/grants"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Applications in progress"
              description="Your most recent applications submitted through this system."
              actions={
                <LinkButton to="/student/applications" variant="ghost" size="sm">
                  View all
                </LinkButton>
              }
            />
            <CardBody className="space-y-3">
              {data.applications.length === 0 ? (
                <EmptyState
                  title="No applications yet"
                  description="When you apply to an internal scholarship, it appears here so you can track its progress."
                  action={
                    <LinkButton to="/scholarships" size="sm">
                      Browse scholarships
                    </LinkButton>
                  }
                />
              ) : (
                data.applications.slice(0, 4).map((application) => (
                  <div
                    key={application.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        <Link
                          to={`/student/applications/${application.id}`}
                          className="transition hover:text-brand-700 dark:hover:text-brand-300"
                        >
                          {scholarshipNames.get(application.scholarshipId) ?? 'Scholarship application'}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        Reference {application.referenceNo} · submitted {formatDate(application.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge kind="application" status={application.status} />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title="Recent announcements" />
              <CardBody className="space-y-4">
                {data.announcements.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No announcements yet.</p>
                ) : (
                  data.announcements.slice(0, 3).map((announcement) => (
                    <article key={announcement.id} className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {announcement.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(announcement.publishedAt)}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        {truncate(announcement.body, 200)}
                      </p>
                    </article>
                  ))
                )}
              </CardBody>
            </Card>

          </div>
        </div>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Deadlines approaching
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Open scholarships closing within the next three weeks.
              </p>
            </div>
            <LinkButton to="/scholarships" variant="outline" size="sm">
              See all scholarships
            </LinkButton>
          </div>
          {data.closingSoon.length === 0 ? (
            <EmptyState
              title="No closing deadlines"
              description="No open scholarships are closing in the next three weeks. Check the directory for the full list."
              action={<LinkButton to="/scholarships">Browse scholarships</LinkButton>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {data.closingSoon.map((scholarship) => (
                <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
              ))}
            </div>
          )}
        </section>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.firstName}. Here is where your saved scholarships, applications and grants stand today.`}
      />
      {body}
    </div>
  )
}
