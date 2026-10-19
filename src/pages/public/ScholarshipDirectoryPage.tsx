import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
} from '../../components/ui'
import { scholarshipsApi } from '../../lib/api.ts'
import { EDUCATION_LEVELS, MUNICIPALITIES, SCHOLARSHIP_TYPES } from '../../lib/constants.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useSavedScholarships } from '../../hooks/useSavedScholarships.ts'
import type { EducationLevel, ScholarshipFilters, ScholarshipType } from '../../types/index.ts'

const PAGE_SIZE = 10

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
  { value: '7', label: 'Next 7 days' },
  { value: '30', label: 'Next 30 days' },
  { value: '90', label: 'Next 90 days' },
]

const SORT_OPTIONS = [
  { value: 'deadline', label: 'Soonest deadline' },
  { value: 'newest', label: 'Recently added' },
  { value: 'name', label: 'Name (A–Z)' },
]

/**
 * Public scholarship directory.
 *
 * One search bar and four compact filters in a single toolbar; the results are
 * the focus. Filter state is seeded from the URL and written back to it, so a
 * filtered view can be linked to or bookmarked.
 */
export function ScholarshipDirectoryPage() {
  useDocumentTitle('Scholarships')
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

  // Any filter change returns to the first page of results. Done in the
  // setters rather than an effect so there is no extra render pass.
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
    <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        title="Scholarships"
        description="Listings from provincial, municipal, national, educational and private providers across Pampanga."
      />

      {/* ------------------------------- Toolbar ------------------------------- */}
      <div className="mt-6 border-y border-slate-200 py-4 dark:border-ink-800">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="lg:flex-1">
            <SearchInput
              id="directory-search"
              label="Search scholarships"
              hideLabel
              placeholder="Search scholarships"
              value={query}
              onChange={(value) => updateFilter(() => setQuery(value))}
            />
          </div>

          {/* Fixed widths on large screens keep the selects from crowding the
              search field out of its own row. */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[repeat(4,11rem)]">
            <Select
              id="directory-type"
              label="Scholarship type"
              hideLabel
              options={TYPE_OPTIONS}
              value={type}
              onChange={(event) => updateFilter(() => setType(event.target.value as ScholarshipType | 'all'))}
            />
            <Select
              id="directory-municipality"
              label="Municipality"
              hideLabel
              options={MUNICIPALITY_OPTIONS}
              value={municipality}
              onChange={(event) => updateFilter(() => setMunicipality(event.target.value))}
            />
            <Select
              id="directory-level"
              label="Education level"
              hideLabel
              options={LEVEL_OPTIONS}
              value={level}
              onChange={(event) => updateFilter(() => setLevel(event.target.value as EducationLevel | 'all'))}
            />
            <Select
              id="directory-deadline"
              label="Deadline"
              hideLabel
              options={DEADLINE_OPTIONS}
              value={deadline}
              onChange={(event) => updateFilter(() => setDeadline(event.target.value))}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------- Results ------------------------------- */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data ? `${data.total} ${data.total === 1 ? 'listing' : 'listings'}` : 'Searching…'}
            {activeFilterCount > 0 ? ' · filtered' : ''}
          </p>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
            <div className="w-44">
              <Select
                id="directory-sort"
                label="Sort by"
                hideLabel
                options={SORT_OPTIONS}
                value={sort ?? 'deadline'}
                onChange={(event) => setSort(event.target.value as ScholarshipFilters['sort'])}
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="sr-only">Search results</h2>
          {loading ? <LoadingState label="Searching scholarships…" /> : null}

          {error ? <ErrorState message={error} onRetry={reload} /> : null}

          {!loading && !error ? (
            results.length === 0 ? (
              <EmptyState
                title="No scholarships match your filters"
                description={
                  activeFilterCount > 0
                    ? 'Try removing a filter or searching for a different keyword.'
                    : 'There are no listings available at the moment.'
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {results.map((scholarship) => (
                  <ScholarshipCard
                    key={scholarship.id}
                    scholarship={scholarship}
                    saved={savedIds.includes(scholarship.id)}
                    onToggleSave={toggle}
                  />
                ))}
              </div>
            )
          ) : null}
        </div>

        <Pagination
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          total={data?.total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
