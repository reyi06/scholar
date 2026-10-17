import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  LinkButton,
  LoadingState,
  SearchInput,
  Section,
} from '../../components/ui'
import { scholarshipsApi } from '../../lib/api.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useAuth } from '../../context/authContext.ts'
import type { Scholarship } from '../../types/index.ts'

/**
 * Home page.
 *
 * Three things only: search, a few featured listings, and one call to action.
 * The directory carries the filters, and each listing carries its own detail.
 */
export function HomePage() {
  useDocumentTitle('Find scholarships in Pampanga')
  const navigate = useNavigate()
  const { user, isStudent } = useAuth()

  const [query, setQuery] = useState('')

  const { data, loading, error, reload } = useAsync(() => scholarshipsApi.listAll({ sort: 'deadline' }), [])

  const handleSearch = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = query.trim()
    navigate(trimmed ? `/scholarships?q=${encodeURIComponent(trimmed)}` : '/scholarships')
  }

  const open = (data ?? []).filter((item) => item.status === 'open')
  const featured = open.filter((item) => item.featured).slice(0, 3)
  const fallback = open.filter((item) => !item.featured).slice(0, 3)
  const showcase: Scholarship[] = featured.length > 0 ? featured : fallback

  return (
    <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
      {/* --------------------------------- Search --------------------------------- */}
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium text-brand-800 dark:text-brand-300">
          Scholarship information for Pampanga
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Find a scholarship that fits
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 dark:text-slate-300">
          Search listings from provincial, municipal, national, educational and private providers, and
          track your applications in one place.
        </p>

        <form onSubmit={handleSearch} className="mt-8 flex flex-col gap-2 sm:flex-row">
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

        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          or{' '}
          <Link to="/scholarships" className="font-medium text-brand-800 underline-offset-4 hover:underline dark:text-brand-300">
            browse all scholarships
          </Link>
        </p>
      </div>

      {/* -------------------------------- Featured -------------------------------- */}
      <div className="mt-20">
        <Section
          divider={false}
          title="Featured opportunities"
          description="A few listings currently accepting applications."
          actions={
            <Link
              to="/scholarships"
              className="text-sm font-medium text-brand-800 transition-colors hover:text-brand-900 dark:text-brand-300"
            >
              View all
            </Link>
          }
        >
          {loading ? <LoadingState label="Loading listings…" /> : null}
          {error ? <ErrorState message={error} onRetry={reload} /> : null}

          {!loading && !error ? (
            showcase.length === 0 ? (
              <EmptyState
                title="No listings published yet"
                description="Listings will appear here as soon as they are published."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {showcase.map((scholarship) => (
                  <ScholarshipCard key={scholarship.id} scholarship={scholarship} />
                ))}
              </div>
            )
          ) : null}
        </Section>
      </div>

      {/* ----------------------------------- CTA ----------------------------------- */}
      <div className="mt-20 border-t border-slate-200 pt-12 dark:border-slate-800">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
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
      </div>
    </div>
  )
}
