import type { ReactNode } from 'react'
import { Icon } from './Icon.tsx'

export interface AccordionItem {
  id: string
  /** Short label above the title, typically a date. */
  meta?: ReactNode
  title: ReactNode
  content: ReactNode
  defaultOpen?: boolean
}

export interface AccordionProps {
  items: AccordionItem[]
  className?: string
}

/**
 * Disclosure list built on the native `<details>` element.
 *
 * Using the platform element means keyboard interaction, screen-reader
 * semantics and in-page find-while-collapsed all work without extra code.
 * The rotating marker is styled by `.disclosure-marker` in `src/index.css`.
 */
export function Accordion({ items, className = '' }: AccordionProps) {
  return (
    <div className={`divide-y divide-slate-200 dark:divide-slate-800 ${className}`}>
      {items.map((item) => (
        <details key={item.id} open={item.defaultOpen} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 transition hover:text-brand-700 dark:hover:text-brand-300">
            <span className="min-w-0">
              {item.meta ? (
                <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
                  {item.meta}
                </span>
              ) : null}
              <span className="mt-0.5 block text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </span>
            </span>
            <Icon
              name="arrow-right"
              className="disclosure-marker mt-1 size-4 shrink-0 text-slate-400"
            />
          </summary>
          <div className="pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {item.content}
          </div>
        </details>
      ))}
    </div>
  )
}
