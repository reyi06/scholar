import { useId, useState, type ReactNode } from 'react'

/**
 * A small `(?)` that reveals an explanation on hover, focus or tap.
 *
 * The point is to keep the explanation available without it being read at every
 * visit. A form hint like "What you would call this document" is useful once
 * and noise afterwards; behind a question mark it costs four pixels instead of
 * a line of text.
 *
 * Deliberately a real button rather than a `title` attribute: `title` is
 * unreachable by keyboard, invisible on touch, and slow to appear. This one
 * responds to hover, focus and click, closes on Escape, and is announced with
 * `aria-describedby`, so the text is still there for a screen reader.
 */
export interface HelpHintProps {
  /** Optional explicit id, so a control's `aria-describedby` can point here. */
  id?: string
  /** Accessible name for the button. */
  label?: string
  children: ReactNode
}

export function HelpHint({ id, label = 'More information', children }: HelpHintProps) {
  const generatedId = useId()
  const tooltipId = id ?? generatedId
  const [open, setOpen] = useState(false)

  return (
    <span className="group/help relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={tooltipId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className="inline-flex size-4 items-center justify-center rounded-full border border-slate-300 text-[10px] leading-none font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 focus-visible:border-brand-700 focus-visible:text-brand-800 dark:border-ink-700 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:text-brand-300"
      >
        ?
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className={`absolute top-full left-0 z-30 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-slate-600 shadow-float transition-opacity duration-100 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-300 ${
          open
            ? 'opacity-100'
            : 'pointer-events-none opacity-0 group-hover/help:opacity-100 group-focus-within/help:opacity-100'
        }`}
      >
        {children}
      </span>
    </span>
  )
}
