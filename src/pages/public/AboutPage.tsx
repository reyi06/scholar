import { LifecycleDiagram, SiteMapDiagram } from '../../components/Diagrams.tsx'
import { Badge, LinkButton, PageHeader, Section } from '../../components/ui'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'

const STEPS = [
  {
    title: 'Browse and shortlist',
    body: 'Search the directory and filter by provider type, municipality, education level or deadline. Save the listings you are considering.',
  },
  {
    title: 'Check the application method',
    body: 'Every listing states whether applications go through this platform or are handled by the provider on their own website.',
  },
  {
    title: 'Apply and track progress',
    body: 'Where an application is submitted here, its status, timeline and any reviewer notes appear under My applications.',
  },
  {
    title: 'Registration and grants',
    body: 'Existing grantees file a semester registration each term. A confirmed grant record is created once an application is approved.',
  },
]

const PROVIDER_TYPES = [
  { label: 'Provincial', body: 'Offered across the whole province by provincial offices.' },
  { label: 'Municipal and City', body: 'Administered by a specific municipality or city, usually for its own residents.' },
  { label: 'National', body: 'Run by national agencies, which normally use their own application process.' },
  { label: 'Educational Institution', body: 'Awards and discounts offered by a school, college or university.' },
  { label: 'Private Organisation', body: 'Funded by foundations and other private organisations.' },
]

export function AboutPage() {
  useDocumentTitle('About')
  const { user, isStudent } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <PageHeader
        title="About This Platform"
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About' }]}
        description="Scholar brings scholarship listings and student grant records together in one place."
      />

      <div className="mt-10 space-y-10">
        <Section divider={false} title="What It Does">
          <div className="space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              Students use the platform to find scholarships, keep a shortlist, submit applications and
              follow their progress. Administrators publish listings, review submissions, verify
              semester registrations and maintain confirmed grant records.
            </p>
            <p>
              Listings are grouped by the kind of provider, so you can tell at a glance whether a
              programme is provincial, local to your municipality, national, school-based or privately
              funded.
            </p>
          </div>
        </Section>

        <Section title="How to Use It">
          <ol className="space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{step.title}</p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Where Applications Are Submitted">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4 dark:border-ink-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Through this platform</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                The submission, its timeline and its review outcome are recorded here so you can follow
                progress without contacting the office.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-4 dark:border-ink-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">By the provider</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Some providers run their own process. The listing links to their website and this
                platform does not receive or track that submission.
              </p>
            </div>
          </div>
        </Section>

        <Section title="What Happens to an Application">
          <p className="mb-7 max-w-[62ch] text-sm text-slate-600 dark:text-slate-300">
            Every application moves through the same stages. The last one is the step people most
            often assume has already happened: an approval is a decision, and a grant record has to
            be confirmed separately before anything is released.
          </p>
          <LifecycleDiagram />

          <p className="mt-8 max-w-[62ch] border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-ink-800 dark:text-slate-300">
            <span className="font-medium text-slate-900 dark:text-slate-100">Semester registration</span> is
            a separate record. It is filed by students who already hold a confirmed grant, once per
            term, and it is verified on its own rather than going through application review.
          </p>
        </Section>

        <Section title="Site Map">
          <p className="mb-8 max-w-[62ch] text-sm text-slate-600 dark:text-slate-300">
            Three areas, each with its own pages. Everything in the first is open to anyone; the other
            two ask you to sign in.
          </p>
          <SiteMapDiagram />
        </Section>

        <Section title="Providers in the Directory">
          <ul className="space-y-3">
            {PROVIDER_TYPES.map((provider) => (
              <li key={provider.label} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Badge tone="brand">{provider.label}</Badge>
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300">{provider.body}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Your Details">
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Your profile, applications and grant records are visible only to you and to the
              administrators who review them.
            </p>
            <p>
              Contact details on a listing are shown so you can reach the provider directly. Check the
              eligibility and requirements before applying — they vary between programmes.
            </p>
          </div>
        </Section>

        <Section title="Need Help?">
          <div className="space-y-5">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              For questions about a specific scholarship, contact the provider using the details on its
              listing. For questions about your account or an application submitted here, contact the
              scholarship office.
            </p>
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/scholarships">Browse Scholarships</LinkButton>
              <LinkButton
                to={user ? (isStudent ? '/student/dashboard' : '/admin/dashboard') : '/login'}
                variant="outline"
              >
                {user ? 'Go to my dashboard' : 'Sign in'}
              </LinkButton>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
