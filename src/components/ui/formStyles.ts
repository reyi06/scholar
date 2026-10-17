/**
 * Shared form-control styling and ARIA helpers.
 *
 * These live outside the component files so that each component file exports
 * components only — which is what React Fast Refresh requires.
 */

/** Base control styling shared by input, select and textarea. */
export function controlClasses(invalid: boolean, extra = ''): string {
  return [
    'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition',
    'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800',
    invalid ? 'border-rose-400 dark:border-rose-500' : 'border-slate-300 dark:border-slate-700',
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
