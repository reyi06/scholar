import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '../ui/Icon.tsx'

export interface MenuItem {
  label: string
  to?: string
  onClick?: () => void
  tone?: 'default' | 'danger'
}

/**
 * Accessible dropdown menu.
 *
 * Closes on Escape, on outside click, and after an item is chosen. Both the
 * trigger and the items are keyboard reachable.
 */
export function Dropdown({
  trigger,
  items = [],
  children,
  align = 'right',
  label,
  header,
  footer,
}: {
  trigger: ReactNode
  items?: MenuItem[]
  /** Custom panel content rendered above the menu items. */
  children?: ReactNode
  align?: 'left' | 'right'
  label: string
  header?: ReactNode
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex items-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={label}
          className={`absolute z-40 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-float dark:border-slate-800 dark:bg-slate-900 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {header ? (
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">{header}</div>
          ) : null}

          {children}

          {items.length > 0 ? (
            <div className="py-1">
              {items.map((item) =>
                item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 px-4 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      item.tone === 'danger'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false)
                      item.onClick?.()
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      item.tone === 'danger'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          ) : null}

          {footer ? (
            <div className="border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Initials avatar used in the header and dashboards.
 *
 * The initials are rendered through a pseudo-element rather than as text
 * content, so the surrounding control's accessible name comes from its own
 * label instead of the initials. Without this, an avatar button reads as
 * "Account menu" while showing "LM", which accessibility audits flag as a
 * visible-text/name mismatch.
 */
export function Avatar({ initials, className = '' }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-initials={initials}
      className={`flex size-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 after:content-[attr(data-initials)] dark:bg-brand-950/60 dark:text-brand-200 ${className}`}
    />
  )
}

export { Icon }
