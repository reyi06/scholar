import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { DemoBanner } from '../DemoBanner.tsx'
import { useAuth } from '../../context/authContext.ts'
import { initials } from '../../lib/format.ts'
import { Button, Icon, LinkButton } from '../ui/index.ts'
import { Avatar, Dropdown } from './Dropdown.tsx'

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/scholarships', label: 'Scholarships', end: false },
  { to: '/about', label: 'About', end: false },
]

/**
 * Shell for the public site: header, navigation, demo disclosure and footer.
 * The header collapses into a disclosure panel on small screens.
 */
export function PublicLayout() {
  const { user, logout, isAdmin, isStudent } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const dashboardPath = isAdmin ? '/admin/dashboard' : '/student/dashboard'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <a
        href="#main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      <DemoBanner />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white"
            >
              <Icon name="graduation" className="size-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">
                Pampanga GrantConnect
              </span>
              <span className="hidden text-xs text-slate-500 sm:block dark:text-slate-400">
                Scholarship information &amp; grant management
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <LinkButton to={dashboardPath} variant="outline" size="sm" className="hidden sm:inline-flex">
                  {isStudent ? 'My dashboard' : 'Admin area'}
                </LinkButton>
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
                    { label: 'My dashboard', to: dashboardPath },
                    ...(isStudent ? [{ label: 'My profile', to: '/student/profile' }] : []),
                    { label: 'Sign out', onClick: handleLogout, tone: 'danger' as const },
                  ]}
                />
              </>
            ) : (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton to="/register" size="sm">
                  Create account
                </LinkButton>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label="Toggle navigation menu"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="size-5" />
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-950"
          >
            <ul className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
              {user ? (
                <li>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {isStudent ? 'My dashboard' : 'Admin area'}
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Pampanga GrantConnect</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              A demonstration platform for consolidating scholarship information and tracking student
              grants across the province of Pampanga.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Explore</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link to="/scholarships" className="text-slate-500 transition hover:text-brand-700 dark:text-slate-400">
                  Scholarship directory
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-slate-500 transition hover:text-brand-700 dark:text-slate-400">
                  How this system works
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-slate-500 transition hover:text-brand-700 dark:text-slate-400">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Important</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This is a prototype using sample data. It is not affiliated with any government agency or
              scholarship provider, and it does not process real applications.
            </p>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 dark:border-slate-800">
          <p className="mx-auto max-w-7xl px-4 text-xs text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
            Demonstration build · No backend connected · Data is stored only in your browser
          </p>
        </div>
      </footer>
    </div>
  )
}
