import { Link } from 'react-router'
import {
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Section,
  StatCard,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { applicationsApi, notificationsApi, registrationsApi } from '../../lib/api.ts'
import { formatDate } from '../../lib/format.ts'
import type { Application, SemesterRegistration } from '../../types/index.ts'

/** Statuses that still count as an application in progress. */
const ACTIVE_STATUSES: Application['status'][] = [
  'draft',
  'submitted',
  'under-review',
  'needs-info',
]

interface NextStep {
  sentence: string
  label: string
  to: string
}

/**
 * Choose the single most useful thing this student can do next.
 *
 * Ordered by how much it unblocks: a request for more information first, then a
 * registration awaiting verification, then an unfinished draft, and finally
 * browsing for something new.
 */
function pickNextStep(applications: Application[], registrations: SemesterRegistration[]): NextStep {
  const needsInfo = applications.find((application) => application.status === 'needs-info')
  if (needsInfo) {
    return {
      sentence: `Application ${needsInfo.referenceNo} needs more information before it can be reviewed.`,
      label: 'Review the Request',
      to: `/student/applications/${needsInfo.id}`,
    }
  }

  const pendingRegistration = registrations.find((registration) => registration.status === 'pending')
  if (pendingRegistration) {
    return {
      sentence: `Your ${pendingRegistration.semester} registration for AY ${pendingRegistration.academicYear} is awaiting verification.`,
      label: 'View Registration',
      to: '/student/semester-registration',
    }
  }

  const draft = applications.find((application) => application.status === 'draft')
  if (draft) {
    return {
      sentence: 'You have a draft application that has not been submitted yet.',
      label: 'Continue Your Draft',
      to: `/student/applications/${draft.id}`,
    }
  }

  return {
    sentence: 'Find a scholarship to apply for; everything you submit is tracked here.',
    label: 'Browse Scholarships',
    to: '/scholarships',
  }
}

/**
 * Student landing page.
 *
 * Three things only: the one step that matters now, where the applications
 * stand, and the latest updates. The detail lives on the pages it links to.
 */
export function StudentDashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const dashboard = useAsync(async () => {
    if (!userId) return null
    const [applications, registrations, notifications] = await Promise.all([
      applicationsApi.listForStudent(userId),
      registrationsApi.listForStudent(userId),
      notificationsApi.listForUser(userId),
    ])
    return { applications, registrations, notifications }
  }, [userId])

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to see your dashboard."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const applications = dashboard.data?.applications ?? []
  const registrations = dashboard.data?.registrations ?? []
  const notifications = dashboard.data?.notifications ?? []

  const nextStep = pickNextStep(applications, registrations)
  const inProgress = applications.filter((application) =>
    ACTIVE_STATUSES.includes(application.status),
  ).length
  const approved = applications.filter((application) => application.status === 'approved').length
  const closed = applications.filter((application) => application.status === 'rejected').length

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description="A short view of what needs your attention and where your applications stand."
      />

      {dashboard.loading ? (
        <LoadingState label="Loading your dashboard…" />
      ) : dashboard.error ? (
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <>
          <Section divider={false} title="Your Next Step">
            <p className="text-sm text-slate-600 dark:text-slate-300">{nextStep.sentence}</p>
            <div className="mt-4">
              <LinkButton to={nextStep.to}>{nextStep.label}</LinkButton>
            </div>
          </Section>

          <Section
            title="Application Status"
            description="Counts across every application you have filed."
          >
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-200 py-6 sm:grid-cols-4 dark:border-ink-800">
              <StatCard
                label="All Applications"
                value={applications.length}
                to="/student/applications"
              />
              <StatCard
                label="In Progress"
                value={inProgress}
                hint="Draft, submitted, under review or needing information"
                to="/student/applications"
              />
              <StatCard label="Approved" value={approved} to="/student/applications" />
              <StatCard label="Closed" value={closed} to="/student/applications" />
            </div>
          </Section>

          <Section title="Recent Updates" description="The latest notifications on your account.">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No updates yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                {notifications.slice(0, 5).map((notification) => (
                  <li
                    key={notification.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-3"
                  >
                    <Link
                      to={notification.link ?? '/student/notifications'}
                      className="min-w-0 text-sm text-slate-700 transition-colors hover:text-brand-800 dark:text-slate-200 dark:hover:text-brand-300"
                    >
                      {notification.title}
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(notification.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}
    </div>
  )
}
