import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext.ts'
import { LoadingState } from '../ui/index.ts'
import type { Role } from '../../types/index.ts'

/**
 * Route guard for a role-specific area.
 *
 * IMPORTANT: this is a navigation convenience, not a security boundary. It stops
 * nobody who knows how to use developer tools. Every rule enforced here is also
 * enforced on the server, which is the boundary that actually holds.
 */
export function ProtectedRoute({ role }: { role: Role }) {
  const { user, initialising, needsProfile } = useAuth()
  const location = useLocation()

  // Over HTTP the session has to be fetched before we can tell signed-in from
  // signed-out. Redirecting during that window would bounce a signed-in user to
  // the login screen on every refresh.
  if (initialising) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-canvas dark:bg-ink-950">
        <LoadingState label="Checking your session…" />
      </div>
    )
  }

  if (!user) {
    // Remember where the user was heading so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // A Google-created account has an email address and nothing else. Everything
  // behind this guard assumes a student profile — matching, applying,
  // registration — so the completion step comes first rather than rendering a
  // shell around data that does not exist.
  if (needsProfile && location.pathname !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }

  if (user.role !== role) {
    // Signed in, but in the wrong area — send them to their own dashboard.
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
  }

  return <Outlet />
}
