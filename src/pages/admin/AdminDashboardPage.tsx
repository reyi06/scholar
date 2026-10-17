import { Link } from 'react-router'
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  PageHeader,
  StatCard,
} from '../../components/ui'
import { StatusBadge } from '../../components/StatusBadge.tsx'
import { applicationsApi, announcementsApi, registrationsApi, reportsApi } from '../../lib/api.ts'
import { ANNOUNCEMENT_AUDIENCE_LABELS } from '../../lib/constants.ts'
import { formatCurrency, formatDate, formatNumber, formatRelative, truncate } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'

interface AttentionItem {
  label: string
  hint: string
  count: number
  to: string
}

/**
 * Administrator landing page.
 *
 * Pulls a single snapshot of the whole workspace so the reviewer can see what
 * needs a decision without opening each management screen. Every figure comes
 * from the localStorage-backed demo API — nothing here reflects a real backend.
 */
export function AdminDashboardPage() {
  useDocumentTitle('Admin dashboard')

  const { data, loading, error, reload } = useAsync(async () => {
    const [
      overview,
      submitted,
      underReview,
      pendingRegistrations,
      awaitingGrants,
      recentApplications,
      announcements,
    ] = await Promise.all([
      reportsApi.overview(),
      applicationsApi.list({ status: 'submitted' }, 1, 1),
      applicationsApi.list({ status: 'under-review' }, 1, 1),
      registrationsApi.list({ status: 'pending' }, 1, 1),
      applicationsApi.awaitingGrantConfirmation(),
      applicationsApi.list({}, 1, 5),
      announcementsApi.list(),
    ])
    return {
      overview,
      submitted,
      underReview,
      pendingRegistrations,
      awaitingGrants,
      recentApplications,
      announcements,
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" description="An overview of activity across the province." />
        <LoadingState label="Loading dashboard…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" description="An overview of activity across the province." />
        <ErrorState message={error} onRetry={reload} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admin dashboard" description="An overview of activity across the province." />
        <EmptyState title="Nothing to show yet" description="Once data is available it will appear here." />
      </div>
    )
  }

  const { overview } = data

  const completelyEmpty =
    overview.totalScholarships === 0 &&
    overview.totalStudents === 0 &&
    overview.totalApplications === 0 &&
    overview.totalGrants === 0

  if (completelyEmpty) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin dashboard"
          description="An overview of activity across the province."
          actions={<LinkButton to="/admin/scholarships/new">New scholarship</LinkButton>}
        />
        <EmptyState
          title="No records yet"
          description="There are no scholarships, students, applications or grants in this workspace. Create a scholarship listing to get started."
          action={<LinkButton to="/admin/scholarships/new">Create the first scholarship</LinkButton>}
        />
      </div>
    )
  }

  const attention: AttentionItem[] = [
    {
      label: 'Applications awaiting first review',
      hint: 'Submitted and not yet picked up.',
      count: data.submitted.total,
      to: '/admin/applications',
    },
    {
      label: 'Applications under review',
      hint: 'With a reviewer right now.',
      count: data.underReview.total,
      to: '/admin/applications',
    },
    {
      label: 'Semester registrations pending',
      hint: 'Existing grantees to verify.',
      count: data.pendingRegistrations.total,
      to: '/admin/registrations',
    },
    {
      label: 'Approved applications without a grant record',
      hint: 'Confirm the grant separately to release funds.',
      count: data.awaitingGrants.length,
      to: '/admin/grants',
    },
  ]

  const announcements = data.announcements.slice(0, 3)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="An overview of activity across the province."
        actions={<LinkButton to="/admin/scholarships/new">New scholarship</LinkButton>}
      />


      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total scholarships"
          value={formatNumber(overview.totalScholarships)}
          hint={`${formatNumber(overview.draftScholarships)} still in draft`}
          icon={<Icon name="graduation" />}
          to="/admin/scholarships"
        />
        <StatCard
          label="Open scholarships"
          value={formatNumber(overview.openScholarships)}
          hint="Accepting applications"
          tone="success"
          icon={<Icon name="check" />}
          to="/admin/scholarships"
        />
        <StatCard
          label="Students"
          value={formatNumber(overview.totalStudents)}
          hint="Registered accounts"
          icon={<Icon name="users" />}
          to="/admin/students"
        />
        <StatCard
          label="Applications"
          value={formatNumber(overview.totalApplications)}
          hint={`${formatNumber(overview.pendingApplications)} pending a decision`}
          icon={<Icon name="inbox" />}
          to="/admin/applications"
        />
        <StatCard
          label="Pending applications"
          value={formatNumber(overview.pendingApplications)}
          hint="Submitted, under review or needing information"
          tone="warning"
          icon={<Icon name="clock" />}
          to="/admin/applications"
        />
        <StatCard
          label="Pending registrations"
          value={formatNumber(overview.pendingRegistrations)}
          hint={`${formatNumber(overview.totalRegistrations)} submitted in total`}
          tone="warning"
          icon={<Icon name="calendar" />}
          to="/admin/registrations"
        />
        <StatCard
          label="Grant records"
          value={formatNumber(overview.totalGrants)}
          hint={`${formatNumber(overview.activeGrants)} active`}
          icon={<Icon name="award" />}
          to="/admin/grants"
        />
        <StatCard
          label="Total amount released"
          value={formatCurrency(overview.totalAmountReleased)}
          hint="Across all confirmed grants"
          tone="brand"
          icon={<Icon name="chart" />}
          to="/admin/reports"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs attention"
            description="Items waiting on an administrator decision."
          />
          <CardBody className="space-y-4">
            <Alert tone="info" title="Approving an application does not create a grant">
              Marking an application approved only updates its review status. A confirmed grant record
              must be created separately on the Grant records screen before any amount is treated as
              released.
            </Alert>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {attention.map((item) => (
                <li key={item.label} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.hint}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={item.count > 0 ? 'warning' : 'neutral'}>{formatNumber(item.count)}</Badge>
                    <Link
                      to={item.to}
                      className="text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
                    >
                      Manage →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Recent applications"
            description="The five most recently submitted applications."
            actions={
              <Link
                to="/admin/applications"
                className="text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
              >
                View all →
              </Link>
            }
          />
          <CardBody>
            {data.recentApplications.items.length === 0 ? (
              <EmptyState
                title="No applications yet"
                description="Applications submitted by students will appear here."
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentApplications.items.map((application) => (
                  <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {application.referenceNo}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Submitted {formatRelative(application.submittedAt)}
                      </p>
                    </div>
                    <StatusBadge kind="application" status={application.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent announcements"
          description="The latest notices published to the platform."
          actions={
            <Link
              to="/admin/announcements"
              className="text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
            >
              Manage announcements →
            </Link>
          }
        />
        <CardBody>
          {announcements.length === 0 ? (
            <EmptyState
              title="No announcements yet"
              description="Publish an announcement to tell students about deadlines and updates."
              action={<LinkButton to="/admin/announcements">Go to announcements</LinkButton>}
            />
          ) : (
            <ul className="space-y-4">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{announcement.title}</p>
                    <Badge tone="brand">{ANNOUNCEMENT_AUDIENCE_LABELS[announcement.audience]}</Badge>
                    {announcement.pinned ? <Badge tone="warning">Pinned</Badge> : null}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{truncate(announcement.body, 180)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Published {formatDate(announcement.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
