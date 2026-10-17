import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../../context/authContext.ts'
import type { Role } from '../../types/index.ts'

/**
 * Route guard for a role-specific area.
 *
 * IMPORTANT: this is a navigation convenience, not a security boundary. The
 * whole application runs in the browser, so a determined user can bypass it.
 * Every rule enforced here must be enforced again by a real backend
 * (business rule 6 and business rule 10).
 */
export function ProtectedRoute({ role }: { role: Role }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Remember where the user was heading so login can send them back.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (user.role !== role) {
    // Signed in, but in the wrong area — send them to their own dashboard.
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />
  }

  return <Outlet />
}
