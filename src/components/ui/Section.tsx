import type { ReactNode } from 'react'
import { HelpHint } from './HelpHint.tsx'

export interface SectionProps {
  title?: ReactNode
  /** Folded into a `(?)` beside the title rather than shown permanently. */
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** Draw a hairline divider above the section. Defaults to true. */
  divider?: boolean
}

/**
 * A titled region of a page.
 *
 * This is the default way to group content. It deliberately has no border,
 * background or shadow — grouping comes from the heading and the divider, which
 * keeps pages from turning into a stack of boxes.
 */
export function Section({
  title,
  description,
  actions,
  children,
  className = '',
  divider = true,
}: SectionProps) {
  const hasHeader = Boolean(title || actions)

  return (
    <section
      className={`${divider ? 'border-t border-slate-200 pt-8 dark:border-ink-800' : ''} ${className}`}
    >
      {hasHeader ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {title ? (
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
                {description ? (
                  <HelpHint
                    label={
                      typeof title === 'string' ? `About ${title.toLowerCase()}` : 'About this section'
                    }
                  >
                    {description}
                  </HelpHint>
                ) : null}
              </div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={hasHeader ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}
