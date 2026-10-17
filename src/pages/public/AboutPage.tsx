import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Icon,
  LinkButton,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'

const PUBLIC_ROUTES = [
  { path: '/', description: 'Hero, search, featured opportunities, categories, deadlines and calls to action.' },
  { path: '/scholarships', description: 'Searchable, filterable and paginated directory of every published listing.' },
  { path: '/scholarships/:id', description: 'Full details: provider, eligibility, benefits, requirements, deadlines, contact and instructions.' },
  { path: '/login', description: 'Sign-in for students and administrators.' },
  { path: '/register', description: 'Student self-registration.' },
  { path: '/about', description: 'This page — scope, limitations and route documentation.' },
]

const STUDENT_ROUTES = [
  { path: '/student/dashboard', description: 'Overview of saved listings, applications, registrations and grants.' },
  { path: '/student/profile', description: 'Personal, enrolment and guardian details.' },
  { path: '/student/saved', description: 'Bookmarked scholarships.' },
  { path: '/student/applications', description: 'Every internally submitted application, grouped by status.' },
  { path: '/student/applications/:id', description: 'Single application with timeline, review notes and withdraw action.' },
  { path: '/student/semester-registration', description: 'Semester-specific re-registration for existing grantees.' },
  { path: '/student/grants', description: 'Confirmed grant records only.' },
  { path: '/student/notifications', description: 'In-app notifications.' },
]

const ADMIN_ROUTES = [
  { path: '/admin/dashboard', description: 'Key figures and items needing attention.' },
  { path: '/admin/scholarships', description: 'Manage all listings, including drafts.' },
  { path: '/admin/scholarships/new', description: 'Create a scholarship listing.' },
  { path: '/admin/scholarships/:id/edit', description: 'Edit an existing listing.' },
  { path: '/admin/students', description: 'Student records and profile review.' },
  { path: '/admin/applications', description: 'Review submissions and record decisions.' },
  { path: '/admin/registrations', description: 'Verify or reject semester registrations.' },
  { path: '/admin/grants', description: 'Confirm grant records and manage releases.' },
  { path: '/admin/announcements', description: 'Publish and manage announcements.' },
  { path: '/admin/reports', description: 'Breakdowns with filters and CSV export.' },
  { path: '/admin/settings', description: 'Platform settings and demo data controls.' },
]

function RouteTable({ title, routes }: { title: string; routes: { path: string; description: string }[] }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody className="p-0">
        <Table className="min-w-[36rem]">
          <THead>
            <TR>
              <TH className="w-72">Route</TH>
              <TH>Purpose</TH>
            </TR>
          </THead>
          <TBody>
            {routes.map((route) => (
              <TR key={route.path}>
                <TD>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                    {route.path}
                  </code>
                </TD>
                <TD>{route.description}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  )
}

export function AboutPage() {
  useDocumentTitle('About this system')
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="About Pampanga GrantConnect"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
        description="A demonstration platform for consolidating scholarship information and tracking student grants across the province of Pampanga."
      />

      <Alert tone="warning" title="Read this first" className="mt-6">
        This deployment is a frontend-only prototype. It contains no real scholarship programmes and is
        not affiliated with any government agency, school or provider. Every listing is placeholder
        content and must be verified against official sources before it is relied upon.
      </Alert>

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader title="What this system does" />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              The platform has two jobs. First, it consolidates scholarship listings from provincial,
              municipal, national, educational and private providers into one searchable directory.
              Second, it lets students track their own applications, file semester registration as an
              existing grantee, and see confirmed grant records — while administrators review
              submissions and maintain the underlying records.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">React + Vite</Badge>
              <Badge tone="brand">TypeScript</Badge>
              <Badge tone="brand">Tailwind CSS</Badge>
              <Badge tone="neutral">Role-based navigation</Badge>
              <Badge tone="neutral">No backend</Badge>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader title="What works" />
            <CardBody>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {[
                  'Browsing, searching, filtering and paginating the scholarship directory',
                  'Saving scholarships to a shortlist',
                  'Submitting and tracking internal applications',
                  'Reviewing applications and recording decisions as an administrator',
                  'Semester registration for existing grantees, tracked separately from applications',
                  'Confirming grant records explicitly, separate from approving applications',
                  'Publishing announcements and receiving in-app notifications',
                  'Reports with filters and CSV export',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="What is not implemented" />
            <CardBody>
              <ul className="space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                {[
                  'No backend, database or API of any kind',
                  'No real authentication — sign-in is a browser-side convenience and is not secure',
                  'No email, SMS or push notifications; notifications are in-app only',
                  'No document upload; requirements are recorded as text labels only',
                  'No payment, disbursement or integration with any provider system',
                  'No server-side authorisation, so role checks can be bypassed',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <Icon name="close" className="mt-0.5 size-4 shrink-0 text-rose-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="How applications and grants relate" />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Two different things are easy to confuse, so the system keeps them apart deliberately:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <strong>Internally submitted applications</strong> are sent through this platform. Their
                progress appears under <em>My applications</em> and can be reviewed by an administrator.
              </li>
              <li>
                <strong>Externally handled applications</strong> are processed on the provider's own
                website. The listing shows the official link, and the platform neither receives nor
                tracks that submission.
              </li>
              <li>
                <strong>Semester registration</strong> is for students who already hold a grant. It is a
                separate record from any application and is verified on its own.
              </li>
              <li>
                <strong>Confirmed grants</strong> only exist once an administrator explicitly confirms a
                grant record. Approving an application does not release funds, and no application becomes
                a grant automatically.
              </li>
            </ol>
          </CardBody>
        </Card>

        <RouteTable title="Public routes" routes={PUBLIC_ROUTES} />
        <RouteTable title="Student routes (sign-in required)" routes={STUDENT_ROUTES} />
        <RouteTable title="Administrator routes (administrator sign-in required)" routes={ADMIN_ROUTES} />

        <Card>
          <CardHeader title="Data, privacy and security" />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Student records, applications and grant records are private. They are only reachable from
              role-guarded routes, and a student can only open their own application: the data layer
              checks ownership on every read.
            </p>
            <p>
              Those guards are a navigation convenience, not a security boundary. Because the whole
              application runs in the browser, a determined user can bypass them, and the demo data is
              stored in plain text in localStorage. A production deployment must enforce authentication
              and authorisation on a server, store credentials hashed, and protect uploaded documents.
            </p>
            <p className="text-slate-500 dark:text-slate-400">
              Note that <code className="text-xs">localStorage</code> here also holds passwords for the
              demo accounts. That is unacceptable in any real system and exists only so the prototype can
              be explored without a backend.
            </p>
          </CardBody>
        </Card>

        <EmptyState
          icon={<Icon name="graduation" className="size-8" />}
          title="Ready to explore?"
          description="Browse the directory, or sign in with one of the demo accounts to see the student and administrator areas."
          action={
            <>
              <LinkButton to="/scholarships">Browse scholarships</LinkButton>
              <LinkButton to={user ? (user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard') : '/login'} variant="outline">
                {user ? 'Go to my dashboard' : 'Sign in with a demo account'}
              </LinkButton>
            </>
          }
        />
      </div>
    </div>
  )
}
