import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ApplyIllustration,
  FindIllustration,
  HeroIllustration,
  TrackIllustration,
} from '../../components/Illustrations.tsx'
import {
  Badge,
  Button,
  ErrorState,
  Icon,
  LinkButton,
  LoadingList,
  SearchInput,
} from '../../components/ui'
import { announcementsApi } from '../../lib/api.ts'
import { ANNOUNCEMENT_CATEGORY_LABELS } from '../../lib/constants.ts'
import { formatDate, truncate } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useInView } from '../../hooks/useInView.ts'
import { useAuth } from '../../context/authContext.ts'
import { ANNOUNCEMENT_CATEGORY_TONES } from '../../lib/tones.ts'

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

/** How many advisories the home page teases before sending readers to the channel. */
const ADVISORY_LIMIT = 3

/**
 * Home page.
 *
 * Search, the three steps of the process, the current advisories, and one call
 * to action. It deliberately does not list scholarships: the directory owns
 * those, and a home page that duplicates them is a home page nobody reads twice.
 */
export function HomePage() {
  useDocumentTitle('Find Scholarships in Pampanga')
  const navigate = useNavigate()
  const { user } = useAuth()

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
    <>
      {/* Hero. The only coloured block on the site, carrying the province's
          identity the way a letterhead does. Search stays on the first screen. */}
      <section className="bg-brand-800 dark:bg-ink-900">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 pt-10 pb-12 sm:px-8 sm:pt-14 sm:pb-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-gold-300 uppercase">
              Province of Pampanga
            </p>
            <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Find a Scholarship That Fits
            </h1>
            <p className="mt-3 max-w-xl text-sm text-brand-100 sm:mt-4 sm:text-base">
              Listings from provincial, municipal, national, educational and private providers
              across Pampanga, with your applications tracked in one place.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-6 flex flex-col gap-2 rounded-lg bg-white p-2 shadow-sm sm:mt-8 sm:max-w-xl sm:flex-row sm:items-center dark:bg-ink-900"
            >
              <div className="flex-1">
                <SearchInput
                  id="home-search"
                  label="Search Scholarships"
                  hideLabel
                  placeholder="Search by name, provider or keyword"
                  value={query}
                  onChange={setQuery}
                  className="[&_input]:border-0 [&_input]:bg-transparent [&_input]:py-2.5 dark:[&_input]:bg-transparent"
                />
              </div>
              <Button type="submit" size="lg" leadingIcon={<Icon name="search" className="size-4" />}>
                Search
              </Button>
            </form>

            <p className="mt-4 text-sm text-brand-100">
              <Link
                to="/scholarships"
                className="font-medium text-white underline underline-offset-4 hover:no-underline"
              >
                Browse all scholarships
              </Link>
              <span aria-hidden="true" className="mx-2 text-brand-300">
                ·
              </span>
              <Link
                to="/faqs"
                className="font-medium text-white underline underline-offset-4 hover:no-underline"
              >
                Read the FAQs
              </Link>
            </p>
          </div>

          <HeroIllustration className="mx-auto w-full max-w-[10rem] text-white sm:max-w-xs lg:max-w-none" />
        </div>
      </section>

      {/* A statement rather than a scoreboard. The page is for students who
          need help finishing school, not for people counting programmes. */}
      <section className="border-b border-slate-200 bg-brand-50 dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto max-w-3xl px-5 py-10 text-center sm:px-8 sm:py-12">
          <p className="text-xs font-medium tracking-[0.18em] text-brand-700 uppercase dark:text-brand-300">
            Para sa mga Iskolar ng Bayan
          </p>
          <p className="font-display mt-3 text-xl leading-relaxed text-slate-900 sm:text-2xl dark:text-slate-100">
            Whether a student finishes school should not depend on what their family can spare.
          </p>
        </div>
      </section>

      <div className="pb-14">

      {/* Mission and vision, set as a charter rather than body copy: small
          uppercase labels, serif statements, a rule between them, and one line
          of encouragement closing it. */}
      <section className="border-b border-slate-200 py-12 dark:border-ink-800 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-10 md:grid-cols-2 md:gap-0">
            <div className="md:pr-12">
              <p className="text-xs font-medium tracking-[0.18em] text-brand-700 uppercase dark:text-brand-300">
                Our Mission
              </p>
              <p className="font-display mt-4 text-lg leading-relaxed text-slate-800 sm:text-xl dark:text-slate-200">
                Kaagapay ninyo kami sa bawat hakbang ng inyong pag-aaral. Nandito kami upang hanapin
                ang tulong na para sa inyo, ipaliwanag ito sa simpleng paraan, at samahan kayo
                hanggang makapagtapos.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-10 md:border-t-0 md:border-l md:pt-0 md:pl-12 dark:border-ink-800">
              <p className="text-xs font-medium tracking-[0.18em] text-brand-700 uppercase dark:text-brand-300">
                Our Vision
              </p>
              <p className="font-display mt-4 text-lg leading-relaxed text-slate-800 sm:text-xl dark:text-slate-200">
                Isang Pampanga kung saan may pag-asa ang bawat mag-aaral na makapagtapos, gaano man
                kahirap ang pinagdadaanan, at kung saan may pagkakataong matupad ang bawat pangarap.
              </p>
            </div>
          </div>

          <p className="font-display mt-10 border-t border-slate-200 pt-6 text-center text-base text-brand-800 sm:mt-12 dark:border-ink-800 dark:text-brand-200">
            Hindi ka nag-iisa. Kasama mo kami.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 py-12 dark:border-ink-800 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="text-xs font-medium tracking-[0.18em] text-brand-700 uppercase dark:text-brand-300">
            How It Works
          </p>

          {/* Numbered columns with a rule across the top. No rail, no circles:
              the numbers carry the sequence and the rules keep the three on one
              line, which is all the diagram needs to say. */}
          <ol ref={journeyRef} className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="border-t-2 border-brand-800 pt-5 dark:border-brand-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="font-display text-2xl font-semibold text-brand-800 tabular-nums dark:text-brand-200"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <step.Illustration
                    className="size-10 text-brand-700 dark:text-brand-300"
                    animated={journeySeen}
                  />
                </div>
                <h3 className="font-display mt-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------- Advisories ------------------------------- */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)] lg:gap-16">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-brand-700 uppercase dark:text-brand-300">
                Updates
              </p>
              <h2 className="font-display mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
                Announcements and Advisories
              </h2>
              <Link
                to="/announcements"
                className="mt-4 inline-block text-sm font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300"
              >
                View All Announcements
              </Link>
            </div>

            <div>
              {announcementsLoading ? (
                <LoadingList rows={2} className="!py-8" />
              ) : null}

              {announcementsError ? (
                <ErrorState message={announcementsError} onRetry={reloadAnnouncements} />
              ) : null}

              {!announcementsLoading && !announcementsError ? (
                advisories.length === 0 ? (
                  <p className="text-sm text-slate-900 dark:text-slate-100">
                    There are no announcements at the moment.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-200 dark:divide-ink-800">
                    {advisories.map((advisory) => (
                      <li key={advisory.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <time
                            dateTime={advisory.publishedAt}
                            className="text-xs text-slate-900 dark:text-slate-100"
                          >
                            {formatDate(advisory.publishedAt)}
                          </time>
                          <Badge tone={ANNOUNCEMENT_CATEGORY_TONES[advisory.category]}>
                            {ANNOUNCEMENT_CATEGORY_LABELS[advisory.category]}
                          </Badge>
                          {advisory.pinned ? <Badge tone="gold">Pinned</Badge> : null}
                        </div>
                        <h3 className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {advisory.title}
                        </h3>
                        <p className="mt-0.5 max-w-[64ch] text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                          {truncate(advisory.body, 150)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* A closing call to action for readers who are not signed in yet. Signed
          in users already have their dashboard in the header. */}
      {!user ? (
        <section className="border-t border-slate-200 py-12 dark:border-ink-800">
          <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
            <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Track your applications in one place
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LinkButton to="/register" size="lg">
                Create Account
              </LinkButton>
              <LinkButton to="/login" variant="outline" size="lg">
                Sign In
              </LinkButton>
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </>
  )
}
