/**
 * Shared form-control styling and ARIA helpers.
 *
 * These live outside the component files so that each component file exports
 * components only — which is what React Fast Refresh requires.
 */

/** Base control styling shared by input, select and textarea. */
export function controlClasses(invalid: boolean, extra = ''): string {
  return [
    'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 transition-colors',
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800',
    invalid
      ? 'border-rose-300 dark:border-rose-700'
      : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Build the `aria-describedby` value for a control so screen readers announce
 * the hint and/or the error alongside the field.
 */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  const ids: string[] = []
  if (hint && !error) ids.push(`${id}-hint`)
  if (error) ids.push(`${id}-error`)
  return ids.length > 0 ? ids.join(' ') : undefined
}
