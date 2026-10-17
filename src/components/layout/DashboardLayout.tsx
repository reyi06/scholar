import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
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
 * Shared shell for the student and administrator areas: a persistent sidebar
 * on desktop, a slide-over drawer on mobile, and a top bar with notifications
 * and the account menu.
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
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {areaLabel}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={closeDrawer}
          aria-label="Close navigation"
        >
          <Icon name="close" className="size-4" />
        </Button>
      </div>

      <nav aria-label={`${areaLabel} navigation`} className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
              }`
            }
          >
            <Icon name={item.icon} className="size-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-2 dark:border-slate-800">
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Icon name="home" className="size-5 shrink-0" />
          Public site
        </NavLink>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh bg-slate-100 dark:bg-slate-950">
      <a
        href="#dashboard-main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">
        <div className="sticky top-0 h-svh overflow-y-auto">
          <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"
            >
              <Icon name="graduation" className="size-5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-bold text-slate-900 dark:text-white">
                GrantConnect
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{areaLabel} area</span>
            </span>
          </div>
          {sidebar}
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeDrawer}
            className="absolute inset-0 size-full bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="relative z-10 h-full w-72 max-w-[85%] overflow-y-auto bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"
              >
                <Icon name="graduation" className="size-5" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">GrantConnect</span>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={openDrawer}
                aria-label="Open navigation"
              >
                <Icon name="menu" className="size-5" />
              </Button>
              <h1 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                {activeItem?.label ?? areaLabel}
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <NotificationBell notificationsPath={notificationsPath} />
              {user ? (
                <Dropdown
                  label="Account menu"
                  align="right"
                  trigger={<Avatar initials={initials(user.firstName, user.lastName)} className="m-1" />}
                  header={
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  }
                  items={[
                    ...(user.role === 'student'
                      ? [{ label: 'My profile', to: '/student/profile' }]
                      : [{ label: 'Settings', to: '/admin/settings' }]),
                    { label: 'Public site', to: '/' },
                    { label: 'Sign out', onClick: () => void logout(), tone: 'danger' as const },
                  ]}
                />
              ) : null}
            </div>
          </div>
        </header>

        <main id="dashboard-main" className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
