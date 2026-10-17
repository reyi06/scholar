import type { SelectHTMLAttributes } from 'react'
import { Field } from './Field.tsx'
import { controlClasses, describedBy } from './formStyles.ts'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> {
  id: string
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  /** Optional label for the empty/default option. */
  placeholder?: string
}

export function Select({
  id,
  label,
  error,
  hint,
  options,
  placeholder,
  className = '',
  required,
  ...rest
}: SelectProps) {
  const control = (
    <select
      id={id}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={controlClasses(Boolean(error), `pr-8 ${className}`)}
      {...rest}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )

  if (!label && !error && !hint) return control

  return (
    <Field htmlFor={id} label={label} error={error} hint={hint} required={required}>
      {control}
    </Field>
  )
}
