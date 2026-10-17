import type { InputHTMLAttributes, ReactNode } from 'react'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  id: string
  label: ReactNode
  error?: string
  hint?: string
}

export function Checkbox({ id, label, error, hint, className = '', ...rest }: CheckboxProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-600 dark:bg-slate-800 ${className}`}
          {...rest}
        />
        <label htmlFor={id} className="text-sm text-slate-700 dark:text-slate-200">
          {label}
        </label>
      </div>
      {hint && !error ? (
        <p id={`${id}-hint`} className="pl-7 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-7 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}
