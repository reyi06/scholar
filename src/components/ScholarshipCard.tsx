import { Link } from 'react-router'
import { DeadlineBadge } from './DeadlineBadge.tsx'
import { Badge } from './ui/index.ts'
import { SCHOLARSHIP_TYPE_LABELS } from '../lib/constants.ts'
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
 * Shows only what a student needs to decide whether to open it: title,
 * provider, a short description, the headline benefit, the deadline and a way
 * through to the detail page. Everything else lives on the detail page.
 */
export function ScholarshipCard({ scholarship, onToggleSave, saved = false, compact = false }: ScholarshipCardProps) {
  const detailsPath = `/scholarships/${scholarship.id}`
  const isOpen = scholarship.status === 'open'
  const headlineBenefit = scholarship.benefits[0]

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{SCHOLARSHIP_TYPE_LABELS[scholarship.type]}</Badge>
              {scholarship.featured ? <Badge tone="gold">Featured</Badge> : null}
              {isOpen ? null : <Badge tone="neutral">Closed</Badge>}
            </div>

            {/* Stretched link keeps the whole card clickable without nesting
                interactive elements. */}
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              <Link to={detailsPath} className="after:absolute after:inset-0">
                {scholarship.name}
              </Link>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{scholarship.provider}</p>
          </div>

          {onToggleSave ? (
            <button
              type="button"
              onClick={() => onToggleSave(scholarship)}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${scholarship.name} from saved` : `Save ${scholarship.name}`}
              className={`relative z-10 -m-1 shrink-0 rounded p-1 transition-colors ${
                saved ? 'text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300'
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

        {!compact ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{truncate(scholarship.description, 140)}</p>
        ) : null}

        {headlineBenefit ? (
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="text-slate-500 dark:text-slate-400">Benefit: </span>
            {truncate(headlineBenefit, 90)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <DeadlineBadge deadline={scholarship.deadline} open={isOpen} />
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">View details</span>
        </div>
      </div>
    </article>
  )
}
