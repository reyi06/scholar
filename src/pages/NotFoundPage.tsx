import { Icon, LinkButton } from '../components/ui'
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
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-slate-50 px-6 py-16 text-center dark:bg-slate-950">
      <span
        aria-hidden="true"
        className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white"
      >
        <Icon name="search" className="size-7" />
      </span>

      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-widest text-brand-700 uppercase dark:text-brand-300">
          Error 404
        </p>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Page not found</h1>
        <p className="mx-auto max-w-md text-sm text-slate-600 dark:text-slate-400">
          The page you were looking for does not exist, or the link may be out of date. Try one of the
          destinations below.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Back to home</LinkButton>
        <LinkButton to="/scholarships" variant="outline">
          Scholarship directory
        </LinkButton>
        {user ? (
          <LinkButton to={dashboardPath} variant="ghost">
            My dashboard
          </LinkButton>
        ) : (
          <LinkButton to="/login" variant="ghost">
            Sign in
          </LinkButton>
        )}
      </div>
    </div>
  )
}
