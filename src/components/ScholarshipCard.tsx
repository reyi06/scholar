import { Link } from 'react-router'
import { DeadlineBadge } from './DeadlineBadge.tsx'
import { Badge } from './ui/index.ts'
import {
  EDUCATION_LEVEL_LABELS,
  SCHOLARSHIP_TYPE_LABELS,
} from '../lib/constants.ts'
import { truncate } from '../lib/format.ts'
import type { Scholarship } from '../types/index.ts'

export interface ScholarshipCardProps {
  scholarship: Scholarship
  /** Omit to hide the bookmark control entirely (public, signed-out views). */
  onToggleSave?: (scholarship: Scholarship) => void
  saved?: boolean
  /** Hides the description for very dense lists. */
  compact?: boolean
}

/**
 * The listing card.
 *
 * Shows only what a student needs to decide whether to open it: who runs it,
 * where it applies, what it is worth, and how long is left. The meta line is
 * the same vocabulary the filters use, so a card answers "is this for me"
 * without opening it.
 */
export function ScholarshipCard({ scholarship, onToggleSave, saved = false, compact = false }: ScholarshipCardProps) {
  const detailsPath = `/scholarships/${scholarship.id}`
  const isOpen = scholarship.status === 'open'
  const headlineBenefit = scholarship.benefits[0]

  // Two levels at most: a card is a summary, and "College, Senior High" reads
  // better than a list that wraps into a third line.
  const levels = scholarship.educationLevels
    .slice(0, 2)
    .map((level) => EDUCATION_LEVEL_LABELS[level])
    .join(', ')

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-float dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-700">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge tone="neutral">{SCHOLARSHIP_TYPE_LABELS[scholarship.type]}</Badge>
            {scholarship.featured ? <Badge tone="gold">Featured</Badge> : null}
            {isOpen ? null : <Badge tone="neutral">Closed</Badge>}
          </div>

          {onToggleSave ? (
            <button
              type="button"
              onClick={() => onToggleSave(scholarship)}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${scholarship.name} from saved` : `Save ${scholarship.name}`}
              className={`relative z-10 -m-1 shrink-0 rounded p-1 transition ${
                saved
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-200'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                {saved ? (
                  <path d="M5 3.5h10a1 1 0 0 1 1 1v12l-6-3.5-6 3.5v-12a1 1 0 0 1 1-1Z" />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M5.5 3.5A1.5 1.5 0 0 0 4 5v11.5l6-3.5 6 3.5V5a1.5 1.5 0 0 0-1.5-1.5h-9Zm.5 1.5h8v8.8l-4-2.33-4 2.33V5Z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
            </button>
          ) : null}
        </div>

        {/* Stretched link keeps the whole card clickable without nesting
            interactive elements. */}
        <h3 className="text-base leading-snug font-semibold text-slate-900 dark:text-slate-100">
          <Link to={detailsPath} className="line-clamp-2 after:absolute after:inset-0">
            {scholarship.name}
          </Link>
        </h3>

        {/* Two lines rather than one flexible row: a wrapped separator used to
            land at the start of a line, and this reads the same at any width. */}
        <p className="text-xs text-slate-900 dark:text-slate-100">
          <span className="block truncate">{scholarship.provider}</span>
          <span className="mt-0.5 block">
            {scholarship.municipality}
            {levels ? ` · ${levels}` : ''}
          </span>
        </p>

        {!compact ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-900 dark:text-slate-100">
            {scholarship.description}
          </p>
        ) : null}

        <div className="mt-auto space-y-3">
          {headlineBenefit ? (
            <p className="flex gap-2 rounded-md bg-brand-50 px-3 py-2 text-sm text-slate-900 dark:bg-brand-950/40 dark:text-slate-100">
              <span className="shrink-0 font-medium text-brand-800 dark:text-brand-200">Benefit</span>
              <span className="min-w-0">{truncate(headlineBenefit, 90)}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-ink-800">
            <DeadlineBadge deadline={scholarship.deadline} open={isOpen} />
            <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-800 dark:text-brand-300">
              View details
              <span
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}
