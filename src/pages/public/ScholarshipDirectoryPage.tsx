import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
} from '../../components/ui'
import { scholarshipsApi } from '../../lib/api.ts'
import {
  EDUCATION_LEVELS,
  MUNICIPALITIES,
  SCHOLARSHIP_TYPES,
} from '../../lib/constants.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useSavedScholarships } from '../../hooks/useSavedScholarships.ts'
import type { EducationLevel, ScholarshipFilters, ScholarshipType } from '../../types/index.ts'

const PAGE_SIZE = 9

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  ...SCHOLARSHIP_TYPES.map((option) => ({ value: option.value, label: option.label })),
]

const LEVEL_OPTIONS = [
  { value: 'all', label: 'All levels' },
  ...EDUCATION_LEVELS.map((option) => ({ value: option.value, label: option.label })),
]

const MUNICIPALITY_OPTIONS = [
  { value: 'all', label: 'All municipalities' },
  ...MUNICIPALITIES.map((name) => ({ value: name, label: name })),
]

const DEADLINE_OPTIONS = [
  { value: 'all', label: 'Any deadline' },
  { value: '7', label: 'Closing within 7 days' },
  { value: '30', label: 'Closing within 30 days' },
  { value: '90', label: 'Closing within 90 days' },
]

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Deadline (soonest first)' },
  { value: 'newest', label: 'Recently added' },
  { value: 'name', label: 'Name (A–Z)' },
]

/**
 * Public scholarship directory.
 *
 * Filter state is seeded from the URL (so the home page search and the
 * category tiles can link straight into a filtered view) and written back to
 * the URL as the user changes it, which makes filtered views shareable.
 */
export function ScholarshipDirectoryPage() {
  useDocumentTitle('Scholarship directory')
  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [type, setType] = useState<ScholarshipType | 'all'>(
    () => (searchParams.get('type') as ScholarshipType | null) ?? 'all',
  )
  const [municipality, setMunicipality] = useState(() => searchParams.get('municipality') ?? 'all')
  const [level, setLevel] = useState<EducationLevel | 'all'>(
    () => (searchParams.get('level') as EducationLevel | null) ?? 'all',
  )
  const [deadline, setDeadline] = useState(() => searchParams.get('deadline') ?? 'all')
  const [sort, setSort] = useState<ScholarshipFilters['sort']>(
    () => (searchParams.get('sort') as ScholarshipFilters['sort'] | null) ?? 'deadline',
  )
  const [page, setPage] = useState(() => Number(searchParams.get('page') ?? '1') || 1)

  const debouncedQuery = useDebouncedValue(query, 300)
  const { savedIds, toggle } = useSavedScholarships()

  // Reflect the current filters in the address bar so the view is shareable.
  useEffect(() => {
    const next = new URLSearchParams()
    if (debouncedQuery.trim()) next.set('q', debouncedQuery.trim())
    if (type !== 'all') next.set('type', type)
    if (municipality !== 'all') next.set('municipality', municipality)
    if (level !== 'all') next.set('level', level)
    if (deadline !== 'all') next.set('deadline', deadline)
    if (sort && sort !== 'deadline') next.set('sort', sort)
    if (page > 1) next.set('page', String(page))
    setSearchParams(next, { replace: true })
  }, [debouncedQuery, type, municipality, level, deadline, sort, page, setSearchParams])

  // Any filter change should return the user to the first page of results.
  // Done in the setters rather than an effect so there is no extra render pass.
  const updateFilter = (apply: () => void) => {
    apply()
    setPage(1)
  }

  const filters: ScholarshipFilters = useMemo(
    () => ({
      query: debouncedQuery,
      type,
      municipality,
      educationLevel: level,
      deadlineWithinDays: deadline === 'all' ? null : Number(deadline),
      sort,
    }),
    [debouncedQuery, type, municipality, level, deadline, sort],
  )

  const { data, loading, error, reload } = useAsync(
    () => scholarshipsApi.list(filters, page, PAGE_SIZE),
    [debouncedQuery, type, municipality, level, deadline, sort, page],
  )

  const results = data?.items ?? []
  const activeFilterCount = [
    debouncedQuery.trim() !== '',
    type !== 'all',
    municipality !== 'all',
    level !== 'all',
    deadline !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setQuery('')
    setType('all')
    setMunicipality('all')
    setLevel('all')
    setDeadline('all')
    setSort('deadline')
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Scholarship directory"
        description="Search and filter scholarship listings from provincial, municipal, national, educational and private providers across Pampanga."
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Scholarships' }]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr] lg:items-start">
        {/* ------------------------------- Filters ------------------------------- */}
        <Card className="lg:sticky lg:top-24">
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Icon name="filter" className="size-4" />
                Filters
              </h2>
              {activeFilterCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear ({activeFilterCount})
                </Button>
              ) : null}
            </div>

            <SearchInput
              id="directory-search"
              label="Search"
              placeholder="Name, provider or keyword"
              value={query}
              onChange={(value) => updateFilter(() => setQuery(value))}
            />

            <Select
              id="directory-type"
              label="Scholarship type"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(event) => updateFilter(() => setType(event.target.value as ScholarshipType | 'all'))}
            />

            <Select
              id="directory-municipality"
              label="Municipality"
              options={MUNICIPALITY_OPTIONS}
              value={municipality}
              onChange={(event) => updateFilter(() => setMunicipality(event.target.value))}
            />

            <Select
              id="directory-level"
              label="Education level"
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(event) => updateFilter(() => setLevel(event.target.value as EducationLevel | 'all'))}
            />

            <Select
              id="directory-deadline"
              label="Deadline"
              options={DEADLINE_OPTIONS}
              value={deadline}
              onChange={(event) => updateFilter(() => setDeadline(event.target.value))}
            />

            <Select
              id="directory-sort"
              label="Sort by"
              options={SORT_OPTIONS}
              value={sort ?? 'deadline'}
              onChange={(event) => updateFilter(() => setSort(event.target.value as ScholarshipFilters['sort']))}
            />
          </CardBody>
        </Card>

        {/* ------------------------------- Results ------------------------------- */}
        <div>
          {loading ? <LoadingState label="Searching scholarships…" /> : null}

          {error ? <ErrorState message={error} onRetry={reload} /> : null}

          {!loading && !error ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {data?.total ?? 0} {data?.total === 1 ? 'listing' : 'listings'} found
                </p>
                {activeFilterCount > 0 ? (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Reset filters
                  </Button>
                ) : null}
              </div>

              {results.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  icon={<Icon name="search" className="size-8" />}
                  title="No scholarships match your search"
                  description={
                    activeFilterCount > 0
                      ? 'Try removing a filter or searching for a different keyword. Deadlines in the past are still listed, so widening the deadline filter can help.'
                      : 'There are no scholarship listings available at the moment.'
                  }
                  action={
                    activeFilterCount > 0 ? (
                      <Button variant="outline" onClick={clearFilters}>
                        Clear all filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((scholarship) => (
                    <ScholarshipCard
                      key={scholarship.id}
                      scholarship={scholarship}
                      saved={savedIds.includes(scholarship.id)}
                      onToggleSave={toggle}
                    />
                  ))}
                </div>
              )}

              <Pagination
                page={data?.page ?? 1}
                totalPages={data?.totalPages ?? 1}
                total={data?.total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
