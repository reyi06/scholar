import type { IconName } from '../ui/Icon.tsx'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Match the route exactly — used for index routes such as a dashboard. */
  end?: boolean
}

/** Sidebar navigation for the student area. */
export const STUDENT_NAV: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/student/profile', label: 'My profile', icon: 'user' },
  { to: '/student/saved', label: 'Saved scholarships', icon: 'star' },
  { to: '/student/applications', label: 'My applications', icon: 'file' },
  { to: '/student/documents', label: 'My documents', icon: 'inbox' },
  { to: '/student/semester-registration', label: 'Semester registration', icon: 'calendar' },
  { to: '/student/grants', label: 'My grants', icon: 'award' },
  { to: '/student/notifications', label: 'Notifications', icon: 'bell' },
]

/**
 * Where a Google-created account finishes its profile. Kept out of the sidebar:
 * it is a one-time step, not a destination a student returns to.
 */
export const PROFILE_COMPLETION_PATH = '/welcome'

/** Sidebar navigation for the administrator area. */
export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'home' },
  { to: '/admin/scholarships', label: 'Scholarships', icon: 'graduation' },
  { to: '/admin/students', label: 'Students', icon: 'users' },
  { to: '/admin/applications', label: 'Applications', icon: 'inbox' },
  { to: '/admin/registrations', label: 'Semester registrations', icon: 'calendar' },
  { to: '/admin/grants', label: 'Grant records', icon: 'award' },
  { to: '/admin/documents', label: 'Documents', icon: 'file' },
  { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone' },
  { to: '/admin/reports', label: 'Reports', icon: 'chart' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]
