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
import { StatusBadge } from '../../components/StatusBadge.tsx'
import { applicationsApi, registrationsApi, reportsApi } from '../../lib/api.ts'
import { formatCurrency, formatNumber, formatRelative } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

interface WorkItem {
  /** How the count reads in the sentence, e.g. "4 applications are waiting…". */
  sentence: string
  count: number
  to: string
  action: string
}

/**
 * Administrator landing page.
 *
 * Leads with the decisions that are actually waiting, then a short band of
 * figures, then the latest activity. Nothing here duplicates a management
 * screen — every row ends in a link to the screen that does the work.
 */
export function AdminDashboardPage() {
  useDocumentTitle('Admin Dashboard')

  const { data, loading, error, reload } = useAsync(async () => {
    const [
      overview,
      submitted,
      underReview,
      pendingRegistrations,
      awaitingGrants,
      recentApplications,
    ] = await Promise.all([
      reportsApi.overview(),
      applicationsApi.list({ status: 'submitted' }, 1, 1),
      applicationsApi.list({ status: 'under-review' }, 1, 1),
      registrationsApi.list({ status: 'pending' }, 1, 1),
      applicationsApi.awaitingGrantConfirmation(),
      applicationsApi.list({}, 1, 5),
    ])
    return {
      overview,
      submitted,
      underReview,
      pendingRegistrations,
      awaitingGrants,
      recentApplications,
    }
  }, [])

  const description = 'The decisions waiting on you first, then a short summary of the workspace.'

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader title="Admin Dashboard" description={description} />
        <LoadingState label="Loading dashboard…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-10">
        <PageHeader title="Admin Dashboard" description={description} />
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-10">
        <PageHeader title="Admin Dashboard" description={description} />
        <EmptyState
          title="Nothing to Show Yet"
          description="Once records exist they will be summarised here."
        />
      </div>
    )
  }

  const { overview, submitted, underReview, pendingRegistrations, awaitingGrants, recentApplications } =
    data

  const completelyEmpty =
    overview.totalScholarships === 0 &&
    overview.totalStudents === 0 &&
    overview.totalApplications === 0 &&
    overview.totalGrants === 0

  if (completelyEmpty) {
    return (
      <div className="space-y-10">
        <PageHeader
          title="Admin Dashboard"
          description={description}
          actions={<LinkButton to="/admin/scholarships/new">New Scholarship</LinkButton>}
        />
        <EmptyState
          title="No Records Yet"
          description="There are no scholarships, students, applications or grants in this workspace. Create a scholarship listing to get started."
          action={<LinkButton to="/admin/scholarships/new">Create the First Scholarship</LinkButton>}
        />
      </div>
    )
  }

  const reviewCount = submitted.total + underReview.total
  const registrationCount = pendingRegistrations.total
  const awaitingCount = awaitingGrants.length

  const work: WorkItem[] = [
    {
      count: reviewCount,
      sentence:
        reviewCount === 1
          ? '1 application is waiting for a review decision'
          : `${formatNumber(reviewCount)} applications are waiting for a review decision`,
      to: '/admin/applications',
      action: 'Review applications',
    },
    {
      count: registrationCount,
      sentence:
        registrationCount === 1
          ? '1 semester registration is waiting for verification'
          : `${formatNumber(registrationCount)} semester registrations are waiting for verification`,
      to: '/admin/registrations',
      action: 'Verify registrations',
    },
    {
      count: awaitingCount,
      sentence:
        awaitingCount === 1
          ? '1 approved application is waiting for a grant confirmation'
          : `${formatNumber(awaitingCount)} approved applications are waiting for a grant confirmation`,
      to: '/admin/grants',
      action: 'Confirm grants',
    },
  ]

  const pending = work.filter((item) => item.count > 0)

  return (
    <div className="space-y-10">
      <PageHeader
        title="Admin Dashboard"
        description={description}
        actions={<LinkButton to="/admin/scholarships/new">New Scholarship</LinkButton>}
      />

      <Section
        divider={false}
        title="Needs Attention"
        description="Items waiting on an administrator decision."
      >
        {pending.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nothing is waiting on a decision right now.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-ink-800">
            {pending.map((item) => (
              <li
                key={item.to + item.sentence}
                className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0"
              >
                <p className="text-sm text-slate-700 dark:text-slate-200">{item.sentence}</p>
                <Link
                  to={item.to}
                  className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-300"
                >
                  {item.action}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <section
        aria-label="Key Figures"
        className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-200 py-6 sm:grid-cols-4 dark:border-ink-800"
      >
        <StatCard
          label="Scholarships"
          value={formatNumber(overview.totalScholarships)}
          hint={`${formatNumber(overview.openScholarships)} open · ${formatNumber(overview.draftScholarships)} draft`}
          to="/admin/scholarships"
        />
        <StatCard
          label="Students"
          value={formatNumber(overview.totalStudents)}
          hint="Registered accounts"
          to="/admin/students"
        />
        <StatCard
          label="Applications"
          value={formatNumber(overview.totalApplications)}
          hint={`${formatNumber(overview.pendingApplications)} awaiting a decision`}
          to="/admin/applications"
        />
        <StatCard
          label="Released in Total"
          value={formatCurrency(overview.totalAmountReleased)}
          hint={`${formatNumber(overview.totalGrants)} grant records`}
          to="/admin/grants"
        />
      </section>

      <Section
        title="Recent Activity"
        description="The five most recently submitted applications."
        actions={
          <Link
            to="/admin/applications"
            className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-300"
          >
            View all
          </Link>
        }
      >
        {recentApplications.items.length === 0 ? (
          <EmptyState
            title="No Applications Yet"
            description="Applications submitted by students will appear here."
          />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-ink-800">
            {recentApplications.items.map((application) => (
              <li
                key={application.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {application.referenceNo}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Submitted {formatRelative(application.submittedAt)}
                  </p>
                </div>
                <StatusBadge kind="application" status={application.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
