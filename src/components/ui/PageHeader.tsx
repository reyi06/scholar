import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { HelpHint } from './HelpHint.tsx'

export interface Breadcrumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: string
  /** Folded into a `(?)` beside the title rather than shown as a paragraph. */
  description?: ReactNode
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
  className?: string
}

/**
 * Page title block. Restrained by design: one `h1`, an optional explanation
 * behind a `(?)`, and room for a single primary action plus secondary ones.
 */
export function PageHeader({ title, description, actions, breadcrumbs, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-col gap-3 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      /
                    </span>
                  ) : null}
                  {crumb.to && !isLast ? (
                    <Link to={crumb.to} className="transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={isLast ? 'text-slate-600 dark:text-slate-300' : ''}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            {title}
          </h1>
          {description ? (
            <HelpHint label={`About ${title.toLowerCase()}`}>{description}</HelpHint>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
