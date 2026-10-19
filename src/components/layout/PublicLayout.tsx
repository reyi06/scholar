import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { ThemeToggle } from '../ThemeToggle.tsx'
import { useAuth } from '../../context/authContext.ts'
import { initials } from '../../lib/format.ts'
import { Button, Icon, LinkButton } from '../ui/index.ts'
import { Avatar, Dropdown } from './Dropdown.tsx'

const CURRENT_YEAR = new Date().getFullYear()

const NAV_LINKS = [
  { to: '/scholarships', label: 'Scholarships', end: false },
  { to: '/announcements', label: 'Announcements', end: false },
  { to: '/faqs', label: 'FAQs', end: false },
  { to: '/about', label: 'About', end: false },
]

const FOOTER_LINKS = [
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/faqs', label: 'FAQs' },
  { to: '/about', label: 'About' },
  { to: '/login', label: 'Sign In' },
]

/**
 * Shell for the public site.
 *
 * Deliberately plain: a hairline accent rule, a logo, two nav links and one
 * primary action. Everything else belongs on a page.
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
    <div className="flex min-h-svh flex-col bg-canvas dark:bg-ink-950">
      <a
        href="#main"
        className="sr-only-focusable absolute top-2 left-2 z-50 rounded-md bg-brand-700 px-4 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-950/90">
        <div className="accent-rule h-0.5 w-full" aria-hidden="true" />

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded bg-brand-800 text-white"
            >
              <Icon name="graduation" className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Scholar
            </span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'text-brand-800 dark:text-brand-200'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                <LinkButton to={dashboardPath} variant="outline" size="sm" className="hidden sm:inline-flex">
                  {isStudent ? 'My dashboard' : 'Admin area'}
                </LinkButton>
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
                    { label: 'My Dashboard', to: dashboardPath },
                    ...(isStudent ? [{ label: 'My Profile', to: '/student/profile' }] : []),
                    { label: 'Sign Out', onClick: handleLogout, tone: 'danger' as const },
                  ]}
                />
              </>
            ) : (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Sign In
                </LinkButton>
                <LinkButton to="/register" size="sm">
                  Create Account
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
              aria-label="Toggle Navigation Menu"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="size-5" />
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-nav"
            aria-label="Main"
            className="border-t border-slate-200 px-5 py-3 md:hidden dark:border-ink-800"
          >
            <ul className="flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'text-brand-800 dark:text-brand-200'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {CURRENT_YEAR} Scholar
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              {FOOTER_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-slate-500 transition-colors hover:text-brand-800 dark:text-slate-400 dark:hover:text-brand-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  )
}
