import { DashboardLayout } from './DashboardLayout.tsx'
import { ADMIN_NAV } from './navItems.ts'

/**
 * Administrator area shell. Routes are nested in `src/App.tsx` behind a
 * `ProtectedRoute role="admin"` guard.
 */
export function AdminLayout() {
  return <DashboardLayout navItems={ADMIN_NAV} areaLabel="Administrator" />
}
