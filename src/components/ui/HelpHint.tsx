import { useId, useRef, useState, type ReactNode } from 'react'

/**
 * A small `(?)` that reveals an explanation on hover, focus or tap.
 *
 * The point is to keep the explanation available without it being read at every
 * visit. A form hint like "What you would call this document" is useful once
 * and noise afterwards; behind a question mark it costs four pixels instead of
 * a line of text.
 *
 * Positioned against the viewport rather than the icon. An absolutely
 * positioned tooltip anchored `left: 0` to a label near the right edge extends
 * past the document and creates a horizontal scrollbar on a phone — which is
 * exactly what a responsive check caught. A fixed box, clamped to the viewport,
 * cannot do that.
 *
 * When closed the text is rendered `sr-only`, so it stays in the accessibility
 * tree and `aria-describedby` still resolves.
 */

const WIDTH = 256
const EDGE = 8

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
  const button = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  function show() {
    const element = button.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    // Keep the whole box on screen, even for a label that ends at the edge.
    const left = Math.min(Math.max(EDGE, rect.left), window.innerWidth - WIDTH - EDGE)
    setPosition({ top: rect.bottom + EDGE, left })
  }

  function hide() {
    setPosition(null)
  }

  return (
    <span className="inline-flex">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-expanded={position !== null}
        aria-describedby={tooltipId}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (position ? hide() : show())}
        onKeyDown={(event) => {
          if (event.key === 'Escape') hide()
        }}
        className="inline-flex size-4 items-center justify-center rounded-full border border-slate-300 text-[10px] leading-none font-semibold text-slate-500 transition-colors hover:border-slate-400 hover:text-slate-700 focus-visible:border-brand-700 focus-visible:text-brand-800 dark:border-ink-700 dark:text-slate-400 dark:hover:text-slate-200 dark:focus-visible:text-brand-300"
      >
        ?
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        style={position ? { top: position.top, left: position.left, width: WIDTH } : undefined}
        className={
          position
            ? 'fixed z-50 rounded-md border border-slate-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-slate-600 shadow-float dark:border-ink-700 dark:bg-ink-900 dark:text-slate-300'
            : 'sr-only'
        }
      >
        {children}
      </span>
    </span>
  )
}
