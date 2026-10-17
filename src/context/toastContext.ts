import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  description?: string
}

export interface ToastContextValue {
  toasts: Toast[]
  /** Show a toast. Auto-dismisses unless `sticky` is set. */
  push: (toast: Omit<Toast, 'id'> & { sticky?: boolean }) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Show a transient status message.
 *
 * Toasts confirm real state changes only. Do not use them to claim that an
 * email was sent, a document was uploaded, or a backend was updated when that
 * did not actually happen (business rule 10).
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>.')
  }
  return context
}
