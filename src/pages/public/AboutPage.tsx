import { Badge, Card, CardBody, CardHeader, Icon, LinkButton, PageHeader } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'

const STEPS = [
  {
    title: 'Browse and shortlist',
    body: 'Search the directory and filter by provider type, municipality, education level or deadline. Save the listings you are considering to keep them in one place.',
  },
  {
    title: 'Check the application method',
    body: 'Every listing states whether applications are submitted through this platform or handled by the provider on their own website.',
  },
  {
    title: 'Apply and track progress',
    body: 'Where an application is submitted here, its status, timeline and any reviewer notes appear under My applications.',
  },
  {
    title: 'Registration and grants',
    body: 'Existing grantees file a semester registration each term. A confirmed grant record is created by an administrator once an application is approved.',
  },
]

const PROVIDER_TYPES = [
  {
    label: 'Provincial',
    body: 'Programmes offered across the whole province by provincial offices.',
  },
  {
    label: 'Municipal and city',
    body: 'Assistance administered by a specific municipality or city, usually for its own residents.',
  },
  {
    label: 'National',
    body: 'Programmes run by national agencies. These normally use their own application process.',
  },
  {
    label: 'Educational institution',
    body: 'Awards and discounts offered by a school, college or university.',
  },
  {
    label: 'Private organisation',
    body: 'Assistance funded by foundations and other private organisations.',
  },
]

export function AboutPage() {
  useDocumentTitle('About this platform')
  const { user, isStudent } = useAuth()

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="About this platform"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
        description="Pampanga GrantConnect brings scholarship listings and student grant records together in one place, covering the whole province of Pampanga."
      />

      <div className="mt-8 space-y-6">
        <Card>
          <CardHeader title="What this platform does" />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Students use the platform to find scholarships, keep a shortlist, submit applications and
              follow their progress. Administrators use it to publish listings, review submissions,
              verify semester registrations and maintain confirmed grant records.
            </p>
            <p>
              Listings are grouped by the kind of provider offering the assistance, so you can tell at a
              glance whether a programme is provincial, local to your municipality, national,
              school-based or privately funded.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="How to use it"
            description="The usual path from finding a listing to receiving a grant."
          />
          <CardBody className="space-y-5">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{step.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Where applications are submitted"
            description="Two different arrangements, shown clearly on every listing."
          />
          <CardBody className="space-y-4">
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 dark:border-brand-900 dark:bg-brand-950/40">
              <p className="flex items-center gap-2 text-sm font-semibold text-brand-900 dark:text-brand-100">
                <Icon name="check" className="size-4" />
                Submitted through this platform
              </p>
              <p className="mt-1 text-sm text-brand-900/80 dark:text-brand-100/80">
                The application, its timeline and its review outcome are recorded here so you can follow
                its progress without contacting the office.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Icon name="external" className="size-4" />
                Handled by the provider
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Some providers run their own application process. The listing links straight to their
                website, and this platform does not receive or track that submission — so it will not
                appear under your applications.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Applications, registrations and grants"
            description="Three records that are kept separate on purpose."
          />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Application</p>
              <p className="mt-0.5">
                A request for a scholarship. It moves through review and can be approved, returned for
                more information, or declined.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Semester registration</p>
              <p className="mt-0.5">
                Filed by students who already hold a grant, once per term, so enrolment can be verified
                and the grant continues. It is not an application for a new scholarship.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Confirmed grant</p>
              <p className="mt-0.5">
                Created by an administrator after an application is approved. Approving an application
                does not by itself release funds, which is why a listing can be approved while no grant
                record exists yet.
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Providers in the directory"
            description="Listings are grouped by the kind of organisation offering the assistance."
          />
          <CardBody className="space-y-3">
            {PROVIDER_TYPES.map((provider) => (
              <div key={provider.label} className="flex flex-wrap items-baseline gap-3">
                <Badge tone="brand">{provider.label}</Badge>
                <p className="flex-1 text-sm text-slate-600 dark:text-slate-300">{provider.body}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Keeping your details accurate" />
          <CardBody className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              Your profile, applications and grant records are visible only to you and to the
              administrators who review them. Nobody else can open your records.
            </p>
            <p>
              Contact details on a listing are shown so you can reach the provider directly. Keep your
              own profile up to date, and check the eligibility and requirements on a listing before
              applying — they vary between programmes.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Need help?" />
          <CardBody className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <p>
              For questions about a specific scholarship, contact the provider using the details on its
              listing. For questions about your account or an application you submitted here, contact the
              scholarship office.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/scholarships">Browse scholarships</LinkButton>
              <LinkButton
                to={user ? (isStudent ? '/student/dashboard' : '/admin/dashboard') : '/login'}
                variant="outline"
              >
                {user ? 'Go to my dashboard' : 'Sign in'}
              </LinkButton>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
