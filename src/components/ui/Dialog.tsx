import { useEffect, useId, useRef, type ReactNode } from 'react'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<DialogSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: DialogSize
}

/**
 * Accessible modal dialog.
 *
 * Implemented directly rather than pulling in a dependency, since the
 * requirements are small and well understood:
 *  - `role="dialog"` + `aria-modal` with a labelled title
 *  - Escape closes, clicking the backdrop closes
 *  - focus moves into the dialog on open and returns to the trigger on close
 *  - background scrolling is locked while open
 *  - Tab cycles within the dialog
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined

    previouslyFocused.current = document.activeElement as HTMLElement | null

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button',
    )
    firstField?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/40 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close Dialog"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 size-full cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`relative z-10 w-full ${SIZES[size]} shadow-float max-h-[92vh] overflow-y-auto rounded-t-xl border border-slate-200 bg-white sm:rounded-lg dark:border-ink-800 dark:bg-ink-900`}
      >
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-1 shrink-0 rounded p-1 text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        {children ? <div className="px-5 py-5">{children}</div> : null}

        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-ink-800">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
