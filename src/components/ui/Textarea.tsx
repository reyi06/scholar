import type { TextareaHTMLAttributes } from 'react'
import { Field } from './Field.tsx'
import { controlClasses, describedBy } from './formStyles.ts'

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  label?: string
  error?: string
  hint?: string
}

export function Textarea({
  id,
  label,
  error,
  hint,
  className = '',
  required,
  rows = 4,
  ...rest
}: TextareaProps) {
  const control = (
    <textarea
      id={id}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
      className={controlClasses(Boolean(error), className)}
      {...rest}
    />
  )

  if (!label && !error && !hint) return control

  return (
    <Field htmlFor={id} label={label} error={error} hint={hint} required={required}>
      {control}
    </Field>
  )
}
