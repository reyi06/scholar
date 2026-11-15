import { Link } from 'react-router'
import {
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingDashboard,
  PageHeader,
  Section,
  StatCard,
} from '../../components/ui'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import {
  applicationsApi,
  notificationsApi,
  registrationsApi,
  scholarshipsApi,
} from '../../lib/api.ts'
import { formatDate, formatRelative } from '../../lib/format.ts'
import type { Application, SemesterRegistration } from '../../types/index.ts'

/** Statuses that still count as an application in progress. */
const ACTIVE_STATUSES: Application['status'][] = [
  'draft',
  'submitted',
  'under-review',
  'needs-info',
]

/** How many applications the dashboard lists before sending the reader on. */
const RECENT_LIMIT = 4

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
 * Categorised rather than stacked: what needs doing, what has been filed, what
 * changed, and where the rest of the record lives. Counts are summaries, but
 * the applications themselves are listed, because a dashboard that only counts
 * makes the reader click to learn anything.
 */
export function StudentDashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const dashboard = useAsync(async () => {
    if (!userId) return null
    const [applications, registrations, notifications, catalogue] = await Promise.all([
      applicationsApi.listForStudent(userId),
      registrationsApi.listForStudent(userId),
      notificationsApi.listForUser(userId),
      scholarshipsApi.list({}, 1, 100),
    ])
    return { applications, registrations, notifications, catalogue: catalogue.items }
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
  const catalogue = dashboard.data?.catalogue ?? []

  const scholarshipTitle = (id: string) =>
    catalogue.find((scholarship) => scholarship.id === id)?.name ?? 'Scholarship'

  const nextStep = pickNextStep(applications, registrations)
  const inProgress = applications.filter((application) =>
    ACTIVE_STATUSES.includes(application.status),
  ).length
  const approved = applications.filter((application) => application.status === 'approved').length
  const closed = applications.filter((application) => application.status === 'rejected').length

  const recent = [...applications]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, RECENT_LIMIT)

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user.firstName}`}
        description="What needs your attention, where your applications stand, and what changed since your last visit."
      />

      {dashboard.loading ? (
        <LoadingDashboard />
      ) : dashboard.error ? (
        <ErrorState message={dashboard.error} onRetry={dashboard.reload} />
      ) : (
        <>
          {/* One callout, not a section: it is the answer to "what do I do now". */}
          <section className="rounded-lg border border-brand-200 bg-brand-50 p-5 sm:p-6 dark:border-brand-800 dark:bg-brand-950/60">
            <p className="text-xs font-medium tracking-[0.18em] text-brand-800 uppercase dark:text-brand-200">
              Needs Your Attention
            </p>
            <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-slate-900 dark:text-slate-100">
              {nextStep.sentence}
            </p>
            <LinkButton to={nextStep.to} className="mt-4">
              {nextStep.label}
            </LinkButton>
          </section>

          <Section
            divider={false}
            title="Your Applications"
            description="Counts first, then the applications themselves."
            actions={
              <Link
                to="/student/applications"
                className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-300"
              >
                View all
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-200 py-5 sm:grid-cols-4 dark:border-ink-800">
              <StatCard label="All Applications" value={applications.length} to="/student/applications" />
              <StatCard
                label="In Progress"
                value={inProgress}
                hint="Draft, submitted, under review or needing information"
                to="/student/applications"
              />
              <StatCard label="Approved" value={approved} to="/student/applications" />
              <StatCard label="Closed" value={closed} to="/student/applications" />
            </div>

            {recent.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="No Applications Yet"
                  description="Browse the directory and apply; every application you file appears here."
                  action={<LinkButton to="/scholarships">Browse Scholarships</LinkButton>}
                />
              </div>
            ) : (
              <ul className="mt-2 divide-y divide-slate-200 dark:divide-ink-800">
                {recent.map((application) => (
                  <li key={application.id}>
                    <Link
                      to={`/student/applications/${application.id}`}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 transition-colors hover:text-brand-800 dark:hover:text-brand-200"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                          {scholarshipTitle(application.scholarshipId)}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-900 dark:text-slate-100">
                          {application.referenceNo} · updated {formatRelative(application.updatedAt)}
                        </span>
                      </span>
                      <StatusBadge kind="application" status={application.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-10">
            <Section title="Recent Updates" description="The latest notifications on your account.">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-900 dark:text-slate-100">No updates yet.</p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                  {notifications.slice(0, 5).map((notification) => (
                    <li
                      key={notification.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0"
                    >
                      <Link
                        to={notification.link ?? '/student/notifications'}
                        className="min-w-0 text-sm text-slate-900 transition-colors hover:text-brand-800 dark:text-slate-100 dark:hover:text-brand-300"
                      >
                        {notification.title}
                      </Link>
                      <span className="text-xs text-slate-900 dark:text-slate-100">
                        {formatDate(notification.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Your Records" description="Everything else attached to your account.">
              <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                {[
                  { to: '/student/documents', label: 'My Documents', hint: 'Files you have uploaded' },
                  {
                    to: '/student/semester-registration',
                    label: 'Semester Registration',
                    hint: 'Filed once per term as a grantee',
                  },
                  { to: '/student/grants', label: 'My Grants', hint: 'Confirmed grants and amounts' },
                  {
                    to: '/student/saved',
                    label: 'Saved Scholarships',
                    hint: 'Listings you kept for later',
                  },
                ].map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="flex items-baseline justify-between gap-4 py-3 first:pt-0 transition-colors hover:text-brand-800 dark:hover:text-brand-300"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                          {link.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-900 dark:text-slate-100">
                          {link.hint}
                        </span>
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <Section title="Need Help?">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[62ch] text-sm text-slate-900 dark:text-slate-100">
                Something not working, or a question about an application? Open a support ticket
                and the office reply will appear on the support page.
              </p>
              <LinkButton to="/support" variant="outline">
                Open a Support Ticket
              </LinkButton>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
