/**
 * Button styling shared by the `Button` and `LinkButton` components, and by any
 * other element that should look like a button. Kept in its own module so
 * `Button.tsx` exports components only, which React Fast Refresh requires.
 *
 * Deliberately flat: no gradients, minimal radius, no resting shadow. Only the
 * primary variant carries the accent colour.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-300',
  secondary:
    'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 disabled:bg-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600',
  ghost:
    'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-400 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'gap-1.5 px-2.5 py-1.5 text-xs',
  md: 'gap-2 px-3.5 py-2 text-sm',
  lg: 'gap-2 px-4 py-2.5 text-sm',
}

/** Shared class string so links and buttons look identical. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return [
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
