import { LinkButton } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'
import { useAuth } from '../context/authContext.ts'

/**
 * Catch-all page for unknown URLs.
 * Rendered outside the public/student/admin layouts, so it carries its own
 * minimal chrome and always offers a way back into the application.
 */
export function NotFoundPage() {
  useDocumentTitle('Page not found')
  const { user } = useAuth()

  const dashboardPath = user?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-canvas px-5 py-16 text-center dark:bg-ink-950">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
          Error 404
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Page not found
        </h1>
        <p className="mx-auto max-w-sm text-sm text-slate-500 dark:text-slate-400">
          The page you were looking for does not exist, or the link may be out of date.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Back to home</LinkButton>
        <LinkButton to="/scholarships" variant="outline">
          Scholarships
        </LinkButton>
        {user ? (
          <LinkButton to={dashboardPath} variant="ghost">
            My dashboard
          </LinkButton>
        ) : null}
      </div>
    </div>
  )
}
