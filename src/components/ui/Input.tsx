import type { InputHTMLAttributes, ReactNode } from 'react'
import { Field } from './Field.tsx'
import { controlClasses, describedBy } from './formStyles.ts'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label?: string
  error?: string
  hint?: string
  /** Keep the label for assistive tech but hide it visually. */
  hideLabel?: boolean
  /** Rendered inside the control on the right, e.g. a unit suffix. */
  suffix?: ReactNode
}

export function Input({
  id,
  label,
  error,
  hint,
  hideLabel,
  suffix,
  className = '',
  required,
  ...rest
}: InputProps) {
  const control = (
    <div className="relative">
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClasses(Boolean(error), `${suffix ? 'pr-12' : ''} ${className}`)}
        {...rest}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500 dark:text-slate-400">
          {suffix}
        </span>
      ) : null}
    </div>
  )

  if (!label && !error && !hint) return control

  return (
    <Field htmlFor={id} label={label} error={error} hint={hint} required={required} hideLabel={hideLabel}>
      {control}
    </Field>
  )
}
