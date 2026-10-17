/**
 * Loading spinner. Sizes match the Button sizes so it can sit inline in a
 * button without shifting the layout.
 */
export type SpinnerSize = 'sm' | 'md' | 'lg'

const SIZES: Record<SpinnerSize, string> = {
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-9 border-[3px]',
}

export function Spinner({
  size = 'md',
  className = '',
  label = 'Loading',
}: {
  size?: SpinnerSize
  className?: string
  label?: string
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZES[size]} ${className}`}
    />
  )
}
