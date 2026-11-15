import { useState } from 'react'
import { Badge } from '../../components/ui/Badge.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { ErrorState, LoadingList } from '../../components/ui/States.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { announcementsApi } from '../../lib/api.ts'
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from '../../lib/constants.ts'
import { formatDate } from '../../lib/format.ts'
import type { Announcement, AnnouncementCategory } from '../../types/index.ts'
import { ANNOUNCEMENT_CATEGORY_TONES } from '../../lib/tones.ts'

/**
 * The announcement channel.
 *
 * One chronological list rather than a card per notice: the date, the category
 * and the title carry it, and an advisory is read once rather than browsed.
 *
 * The category is the reason this page exists. A deadline and a result are
 * acted on differently, and a channel that mixes them forces every reader to
 * parse the body to discover which one they are looking at.
 */

export function AnnouncementsPage() {
  useDocumentTitle('Announcements')
  const [category, setCategory] = useState<AnnouncementCategory | 'all'>('all')

  const state = useAsync(() => announcementsApi.list(undefined, category), [category])
  const announcements = state.data ?? []

  return (
    <>
      {/* The channel wears the same band as the home page: gold eyebrow, serif
          title, and the one control that matters sitting on the band itself. */}
      <section className="bg-brand-800 dark:bg-ink-900">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
          <p className="text-xs font-medium tracking-[0.18em] text-gold-300 uppercase">
            Updates
          </p>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Announcements
          </h1>
          <p className="mt-3 max-w-xl text-sm text-brand-100 sm:text-base">
            Deadlines, advisories and results from the scholarship office, newest first.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-4 flex justify-end">
          <Select
            id="announcement-category"
            label="Category"
            hideLabel
            value={category}
            options={[{ value: 'all', label: 'All Categories' }, ...ANNOUNCEMENT_CATEGORIES]}
            onChange={(event) =>
              setCategory(event.target.value as AnnouncementCategory | 'all')
            }
            className="w-full bg-white sm:w-52 dark:bg-ink-900"
          />
        </div>

        {state.loading ? <LoadingList /> : null}
        {state.error ? <ErrorState message={state.error} onRetry={state.reload} /> : null}

        {!state.loading && !state.error && announcements.length === 0 ? (
          <EmptyState
            title={
              category === 'all' ? 'Nothing Published Yet' : 'Nothing in This Category'
            }
            description={
              category === 'all'
                ? 'Announcements from the scholarship office will appear here.'
                : 'Try another category, or check back later.'
            }
          />
        ) : null}

        {!state.loading && !state.error && announcements.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-ink-800">
            {announcements.map((announcement) => (
              <AnnouncementItem key={announcement.id} announcement={announcement} />
            ))}
          </ul>
        ) : null}
      </div>
    </>
  )
}

function AnnouncementItem({ announcement }: { announcement: Announcement }) {
  return (
    <li className="grid gap-2 py-6 first:pt-0 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-6">
      <div className="flex flex-wrap items-center gap-2 sm:block">
        <time
          dateTime={announcement.publishedAt}
          className="text-sm text-slate-900 sm:block dark:text-slate-100"
        >
          {formatDate(announcement.publishedAt)}
        </time>
        <div className="flex flex-wrap gap-1 sm:mt-1.5">
          <Badge tone={ANNOUNCEMENT_CATEGORY_TONES[announcement.category]}>
            {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
          </Badge>
          {announcement.pinned ? <Badge tone="gold">Pinned</Badge> : null}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {announcement.title}
        </h2>
        <p className="mt-1.5 max-w-[68ch] text-sm leading-relaxed whitespace-pre-line text-slate-900 dark:text-slate-100">
          {announcement.body}
        </p>
        <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
          Posted by {announcement.author}
        </p>
      </div>
    </li>
  )
}
