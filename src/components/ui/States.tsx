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

/** A small block of skeleton lines, used while a list loads. */
export function LoadingRows({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-label="Loading content">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
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
            Try again
          </Button>
        ) : undefined
      }
    >
      {message ?? 'Something went wrong while loading this section. Please try again.'}
    </Alert>
  )
}
