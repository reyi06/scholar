import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Spinner } from './Spinner.tsx'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles.ts'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a spinner and blocks interaction while an action is in flight. */
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)}
      {...rest}
    >
      {loading ? <Spinner size="sm" label="Working" /> : leadingIcon}
      {children}
      {!loading && trailingIcon ? trailingIcon : null}
    </button>
  )
}

export type LinkButtonProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

/** An anchor styled as a button — use for navigation, never for actions. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, `${fullWidth ? 'w-full' : ''} ${className}`)} {...rest}>
      {children}
    </Link>
  )
}
