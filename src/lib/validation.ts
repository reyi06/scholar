/**
 * Composable, dependency-free form validation.
 *
 * A validator takes the raw string value and returns an error message, or
 * `undefined` when the value is acceptable. Validators are composed into a
 * per-field schema so a form can validate in one pass.
 *
 * All messages are written as complete sentences directed at the student or
 * administrator filling in the form.
 */

export type Validator = (value: string) => string | undefined

/** Map of form field name to its validation errors. */
export type FormErrors<T> = Partial<Record<keyof T, string>>

/** Human-readable label for a field key, e.g. `firstName` -> `First name`. */
export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

/* ------------------------------------------------------------------ */
/* Validators                                                          */
/* ------------------------------------------------------------------ */

export function required(label = 'This field'): Validator {
  return (value) => (value.trim().length > 0 ? undefined : `${label} is required.`)
}

export function minLength(length: number, label = 'This field'): Validator {
  return (value) =>
    value.trim().length >= length ? undefined : `${label} must be at least ${length} characters.`
}

export function maxLength(length: number, label = 'This field'): Validator {
  return (value) =>
    value.trim().length <= length ? undefined : `${label} must be ${length} characters or fewer.`
}

export function emailFormat(): Validator {
  return (value) => {
    if (value.trim().length === 0) return undefined
    // Intentionally permissive: real verification happens server-side.
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
      ? undefined
      : 'Enter a valid email address, for example name@example.com.'
  }
}

export function phoneFormat(): Validator {
  return (value) => {
    const digits = value.replace(/[^\d]/g, '')
    if (value.trim().length === 0) return undefined
    if (!/^[\d\s+()-]+$/.test(value.trim())) {
      return 'Use digits only, optionally with spaces, dashes or a leading +63.'
    }
    return digits.length >= 10 && digits.length <= 13
      ? undefined
      : 'Enter a valid Philippine mobile or landline number (10 to 13 digits).'
  }
}

/** Web URL, restricted to http/https so `javascript:` cannot sneak in. */
export function urlFormat(): Validator {
  return (value) => {
    if (value.trim().length === 0) return undefined
    try {
      const parsed = new URL(value.trim())
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? undefined
        : 'Enter a full web address starting with http:// or https://.'
    } catch {
      return 'Enter a full web address starting with http:// or https://.'
    }
  }
}

export function numberBetween(min: number, max: number, label = 'Value'): Validator {
  return (value) => {
    if (value.trim().length === 0) return undefined
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return `${label} must be a number.`
    if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`
    return undefined
  }
}

/** Decimal within a range, used for GWA (1.00 to 5.00 in PH grading). */
export function decimalBetween(min: number, max: number, label = 'Value'): Validator {
  return (value) => {
    if (value.trim().length === 0) return undefined
    const parsed = Number(value)
    if (Number.isNaN(parsed)) return `${label} must be a number.`
    if (parsed < min || parsed > max) return `${label} must be between ${min} and ${max}.`
    return undefined
  }
}

/** ISO date that must not be in the past. */
export function futureDate(label = 'Date'): Validator {
  return (value) => {
    if (value.trim().length === 0) return undefined
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return `${label} is not a valid date.`
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return parsed.getTime() >= today.getTime() ? undefined : `${label} cannot be in the past.`
  }
}

export function oneOf<T extends string>(allowed: T[], label = 'Selection'): Validator {
  return (value) =>
    allowed.includes(value as T) ? undefined : `Choose a valid ${label.toLowerCase()}.`
}

/** Requires a non-empty list, e.g. at least one education level checkbox. */
export function atLeastOne(items: unknown[], label = 'option'): string | undefined {
  return items.length > 0 ? undefined : `Select at least one ${label}.`
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

/** Run validators in order and return the first failure. */
export function validateValue(value: string, validators: Validator[]): string | undefined {
  for (const validator of validators) {
    const error = validator(value)
    if (error) return error
  }
  return undefined
}

/**
 * Validate a whole form.
 * `values` supplies the raw strings; `schema` maps each field to validators.
 *
 * Accepts any object shape (interfaces included) rather than requiring an index
 * signature, so callers can pass their own typed form state directly.
 */
export function validateForm<T extends object>(
  values: T,
  schema: Partial<Record<keyof T, Validator[]>>,
): FormErrors<T> {
  const errors: FormErrors<T> = {}
  for (const key of Object.keys(schema) as (keyof T)[]) {
    const validators = schema[key]
    if (!validators) continue
    const raw = values[key]
    const error = validateValue(typeof raw === 'string' ? raw : '', validators)
    if (error) errors[key] = error
  }
  return errors
}

export function hasErrors<T>(errors: FormErrors<T>): boolean {
  return Object.values(errors).some(Boolean)
}
