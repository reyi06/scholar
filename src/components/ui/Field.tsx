import type { ReactNode } from 'react'

export interface FieldProps {
  /** Must match the control's `id` so the label is properly associated. */
  htmlFor?: string
  label?: string
  error?: string
  hint?: string
  required?: boolean
  /** Keep the label for assistive tech but hide it visually (compact toolbars). */
  hideLabel?: boolean
  className?: string
  children: ReactNode
}

/**
 * Label + control + hint + error wrapper.
 *
 * Accessibility contract:
 *  - the label is tied to the control with `htmlFor`
 *  - the error is rendered with `role="alert"` so it is announced
 *  - controls should set `aria-describedby` to `${id}-hint` / `${id}-error`
 */
export function Field({
  htmlFor,
  label,
  error,
  hint,
  required = false,
  hideLabel = false,
  className = '',
  children,
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={
            hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700 dark:text-slate-200'
          }
        >
          {label}
          {required ? (
            <span className="ml-1 text-rose-600 dark:text-rose-400" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
      ) : null}
      {children}
      {hint && !error ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
