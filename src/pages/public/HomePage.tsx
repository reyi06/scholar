import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import { DeadlineBadge } from '../../components/DeadlineBadge.tsx'
import {
  Accordion,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LinkButton,
  LoadingState,
  Select,
} from '../../components/ui'
import { announcementsApi, scholarshipsApi } from '../../lib/api.ts'
import { SCHOLARSHIP_TYPES } from '../../lib/constants.ts'
import { daysUntil, formatDate } from '../../lib/format.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import type { Scholarship } from '../../types/index.ts'

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...SCHOLARSHIP_TYPES.map((option) => ({ value: option.value, label: option.label })),
]

export function HomePage() {
  useDocumentTitle('Find scholarships in Pampanga')
  const navigate = useNavigate()
  const { user, isStudent } = useAuth()

  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')

  const { data, loading, error, reload } = useAsync(() => scholarshipsApi.listAll({ sort: 'deadline' }), [])
  const { data: announcements } = useAsync(() => announcementsApi.list('all'), [])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (type !== 'all') params.set('type', type)
    navigate(`/scholarships${params.toString() ? `?${params.toString()}` : ''}`)
  }

  // Everything below is derived from a single listing fetch.
  const all: Scholarship[] = data ?? []
  const open = all.filter((item) => item.status === 'open')
  const featured = open.filter((item) => item.featured).slice(0, 3)
  const closingSoon = open
    .filter((item) => {
      const days = daysUntil(item.deadline)
      return days !== null && days >= 0 && days <= 30
    })
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
  const providers = new Set(all.map((item) => item.provider))
  const municipalities = new Set(all.map((item) => item.municipality))

  const byType = SCHOLARSHIP_TYPES.map((option) => ({
    ...option,
    count: open.filter((item) => item.type === option.value).length,
  }))

  const advisories = (announcements ?? []).slice(0, 6)

  return (
    <div>
      {/* -------------------------------- Hero -------------------------------- */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:px-8 lg:py-20">
          <div className="space-y-6">
            <Badge tone="brand" size="md">
              Scholarship information · Pampanga
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl dark:text-white">
              Find and manage scholarships across Pampanga
            </h1>
            <p className="max-w-2xl text-base text-slate-600 dark:text-slate-300">
              One place to find scholarship opportunities from provincial, municipal, national,
              educational and private providers — and to track your own applications, semester
              registration and confirmed grants.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input
                id="home-search"
                label="Search scholarships"
                placeholder="Scholarship name, provider or keyword"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="sm:w-80"
              />
              <Select
                id="home-type"
                label="Type"
                options={TYPE_OPTIONS}
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="sm:w-44"
              />
              <Button type="submit" size="lg" leadingIcon={<Icon name="search" className="size-4" />}>
                Find a scholarship
              </Button>
            </form>

            <div className="flex flex-wrap gap-3">
              <LinkButton to="/scholarships" variant="outline">
                Browse all scholarships
              </LinkButton>
              {!user ? (
                <LinkButton to="/register" variant="ghost">
                  Create a student account
                </LinkButton>
              ) : isStudent ? (
                <LinkButton to="/student/dashboard" variant="ghost">
                  Go to my dashboard
                </LinkButton>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Open listings', value: open.length, icon: 'graduation' as const },
              { label: 'Providers', value: providers.size, icon: 'building' as const },
              { label: 'Municipalities covered', value: municipalities.size, icon: 'list' as const },
              {
                label: 'Closing within 30 days',
                value: open.filter((item) => {
                  const days = daysUntil(item.deadline)
                  return days !== null && days >= 0 && days <= 30
                }).length,
                icon: 'clock' as const,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
              >
                <Icon name={stat.icon} className="size-5 text-brand-600 dark:text-brand-400" />
                <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <LoadingState label="Loading scholarships…" />
        </div>
      ) : null}
      {error ? (
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6 lg:px-8">
          {/* ---------------------- Announcements and advisories ---------------------- */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Announcements and advisories
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Notices for applicants and current grantees. Select one to read it.
                </p>
              </div>
            </div>

            <Card className="mt-4">
              <CardBody className="px-0 py-0 sm:px-0">
                {advisories.length === 0 ? (
                  <p className="p-5 text-sm text-slate-500 dark:text-slate-400">
                    There are no announcements at the moment.
                  </p>
                ) : (
                  <div className="px-5">
                    <Accordion
                      items={advisories.map((announcement, index) => ({
                        id: announcement.id,
                        meta: (
                          <span className="flex items-center gap-2">
                            {formatDate(announcement.publishedAt)}
                            {announcement.pinned ? <Badge tone="brand">Pinned</Badge> : null}
                          </span>
                        ),
                        title: announcement.title,
                        content: (
                          <div className="space-y-2">
                            <p className="whitespace-pre-line">{announcement.body}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {announcement.author}
                            </p>
                          </div>
                        ),
                        defaultOpen: index === 0,
                      }))}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          {/* ------------------------------- Featured ------------------------------- */}
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Featured opportunities
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Highlighted listings currently accepting applications.
                </p>
              </div>
              <Link
                to="/scholarships"
                className="text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
              >
                View the full directory →
              </Link>
            </div>

            {featured.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={<Icon name="inbox" className="size-8" />}
                title="No featured listings right now"
                description="There are no highlighted open listings at the moment. Browse the full directory to see everything available."
                action={
                  <LinkButton to="/scholarships" variant="outline">
                    Browse all scholarships
                  </LinkButton>
                }
              />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featured.map((scholarship) => (
                  <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
                ))}
              </div>
            )}
          </section>

          {/* ------------------------------ Categories ------------------------------ */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Browse by category</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter the directory by the kind of provider offering the assistance.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {byType.map((category) => (
                <Link
                  key={category.value}
                  to={`/scholarships?type=${category.value}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-600"
                >
                  <div className="flex items-center justify-between">
                    <Icon name="graduation" className="size-5 text-brand-600 dark:text-brand-400" />
                    <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {category.count}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800 group-hover:text-brand-700 dark:text-slate-200 dark:group-hover:text-brand-300">
                    {category.label}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ------------------------------ Deadlines ------------------------------- */}
          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                title="Closing soon"
                description="Open listings with the nearest deadlines."
                actions={
                  <Link
                    to="/scholarships?deadline=30&sort=deadline"
                    className="text-sm font-medium text-brand-700 dark:text-brand-300"
                  >
                    See all
                  </Link>
                }
              />
              <CardBody className="p-0">
                {closingSoon.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    No listings are closing within the next 30 days.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {closingSoon.map((scholarship) => (
                      <li key={scholarship.id}>
                        <Link
                          to={`/scholarships/${scholarship.id}`}
                          className="flex flex-col gap-2 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/60"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {scholarship.name}
                            </p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                              {scholarship.provider} · {scholarship.municipality}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(scholarship.deadline)}
                            </span>
                            <DeadlineBadge deadline={scholarship.deadline} />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="How this works" />
              <CardBody className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                    1
                  </span>
                  <p>
                    Browse listings and filter by type, municipality, education level or deadline.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                    2
                  </span>
                  <p>
                    Some providers accept applications through this system and those submissions are
                    tracked here. Others run their own process — for those we link to the provider
                    directly and progress is not tracked.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-900/50 dark:text-brand-200">
                    3
                  </span>
                  <p>
                    Approving an application records the review decision. A grant record is confirmed
                    separately before any funds are released.
                  </p>
                </div>
                <Link
                  to="/about"
                  className="inline-block text-sm font-medium text-brand-700 dark:text-brand-300"
                >
                  Read more about the process →
                </Link>
              </CardBody>
            </Card>
          </section>

          {/* --------------------------------- CTA --------------------------------- */}
          <section className="rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-8 dark:border-brand-900 dark:bg-brand-950/40">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-2">
                <h2 className="text-xl font-bold text-brand-900 dark:text-brand-100">
                  {isStudent ? 'Continue where you left off' : 'Track your applications in one place'}
                </h2>
                <p className="text-sm text-brand-900/80 dark:text-brand-100/80">
                  {isStudent
                    ? 'Check the status of your applications, file your semester registration and review your confirmed grants.'
                    : 'Create a student account to save listings, submit applications, file your semester registration and follow the status of your grants.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {user ? (
                  <LinkButton to={isStudent ? '/student/dashboard' : '/admin/dashboard'}>
                    Open my dashboard
                  </LinkButton>
                ) : (
                  <>
                    <LinkButton to="/register">Create account</LinkButton>
                    <LinkButton to="/login" variant="outline">
                      Sign in
                    </LinkButton>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
