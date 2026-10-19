import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation } from 'react-router'

/**
 * Contains a render failure to the content area.
 *
 * React unmounts the whole tree when a render throws, so without this a single
 * bad value anywhere in a page blanks the entire application — including the
 * header, the navigation and any chance of recovering without a reload. That is
 * exactly what a defense cannot afford, and it is also what real users
 * experience as "the site is broken".
 *
 * Placed around the layout's `<Outlet />`, so the shell survives and the student
 * or administrator can navigate somewhere else.
 *
 * This is not a substitute for fixing the error: `componentDidCatch` logs it so
 * the cause is still visible in development.
 */

interface State {
  failed: boolean
}

interface Props {
  children: ReactNode
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the console rather than swallowed: the boundary is a safety net,
    // not a place for errors to disappear.
    console.error('[ui] render error', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children

    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Something Went Wrong
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          This page could not be displayed. The rest of the site still works, so you can carry on
          somewhere else — or reload to try this page again.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-brand-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-800"
          >
            Reload the Page
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 dark:border-ink-700 dark:text-slate-200"
          >
            Go to the Home Page
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
          If this keeps happening, contact the scholarship office and mention the page you were on.
        </p>
      </div>
    )
  }
}

/**
 * Binds the boundary's reset to the current route.
 *
 * A class component cannot call `useLocation`, so the route is used as the
 * `key`: navigating remounts the boundary with fresh state, which clears the
 * error without any state update in a lifecycle method.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  return <ErrorBoundary key={`${location.pathname}${location.search}`}>{children}</ErrorBoundary>
}
