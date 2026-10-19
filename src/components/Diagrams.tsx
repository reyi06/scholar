import { Link } from 'react-router'
import { Badge } from './ui/index.ts'
import type { BadgeTone } from './ui/index.ts'

/**
 * Structural diagrams for the About page.
 *
 * Built from HTML and CSS rather than SVG text on purpose: text inside an SVG
 * scales to illegibility on a phone, cannot be selected or searched, and needs
 * the whole diagram authored by hand. Here the layout is responsive, the labels
 * are real text for assistive technology, and the site map links actually
 * navigate.
 */

interface RoleColumn {
  name: string
  access: string
  note: string
  pages: { to: string; label: string }[]
}

const ROLES: RoleColumn[] = [
  {
    name: 'Public',
    access: 'No account needed',
    note: 'Searching and reading listings is open to everyone.',
    pages: [
      { to: '/', label: 'Home' },
      { to: '/scholarships', label: 'Scholarship directory' },
      { to: '/faqs', label: 'Frequently asked questions' },
      { to: '/about', label: 'About' },
      { to: '/register', label: 'Create an account' },
    ],
  },
  {
    name: 'Student',
    access: 'Student sign-in',
    note: 'Only ever shows the signed-in student their own records.',
    pages: [
      { to: '/student/dashboard', label: 'Dashboard' },
      { to: '/student/profile', label: 'My profile' },
      { to: '/student/saved', label: 'Saved scholarships' },
      { to: '/student/applications', label: 'My applications' },
      { to: '/student/semester-registration', label: 'Semester registration' },
      { to: '/student/grants', label: 'My grants' },
      { to: '/student/notifications', label: 'Notifications' },
    ],
  },
  {
    name: 'Administrator',
    access: 'Administrator sign-in',
    note: 'Publishes listings, reviews submissions, confirms grants.',
    pages: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/scholarships', label: 'Scholarships' },
      { to: '/admin/students', label: 'Students' },
      { to: '/admin/applications', label: 'Applications' },
      { to: '/admin/registrations', label: 'Semester registrations' },
      { to: '/admin/grants', label: 'Grant records' },
      { to: '/admin/announcements', label: 'Announcements' },
      { to: '/admin/reports', label: 'Reports' },
      { to: '/admin/settings', label: 'Settings' },
    ],
  },
]

export function SiteMapDiagram() {
  return (
    <div>
      {/* Root node, with a rail down to the three areas. */}
      <div className="flex flex-col items-center">
        <span className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-100">
          Pampanga GrantConnect
        </span>
        <span aria-hidden="true" className="h-6 w-px bg-slate-300 dark:bg-ink-700" />
      </div>

      <ul className="grid gap-6 sm:grid-cols-3">
        {ROLES.map((role) => (
          <li key={role.name} className="flex flex-col items-center">
            {/* Stub up to the rail, so each column reads as a branch. */}
            <span
              aria-hidden="true"
              className="hidden h-6 w-px bg-slate-300 sm:block dark:bg-ink-700"
            />
            <div className="flex w-full flex-1 flex-col rounded-lg border border-slate-200 bg-white p-5 text-left dark:border-ink-800 dark:bg-ink-900">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{role.name}</h3>
                <Badge tone={role.name === 'Public' ? 'neutral' : 'brand'}>{role.access}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{role.note}</p>

              <ul className="mt-4 space-y-1.5">
                {role.pages.map((page) => (
                  <li key={page.to}>
                    <Link
                      to={page.to}
                      className="text-sm text-slate-600 underline-offset-4 transition-colors hover:text-brand-800 hover:underline dark:text-slate-300 dark:hover:text-brand-300"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        Student and administrator pages ask you to sign in, and only ever show records that belong to
        the signed-in account.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Application lifecycle                                               */
/* ------------------------------------------------------------------ */

interface Stage {
  label: string
  body: string
  tone: BadgeTone
  /** Draw emphasis on the step where money actually moves. */
  decisive?: boolean
}

const STAGES: Stage[] = [
  {
    label: 'Submitted',
    tone: 'info',
    body: 'The application is recorded and given a reference number. From here on you can follow it.',
  },
  {
    label: 'Under review',
    tone: 'brand',
    body: 'An administrator reads it and checks the requirements against the listing.',
  },
  {
    label: 'Needs information',
    tone: 'warning',
    body: 'Something is missing. A note says what, and it appears as your next step until it is resolved.',
  },
  {
    label: 'Approved',
    tone: 'success',
    body: 'The review passed. This is a decision about the application, not a payment.',
  },
  {
    label: 'Declined',
    tone: 'danger',
    body: 'With the reason recorded on the timeline, so you know what to change next time.',
  },
  {
    label: 'Grant record confirmed',
    tone: 'gold',
    decisive: true,
    body: 'An administrator records the amount and term. Only at this point are funds released, and only now does the grant appear under My grants.',
  },
]

export function LifecycleDiagram() {
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-7 dark:border-ink-800">
      {STAGES.map((stage) => (
        <li key={stage.label} className="relative">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[2.19rem] size-2.5 rounded-full ring-4 ring-canvas dark:ring-ink-950 ${
              stage.decisive ? 'bg-gold-500' : 'bg-slate-300 dark:bg-ink-600'
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stage.label}</h3>
            <Badge tone={stage.tone}>{stage.decisive ? 'Releases funds' : 'Review stage'}</Badge>
          </div>
          <p className="mt-1 max-w-[62ch] text-sm text-slate-600 dark:text-slate-300">{stage.body}</p>
        </li>
      ))}
    </ol>
  )
}
