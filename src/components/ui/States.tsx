import { Alert } from './Alert.tsx'
import { Button } from './Button.tsx'
import { Skeleton } from './Skeleton.tsx'

/** Centred spinner with an accessible label, for full-section loads. */
export function LoadingState({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`} role="status">
      <span
        aria-hidden="true"
        className="inline-block size-8 animate-spin rounded-full border-[3px] border-brand-600 border-t-transparent"
      />
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

/** A small block of skeleton lines, used while a card or row loads. */
export function LoadingRows({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  )
}

/**
 * Failure state with a retry affordance.
 * Used whenever a data-access call rejects, so the user is never left staring
 * at a blank screen.
 */
export function ErrorState({
  title = 'We could not load this',
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
            Try again
          </Button>
        ) : undefined
      }
    >
      {message ?? 'Something went wrong while loading this section. Please try again.'}
    </Alert>
  )
}
