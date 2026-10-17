import { DashboardLayout } from './DashboardLayout.tsx'
import { STUDENT_NAV } from './navItems.ts'

/** Student area shell. Routes are nested in `src/App.tsx`. */
export function StudentLayout() {
  return (
    <DashboardLayout
      navItems={STUDENT_NAV}
      areaLabel="Student"
      notificationsPath="/student/notifications"
    />
  )
}
