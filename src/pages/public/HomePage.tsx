import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ApplyIllustration,
  FindIllustration,
  HeroIllustration,
  TrackIllustration,
} from '../../components/Illustrations.tsx'
import {
  Accordion,
  Badge,
  Button,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  SearchInput,
} from '../../components/ui'
import { announcementsApi } from '../../lib/api.ts'
import { formatDate } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useInView } from '../../hooks/useInView.ts'
import { useAuth } from '../../context/authContext.ts'

const STEPS = [
  {
    title: 'Find a listing',
    body: 'Search by name, provider, municipality, education level or deadline, and keep a shortlist of what fits.',
    Illustration: FindIllustration,
  },
  {
    title: 'Apply',
    body: 'Check the eligibility and requirements, then submit a short statement. You can save a draft and finish it later.',
    Illustration: ApplyIllustration,
  },
  {
    title: 'Follow it to a grant',
    body: 'Track each application through review. A grant record appears once an administrator confirms the amount and term.',
    Illustration: TrackIllustration,
  },
]

/** How many advisories the home page shows before users go looking. */
const ADVISORY_LIMIT = 5

/**
 * Home page.
 *
 * Search, the three steps of the process, the current advisories, and one call
 * to action. It deliberately does not list scholarships: the directory owns
 * those, and a home page that duplicates them is a home page nobody reads twice.
 */
export function HomePage() {
  useDocumentTitle('Find scholarships in Pampanga')
  const navigate = useNavigate()
  const { user, isStudent } = useAuth()

  const [query, setQuery] = useState('')
  const { ref: journeyRef, inView: journeySeen } = useInView<HTMLOListElement>()

  const {
    data: announcements,
    loading: announcementsLoading,
    error: announcementsError,
    reload: reloadAnnouncements,
  } = useAsync(() => announcementsApi.list('all'), [])

  // The API returns pinned items first, then newest.
  const advisories = (announcements ?? []).slice(0, ADVISORY_LIMIT)

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/scholarships?q=${encodeURIComponent(trimmed)}` : '/scholarships')
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      {/* --------------------------------- Search --------------------------------- */}
      <section className="grid items-center gap-12 pt-16 pb-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pt-24 lg:pb-20">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-slate-100">
            Find a scholarship that fits
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-600 lg:mx-0 dark:text-slate-300">
            Listings from provincial, municipal, national, educational and private providers across
            Pampanga, with your applications tracked in one place.
          </p>

          <form onSubmit={handleSearch} className="mt-9 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <SearchInput
                id="home-search"
                label="Search scholarships"
                hideLabel
                placeholder="Search by name, provider or keyword"
                value={query}
                onChange={setQuery}
                className="[&_input]:py-2.5"
              />
            </div>
            <Button type="submit" size="lg" leadingIcon={<Icon name="search" className="size-4" />}>
              Search
            </Button>
          </form>

          <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
            <Link
              to="/scholarships"
              className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
            >
              Browse all scholarships
            </Link>
            <span aria-hidden="true" className="mx-2 text-slate-300 dark:text-slate-600">
              ·
            </span>
            <Link
              to="/faqs"
              className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
            >
              Read the FAQs
            </Link>
          </p>
        </div>

        <HeroIllustration className="mx-auto w-full max-w-[15rem] text-brand-700 sm:max-w-xs lg:max-w-none dark:text-brand-300" />
      </section>

      {/* --------------------------------- Process -------------------------------- */}
      <section className="border-t border-slate-200 py-16 dark:border-ink-800">
        <h2 className="text-center text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          From searching to a confirmed grant
        </h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
          Three steps, and you can see exactly where you are at each one.
        </p>

        <ol ref={journeyRef} className="relative mt-12 grid gap-12 sm:grid-cols-3 sm:gap-6">
          {/* Rail behind the nodes, so the three read as one sequence rather than
              three standalone blocks. */}
          <div
            aria-hidden="true"
            className="absolute top-10 right-[16.667%] left-[16.667%] hidden border-t border-dashed border-slate-300 sm:block dark:border-ink-700"
          />

          {STEPS.map((step) => (
            <li key={step.title} className="relative flex flex-col items-center gap-4 text-center">
              <span className="relative z-10 flex size-20 items-center justify-center rounded-full border border-slate-200 bg-canvas dark:border-ink-800 dark:bg-ink-950">
                <step.Illustration
                  className="size-11 text-brand-700 dark:text-brand-300"
                  animated={journeySeen}
                />
              </span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
              <p className="max-w-[34ch] text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------- Advisories ------------------------------- */}
      <section className="border-t border-slate-200 py-16 dark:border-ink-800">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Announcements and advisories
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Notices for applicants and current grantees.
            </p>
          </div>

          {announcementsLoading ? (
            <LoadingState label="Loading announcements…" className="!py-8" />
          ) : null}

          {announcementsError ? (
            <ErrorState
              className="mt-6"
              message={announcementsError}
              onRetry={reloadAnnouncements}
            />
          ) : null}

          {!announcementsLoading && !announcementsError ? (
            advisories.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                There are no announcements at the moment.
              </p>
            ) : (
              <Accordion
                className="mt-2"
                items={advisories.map((advisory, index) => ({
                  id: advisory.id,
                  meta: (
                    <span className="flex flex-wrap items-center gap-2">
                      {formatDate(advisory.publishedAt)}
                      {advisory.pinned ? <Badge tone="brand">Pinned</Badge> : null}
                    </span>
                  ),
                  title: advisory.title,
                  content: <p className="max-w-[64ch]">{advisory.body}</p>,
                  defaultOpen: index === 0,
                }))}
              />
            )
          ) : null}
        </div>
      </section>

      {/* ----------------------------------- CTA ----------------------------------- */}
      <section className="border-t border-slate-200 pt-12 dark:border-ink-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {isStudent ? 'Continue where you left off' : 'Track your applications in one place'}
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
            {isStudent
              ? 'Check your application status, file your semester registration and review your confirmed grants.'
              : 'Create a student account to save listings, submit applications and follow their progress.'}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {user ? (
              <LinkButton to={isStudent ? '/student/dashboard' : '/admin/dashboard'} size="lg">
                Open my dashboard
              </LinkButton>
            ) : (
              <>
                <LinkButton to="/register" size="lg">
                  Create account
                </LinkButton>
                <LinkButton to="/login" variant="outline" size="lg">
                  Sign in
                </LinkButton>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
