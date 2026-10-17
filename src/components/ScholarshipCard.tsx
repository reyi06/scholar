import { Link } from 'react-router'
import { Badge, Button, Card } from './ui/index.ts'
import { DeadlineBadge } from './DeadlineBadge.tsx'
import { StatusBadge } from './StatusBadge.tsx'
import { EDUCATION_LEVEL_LABELS, SCHOLARSHIP_TYPE_LABELS } from '../lib/constants.ts'
import { truncate } from '../lib/format.ts'
import type { Scholarship } from '../types/index.ts'

export interface ScholarshipCardProps {
  scholarship: Scholarship
  /** Omit to hide the bookmark control entirely (public, signed-out views). */
  onToggleSave?: (scholarship: Scholarship) => void
  saved?: boolean
  /** Simpler layout for dense lists such as the saved-scholarships page. */
  compact?: boolean
}

/**
 * The single card used for every scholarship appearance across the site:
 * home page, directory, saved list and student dashboard. Keeps listing
 * styling consistent no matter where it is rendered.
 */
export function ScholarshipCard({ scholarship, onToggleSave, saved = false, compact = false }: ScholarshipCardProps) {
  const detailsPath = `/scholarships/${scholarship.id}`
  const isOpen = scholarship.status === 'open'

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand">{SCHOLARSHIP_TYPE_LABELS[scholarship.type]}</Badge>
              <StatusBadge kind="scholarship" status={scholarship.status} />
              {scholarship.isSample ? <Badge tone="warning">Sample data</Badge> : null}
            </div>
            <h3 className="text-base leading-snug font-semibold text-slate-900 dark:text-white">
              <Link to={detailsPath} className="transition hover:text-brand-700 dark:hover:text-brand-300">
                {scholarship.name}
              </Link>
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{scholarship.provider}</p>
          </div>

          {onToggleSave ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSave(scholarship)}
              aria-pressed={saved}
              aria-label={saved ? `Remove ${scholarship.name} from saved` : `Save ${scholarship.name}`}
              className={saved ? 'text-brand-700 dark:text-brand-300' : ''}
              leadingIcon={<span aria-hidden="true">{saved ? '★' : '☆'}</span>}
            >
              <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
            </Button>
          ) : null}
        </div>

        {!compact ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">{truncate(scholarship.description, 150)}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{scholarship.municipality}</Badge>
          {scholarship.educationLevels.map((level) => (
            <Badge key={level} tone="neutral">
              {EDUCATION_LEVEL_LABELS[level]}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <DeadlineBadge deadline={scholarship.deadline} open={isOpen} />
          <Link
            to={detailsPath}
            className="text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
          >
            View details →
          </Link>
        </div>
      </div>
    </Card>
  )
}
