import { useState } from 'react'
import { Badge } from '../../components/ui/Badge.tsx'
import { EmptyState } from '../../components/ui/EmptyState.tsx'
import { ErrorState, LoadingList } from '../../components/ui/States.tsx'
import { PageHeader } from '../../components/ui/PageHeader.tsx'
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
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <PageHeader
        title="Announcements"
        description="Notices from the scholarship office — deadlines, advisories and results. Pinned notices stay at the top; everything else is newest first."
        actions={
          <Select
            id="announcement-category"
            label="Category"
            hideLabel
            value={category}
            options={[{ value: 'all', label: 'All Categories' }, ...ANNOUNCEMENT_CATEGORIES]}
            onChange={(event) =>
              setCategory(event.target.value as AnnouncementCategory | 'all')
            }
          />
        }
      />

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
  )
}

function AnnouncementItem({ announcement }: { announcement: Announcement }) {
  return (
    <li className="py-6 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <time
          dateTime={announcement.publishedAt}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {formatDate(announcement.publishedAt)}
        </time>
        <Badge tone={ANNOUNCEMENT_CATEGORY_TONES[announcement.category]}>
          {ANNOUNCEMENT_CATEGORY_LABELS[announcement.category]}
        </Badge>
        {announcement.pinned ? <Badge tone="gold">Pinned</Badge> : null}
      </div>

      <h2 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        {announcement.title}
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm whitespace-pre-line text-slate-600 dark:text-slate-300">
        {announcement.body}
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Posted by {announcement.author}
      </p>
    </li>
  )
}
