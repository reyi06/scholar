import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { createId } from '../lib/id.ts'
import { ToastContext, type Toast, type ToastContextValue, type ToastTone } from './toastContext.ts'

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-brand-200 bg-brand-50 text-brand-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

const TONE_ICON: Record<ToastTone, string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
}

const TONE_ICON_STYLES: Record<ToastTone, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-rose-600 text-white',
  info: 'bg-brand-600 text-white',
  warning: 'bg-amber-500 text-white',
}

const DISMISS_AFTER_MS = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) {
      window.clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback<ToastContextValue['push']>(
    (toast) => {
      const id = createId('toast')
      setToasts((current) => [
        ...current,
        { id, tone: toast.tone, title: toast.title, description: toast.description },
      ])
      if (!toast.sticky) {
        const timer = window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
        timers.current.set(id, timer)
      }
      return id
    },
    [dismiss],
  )

  const success = useCallback((title: string, description?: string) => push({ tone: 'success', title, description }), [push])
  const error = useCallback((title: string, description?: string) => push({ tone: 'error', title, description }), [push])
  const info = useCallback((title: string, description?: string) => push({ tone: 'info', title, description }), [push])
  const warning = useCallback((title: string, description?: string) => push({ tone: 'warning', title, description }), [push])

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, push, success, error, info, warning, dismiss }),
    [toasts, push, success, error, info, warning, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Fixed region announced to assistive technology as toasts appear. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col gap-2 sm:w-96">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg ${TONE_STYLES[toast.tone]}`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${TONE_ICON_STYLES[toast.tone]}`}
              >
                {TONE_ICON[toast.tone]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-sm opacity-90">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded p-1 text-sm leading-none opacity-60 transition hover:opacity-100"
                aria-label={`Dismiss: ${toast.title}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}
