import type { ReactNode } from 'react'
import { HelpHint } from './HelpHint.tsx'

export interface FieldProps {
  /** Must match the control's `id` so the label is properly associated. */
  htmlFor?: string
  label?: string
  error?: string
  /** Shown behind a `(?)` next to the label rather than as a permanent line. */
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
 * The hint is folded into a `(?)` beside the label. Most hints explain
 * something obvious once and are noise on every subsequent visit, so they cost
 * a small icon rather than a line of text. It remains in the DOM, referenced by
 * `aria-describedby`, so nothing is lost to a screen reader.
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
  const showHint = Boolean(hint) && !error

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <div className="flex items-center gap-1.5">
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
          {showHint ? (
            <HelpHint
              id={htmlFor ? `${htmlFor}-hint` : undefined}
              label={label ? `About ${label.toLowerCase()}` : 'More information'}
            >
              {hint}
            </HelpHint>
          ) : null}
        </div>
      ) : null}
      {children}
      {/* Without a visible label there is nowhere to put the icon, so the hint
          stays inline. Rare: only compact filter toolbars hide labels. */}
      {showHint && !label ? (
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
