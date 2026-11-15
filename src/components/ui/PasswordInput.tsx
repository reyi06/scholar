import { useState } from 'react'
import { Icon } from './Icon.tsx'
import { Input, type InputProps } from './Input.tsx'

export type PasswordInputProps = Omit<InputProps, 'type' | 'suffix'>

/**
 * A password field with a Show/Hide control.
 *
 * Typing a password blind on a phone is the point of failure this exists for:
 * a mistyped character is invisible, and on account creation it fails twice
 * (field + confirmation) before saying so.
 *
 * The toggle is `type="button"` so it can never submit the form, and it
 * re-enables pointer events because `Input`'s suffix slot is decorative by
 * default. The accessible name contains the visible label, so voice control
 * still works.
 */
export function PasswordInput({ autoComplete = 'current-password', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      suffix={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          title={visible ? 'Hide password' : 'Show password'}
          className="pointer-events-auto -m-1 flex size-6 items-center justify-center rounded text-slate-500 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-slate-400 dark:hover:text-brand-300"
        >
          <Icon name={visible ? 'eye-off' : 'eye'} className="size-4" />
        </button>
      }
    />
  )
}
