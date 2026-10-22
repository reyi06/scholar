import { Alert } from './Alert.tsx'
import { Button } from './Button.tsx'
import { Skeleton } from './Skeleton.tsx'

/** Centred spinner with an accessible label, for full-section loads. */
export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-14 ${className}`} role="status">
      <span
        aria-hidden="true"
        className="inline-block size-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

/**
 * Page-shaped placeholders.
 *
 * A spinner tells the student only that something is happening; these keep the
 * page's own shape on screen, so the layout does not jump when the data lands.
 * Each one follows an existing composition — card grid, divided list, table,
 * detail block, dashboard — rather than inventing a new skeleton vocabulary.
 */

/** Plain card shapes, without their own status wrapper. */
function CardPlaceholders({ count, className = '' }: { count: number; className?: string }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-slate-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900"
        >
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-4 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Placeholder for a grid of scholarship or document cards. */
export function LoadingCards({ count = 4, className = '' }: { count?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading content" className={className}>
      <CardPlaceholders count={count} />
    </div>
  )
}

/** Placeholder for a divided list of rows — announcements, notifications, records. */
export function LoadingList({ rows = 5, className = '' }: { rows?: number; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`divide-y divide-slate-200 dark:divide-ink-800 ${className}`}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Placeholder for a bordered table with a header row. */
export function LoadingTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div
      role="status"
      aria-label="Loading table"
      className={`overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-900 ${className}`}
    >
      {/* Same minimum width as `Table`, so a phone scrolls rather than squeezing
          six columns into an unreadable row of pills. */}
      <div className="min-w-[44rem]">
        <div className="flex gap-6 border-b border-slate-200 px-4 py-3 dark:border-ink-800">
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} className="h-3 flex-1" />
          ))}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-ink-800">
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="flex gap-6 px-4 py-4">
              {Array.from({ length: columns }).map((_, column) => (
                <Skeleton key={column} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Placeholder for a record page: title, meta line, prose and a definition block. */
export function LoadingDetail({ className = '' }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading content" className={`space-y-8 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-slate-200 p-4 dark:border-ink-800">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Placeholder for a dashboard: a summary row, then recent activity. */
export function LoadingDashboard({ className = '' }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading page" className={`space-y-10 ${className}`}>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-y border-slate-200 py-6 sm:grid-cols-4 dark:border-ink-800">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Whole-page placeholder for route-level code splitting, when the layout is not
 * on screen yet. Shaped like a public content page.
 */
export function LoadingPage() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-4 h-8 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <CardPlaceholders count={4} className="mt-10" />
    </div>
  )
}

/** Failure state with a retry affordance. */
export function ErrorState({
  title = 'Could not load this',
  message,
  onRetry,
  className = '',
}: {
  title?: string
  message?: string | null
  onRetry?: () => void
  className?: string
}) {
  return (
    <Alert
      tone="danger"
      title={title}
      className={className}
      actions={
        onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        ) : undefined
      }
    >
      {message ?? 'Something went wrong while loading this section. Please try again.'}
    </Alert>
  )
}
