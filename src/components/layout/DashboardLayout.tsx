import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { RouteErrorBoundary } from '../ErrorBoundary.tsx'
import { ThemeToggle } from '../ThemeToggle.tsx'
import { useAuth } from '../../context/authContext.ts'
import { initials } from '../../lib/format.ts'
import { Button, Icon } from '../ui/index.ts'
import { Avatar, Dropdown } from './Dropdown.tsx'
import { NotificationBell } from './NotificationBell.tsx'
import type { NavItem } from './navItems.ts'

export interface DashboardLayoutProps {
  navItems: NavItem[]
  /** Short label for the area, e.g. "Student" or "Administrator". */
  areaLabel: string
  /** Route for the "view all notifications" link, when the area has one. */
  notificationsPath?: string
}

/**
 * Shell for the student and administrator areas.
 *
 * A compact sidebar for navigation, a slim top bar carrying the current page
 * title and account controls, and a single content column. No breadcrumb
 * duplication and no decorative chrome — the work is the page.
 */
export function DashboardLayout({ navItems, areaLabel, notificationsPath }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  /**
   * The drawer is open only for the path it was opened on, so navigating
   * closes it without needing an effect that watches the route.
   */
  const [drawer, setDrawer] = useState<{ open: boolean; path: string }>({
    open: false,
    path: location.pathname,
  })
  const drawerOpen = drawer.open && drawer.path === location.pathname

  const openDrawer = () => setDrawer({ open: true, path: location.pathname })
  const closeDrawer = () => setDrawer({ open: false, path: location.pathname })

  const activeItem = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )

  const sidebar = (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="flex items-center justify-between gap-2 px-2 pb-4">
        <BrandMark />
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={closeDrawer}
          aria-label="Close Navigation"
        >
          <Icon name="close" className="size-4" />
        </Button>
      </div>

      <p className="px-2 pb-2 text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {areaLabel}
      </p>

      <nav aria-label={`${areaLabel} navigation`} className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-brand-50 font-medium text-brand-800 dark:bg-brand-950/60 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-ink-800 dark:hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} className="size-4 shrink-0 opacity-70" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Two links that appear in the same place on every authenticated page:
          the public site, and help. WCAG 2.2 SC 3.2.6 asks for a help
          mechanism in a consistent relative order, and a sidebar footer is the
          one position that is genuinely consistent across roles. */}
      <div className="mt-4 space-y-0.5 border-t border-slate-200 pt-2 dark:border-ink-800">
        <NavLink
          to="/faqs"
          className="flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <Icon name="info" className="size-4 shrink-0 opacity-70" />
          Help
        </NavLink>
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-white"
        >
          <Icon name="home" className="size-4 shrink-0 opacity-70" />
          Public Site
        </NavLink>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh bg-canvas dark:bg-ink-950">
      <a
        href="#dashboard-main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      {/* Sidebar — desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-ink-800 dark:bg-ink-950">
        <div className="sticky top-0 h-svh overflow-y-auto">{sidebar}</div>
      </aside>

      {/* Sidebar — mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close Navigation"
            onClick={closeDrawer}
            className="absolute inset-0 size-full bg-slate-900/40"
          />
          <div className="relative z-10 h-full w-64 max-w-[85%] overflow-y-auto bg-white dark:bg-ink-950">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-950/90">
          <div className="flex items-center justify-between gap-3 px-5 py-3 sm:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 lg:hidden"
                onClick={openDrawer}
                aria-label="Open Navigation"
              >
                <Icon name="menu" className="size-5" />
              </Button>
              {/* Plain text, not a heading: the page itself owns the h1. */}
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {activeItem?.label ?? areaLabel}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <NotificationBell notificationsPath={notificationsPath} />
              {user ? (
                <Dropdown
                  label="Account Menu"
                  align="right"
                  trigger={<Avatar initials={initials(user.firstName, user.lastName)} className="m-0.5" />}
                  header={
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  }
                  items={[
                    ...(user.role === 'student'
                      ? [{ label: 'My Profile', to: '/student/profile' }]
                      : [{ label: 'Settings', to: '/admin/settings' }]),
                    { label: 'Sign Out', onClick: () => void logout(), tone: 'danger' as const },
                  ]}
                />
              ) : null}
            </div>
          </div>
        </header>

        <main id="dashboard-main" className="flex-1 px-5 py-8 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}

/** Brand mark shown at the top of the sidebar. */
function BrandMark() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded bg-brand-800 text-white"
      >
        <Icon name="graduation" className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Scholar
        </span>
      </span>
    </a>
  )
}
