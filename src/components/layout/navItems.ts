import type { IconName } from '../ui/Icon.tsx'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Match the route exactly — used for index routes such as a dashboard. */
  end?: boolean
  /** Sidebar heading this item sits under. Consecutive items share a heading. */
  group: string
}

/**
 * Sidebar navigation.
 *
 * Grouped by what the reader is doing rather than by data model: the student
 * looks for their applications, then their records, then their account. The
 * headings are what make nine links scannable instead of a list to read top to
 * bottom.
 */

/** Sidebar navigation for the student area. */
export const STUDENT_NAV: NavItem[] = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'home', group: 'Overview' },
  { to: '/student/applications', label: 'My Applications', icon: 'file', group: 'Applications' },
  { to: '/student/saved', label: 'Saved Scholarships', icon: 'star', group: 'Applications' },
  { to: '/student/documents', label: 'My Documents', icon: 'inbox', group: 'Records' },
  { to: '/student/semester-registration', label: 'Semester Registration', icon: 'calendar', group: 'Records' },
  { to: '/student/grants', label: 'My Grants', icon: 'award', group: 'Records' },
  { to: '/student/profile', label: 'My Profile', icon: 'user', group: 'Account' },
  { to: '/student/notifications', label: 'Notifications', icon: 'bell', group: 'Account' },
]

/**
 * Where a Google-created account finishes its profile. Kept out of the sidebar:
 * it is a one-time step, not a destination a student returns to.
 */
export const PROFILE_COMPLETION_PATH = '/welcome'

/** Sidebar navigation for the administrator area. */
export const ADMIN_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'home', group: 'Overview' },
  { to: '/admin/applications', label: 'Applications', icon: 'inbox', group: 'Review' },
  { to: '/admin/registrations', label: 'Semester Registrations', icon: 'calendar', group: 'Review' },
  { to: '/admin/grants', label: 'Grant Records', icon: 'award', group: 'Review' },
  { to: '/admin/scholarships', label: 'Scholarships', icon: 'graduation', group: 'Records' },
  { to: '/admin/students', label: 'Students', icon: 'users', group: 'Records' },
  { to: '/admin/documents', label: 'Documents', icon: 'file', group: 'Records' },
  { to: '/admin/announcements', label: 'Announcements', icon: 'megaphone', group: 'Communication' },
  { to: '/admin/support', label: 'Support', icon: 'inbox', group: 'Communication' },
  { to: '/admin/activity', label: 'Activity', icon: 'clock', group: 'System' },
  { to: '/admin/reports', label: 'Reports', icon: 'chart', group: 'System' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings', group: 'System' },
]
