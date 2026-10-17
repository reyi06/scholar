# Pampanga GrantConnect

A web-based scholarship information and student grant management system for the
province of Pampanga, Philippines.

Built with React, Vite, TypeScript and Tailwind CSS. The interface runs entirely
in the browser against a local data store; no backend is connected yet, so
`src/lib/api.ts` is the seam where one would be added.

Scholarship listings currently shipped with the application are placeholder
records used to populate the interface. Replace them with verified provider
information before publishing.

---

## Contents

- [Stack](#stack)
- [Getting started](#getting-started)
- [Local data layer](#local-data-layer)
- [Test accounts](#test-accounts)
- [Environment variables](#environment-variables)
- [Route documentation](#route-documentation)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Connecting a real backend](#connecting-a-real-backend)
- [Product rules](#product-rules)
- [Current scope](#current-scope)

---

## Stack

| Tool          | Version |
| ------------- | ------- |
| React         | 19.3    |
| Vite          | 8.3     |
| Tailwind CSS  | 4.3     |
| TypeScript    | 6.0     |
| React Router  | 8.4     |
| oxlint        | 1.88    |

Dependencies are deliberately minimal: React, React DOM and React Router are the
only runtime packages. Icons, CSV export, dialogs, tables and form validation
are all implemented in this repository rather than pulled in.

## Getting started

```bash
npm install     # install dependencies
npm run dev     # start the dev server at http://localhost:5173
```

| Script            | Purpose                                |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Dev server with hot module replacement |
| `npm run build`   | Type-check, then build to `dist/`      |
| `npm run preview` | Serve the production build locally     |
| `npm run lint`    | Lint with oxlint                       |

There is no test runner configured.

## Data layer

The interface never reads the database directly. `src/lib/api.ts` is the single
seam; every screen calls it.

Two backends are supported, chosen at startup by `VITE_API_BASE_URL`:

| `VITE_API_BASE_URL` | Behaviour |
| ------------------- | --------- |
| *unset*             | Browser storage. Every visitor gets their own copy of the records in `localStorage`; nothing is shared or durable. Useful for previewing the interface. |
| `/api`              | The local API server and SQLite database described below. |

### Local database (Prisma + SQLite)

A small dependency-free Node API server (`server/index.ts`) owns the SQLite
file. The browser never receives database credentials, and every authorisation
rule — who may read an application, who may confirm a grant — is decided on the
server, per request.

```bash
cp .env.example .env     # DATABASE_URL, API_PORT, VITE_API_BASE_URL
npm run db:migrate       # create prisma/dev.db from prisma/schema.prisma
npm run db:seed          # load the placeholder records
npm run server           # API on :8787
npm run dev              # front end on :5173, proxying /api to the server
```

Useful extras: `npm run db:studio` (browse the data) and `npm run db:reset`
(drop and re-migrate).

Security properties this gives you that browser storage could not:

- passwords are stored as **scrypt hashes** (`server/passwords.ts`), not plain text
- sessions are **httpOnly cookies**; the browser holds only an opaque id
- a student's list of applications is **scoped to that student on the server**
- role checks run on the server, so they cannot be bypassed with developer tools
- login returns an identical message for a wrong password and an unknown email,
  so accounts cannot be enumerated

> **Scope of the API so far.** It covers authentication, scholarships, saved
> listings and applications. Registrations, grants, announcements,
> notifications, students, settings and the administrator write operations are
> not exposed yet, so the front end still runs against browser storage unless
> `VITE_API_BASE_URL` is set. See [Current scope](#current-scope).

## Test accounts

Sign-in uses the seeded accounts listed below. Passwords are stored in plain text
in the data layer because there is no backend yet; replace this with server-side
verification before deploying.

| Role          | Email                       | Password     |
| ------------- | --------------------------- | ------------ |
| Student       | `maria.santos@example.com`  | `student123` |
| Administrator | `admin@example.com`         | `admin123`   |

The login screen lists both accounts and can fill them in with one click.
Additional student accounts exist in `src/data/sampleData.ts`
(`juan.delacruz@`, `ana.reyes@`, `paolo.bautista@` — all `@example.com`, all with
the password `student123`).

## Environment variables

**None are required.** The application runs with no configuration.

If you connect a backend, follow this convention — Vite only exposes variables
prefixed with `VITE_`, and every one of them ends up in the client bundle, so
**never put secrets in them**:

```bash
# .env.local  (not committed)
VITE_API_BASE_URL=https://api.example.gov.ph
VITE_USE_MOCK_API=false
```

`.env` and `.env.local` are not committed. Read values with
`import.meta.env.VITE_API_BASE_URL` and always provide a sensible fallback so
the app still boots in demo mode.

## Route documentation

### Public

| Route               | Page                        | Purpose                                                                                       |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                 | Home                        | Hero, search, featured opportunities, categories, deadlines, calls to action                   |
| `/scholarships`     | Scholarship directory       | Search, filter and paginate every published listing                                            |
| `/scholarships/:id` | Scholarship details         | Provider, eligibility, benefits, requirements, deadline, contact details, application instructions |
| `/login`            | Login                       | Sign-in for students and administrators                                                        |
| `/register`         | Student registration        | Create a student account                                                                        |
| `/about`            | About                       | Scope, limitations, route reference and security notes                                          |

### Student (sign-in required, student role)

| Route                              | Page                  | Purpose                                                        |
| ---------------------------------- | --------------------- | -------------------------------------------------------------- |
| `/student/dashboard`               | Dashboard             | Counts, applications in progress, closing deadlines, announcements |
| `/student/profile`                 | Profile               | Personal, enrolment and guardian details                        |
| `/student/saved`                   | Saved scholarships    | Bookmarked listings                                             |
| `/student/applications`            | Applications          | All internally submitted applications, grouped by status        |
| `/student/applications/:id`        | Application details   | Timeline, review notes, withdraw or complete a draft            |
| `/student/semester-registration`   | Semester registration | Re-registration for existing grantees only                      |
| `/student/grants`                  | My grants             | Confirmed grant records only                                    |
| `/student/notifications`           | Notifications         | In-app notifications                                            |

### Administrator (sign-in required, administrator role)

| Route                              | Page                       | Purpose                                         |
| ---------------------------------- | -------------------------- | ----------------------------------------------- |
| `/admin/dashboard`                 | Dashboard                  | Key figures and items needing attention         |
| `/admin/scholarships`              | Scholarship management     | Manage all listings including drafts            |
| `/admin/scholarships/new`          | Create scholarship         | New listing                                     |
| `/admin/scholarships/:id/edit`     | Edit scholarship           | Amend an existing listing                       |
| `/admin/students`                  | Student management         | Student records and profile review              |
| `/admin/applications`              | Application management     | Review submissions and record decisions         |
| `/admin/registrations`             | Registration management    | Verify or reject semester registrations         |
| `/admin/grants`                    | Grant records              | Confirm and manage grant records                |
| `/admin/announcements`             | Announcements              | Publish and manage announcements                |
| `/admin/reports`                   | Reports                    | Breakdowns with filters and CSV export          |
| `/admin/settings`                  | Settings                   | Platform settings and record controls           |

Any other URL renders the 404 page.

## Project structure

```
src/
├── App.tsx                  # Route table
├── main.tsx                 # Entry: BrowserRouter + providers
├── index.css                # Tailwind import + design tokens
├── types/index.ts           # Every domain model
├── data/
│   ├── sampleData.ts        # Seed records for the local store
│   └── schema.ts            # Local store shape + seed builder
├── lib/
│   ├── api.ts               # Data-access layer (the backend seam)
│   ├── storage.ts           # localStorage wrapper
│   ├── constants.ts         # Option lists and label maps
│   ├── format.ts            # Date, currency and text formatting
│   ├── validation.ts        # Composable validators
│   ├── csv.ts               # CSV export for reports
│   └── id.ts                # Id / reference-number helpers
├── hooks/                   # useAsync, useAsyncAction, useDebouncedValue, useSavedScholarships
├── context/                 # Auth and toast providers
├── components/
│   ├── ui/                  # Reusable design-system primitives
│   ├── layout/              # Navbars, sidebars, route guards
│   ├── ScholarshipCard.tsx  # Shared listing card
│   ├── StatusBadge.tsx      # Domain status → coloured badge
│   └── DeadlineBadge.tsx    # Deadline urgency indicator
└── pages/
    ├── public/              # Public routes
    ├── student/             # Student routes
    ├── admin/               # Administrator routes
    └── NotFoundPage.tsx
```

## Architecture

**Design system.** `src/components/ui/index.ts` is the barrel every page imports
from. Tokens live in `src/index.css` under Tailwind v4's `@theme` block, so there
is no `tailwind.config.js`. Adding `--color-x` there immediately creates
`bg-x`, `text-x`, `border-x` and so on.

**Visual language.** The interface is quiet by design:

- **One accent — maroon** (`brand-*`). `bg-brand-700` for solid primary
  buttons, `text-brand-800` for accent text and links. **Gold** (`gold-*`) is
  reserved for "Featured"/"Pinned" markers and the masthead rule. No other hues.
- **Near-white canvas, flat surfaces.** `rounded-lg border border-slate-200
  bg-white` with no resting shadow. The only shadow token is `shadow-float`,
  used by `Dialog`.
- **Group with `Section`, not `Card`.** Pages read as titled sections separated
  by hairlines. `Card` is reserved for forms and genuinely distinct panels.
- **Metrics are text.** `StatCard` is a label and a value with no card chrome,
  and takes no `icon`. Group several in a bordered band or with `StatRow`.
- **One primary action per page;** everything else is `outline` or `ghost`.
- **Dark mode is class-based and user-toggleable** (see `AGENTS.md`). Every text
  colour needs its `dark:` counterpart — a light-only `text-slate-500` fails
  contrast on `slate-950`.
- **Progressive disclosure** via `Accordion`, `Dialog`, `Tabs` and `hideLabel`
  for compact filter toolbars.

Layout containers: `PublicLayout` does not pad its `<main>`, so public pages
supply their own `mx-auto max-w-6xl px-5 py-8 sm:px-8`. `DashboardLayout`
already applies that container to every student and admin page, so those pages
must **not** repeat it.

**Data access.** Pages never import sample data directly. They call
`src/lib/api.ts`, which returns promises, and track the result with the
`useAsync` hook. That gives every screen consistent loading, error and empty
states, and means a backend can be introduced without touching page code.

**State.** There is no global store. Each page loads what it needs on mount, so
data is always fresh after a mutation. Auth and toasts are the only React
contexts.

**Forms.** `src/lib/validation.ts` provides composable validators
(`required()`, `emailFormat()`, `minLength()` …) combined with `validateForm`.
Errors are rendered inline and associated with their control through
`aria-describedby`.

## Connecting a real backend

1. Add `VITE_API_BASE_URL` (see [Environment variables](#environment-variables)).
2. Keep `src/types/index.ts` as the contract.
3. In `src/lib/api.ts`, replace the body of each method with a `fetch` call.
   The signatures are already async and already throw `Error` with
   user-presentable messages.
4. Move the seeded sign-in credentials out of the client and verify them
   server-side.
5. Enforce every rule server-side, especially ownership on application reads,
   role checks, and the rule that a grant requires explicit confirmation.

## Product rules

These rules are enforced in code. Treat them as regression risks.

| #   | Rule                                                                                              | Where                                                        |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Placeholder listings must be replaced with verified provider data before publishing                | `src/data/sampleData.ts`                                     |
| 2   | Internal vs externally handled applications are distinguished                                      | `Scholarship.applicationMode`, applications pages             |
| 3   | External application links are shown when supplied                                                 | `ScholarshipDetailPage`                                      |
| 4   | A pending/approved application never becomes a grant automatically                                 | `grantsApi.confirmFromApplication` is the only path; `awaitingGrantConfirmation()` surfaces the gap |
| 5   | Semester registration is for existing grantees and tracked separately                              | `SemesterRegistrationPage`, `registrationsApi`               |
| 6   | Only administrators manage listings, review submissions and grant records                          | `ProtectedRoute role="admin"` + admin-only routes            |
| 7   | Students only see and modify their own private records                                             | `applicationsApi.get(id, studentId)` ownership check         |
| 8   | Private records are not reachable from public routes                                               | No private data is fetched on public pages                   |
| 9   | Realistic empty states and validation messages, no fake successes                                  | `EmptyState`, inline form errors, toasts only after real effects |
| 10  | Nothing is claimed that is not implemented                                                         | No toast or copy asserts an email, upload or server write occurred |

> **Note on labels.** Earlier revisions labelled placeholder listings in the
> interface — a site-wide banner, per-card `Sample data` badges, and a disclaimer
> block on the About page. That labelling was removed by explicit product
> decision. The records in `src/data/sampleData.ts` are still placeholders and
> provider names are generic stand-ins, so replace them with verified
> information before the listings are published.

## Deploying

`npm run build` writes a static site to `dist/`. Upload that folder to any
static host.

**The host must return `index.html` for unknown paths**, because routing happens
in the browser. Without it, refreshing or sharing a link such as
`/scholarships/sch_001` returns a 404. Two configurations are included:

- `public/_redirects` — copied into `dist/`, read by Netlify and Cloudflare Pages
- `vercel.json` — read by Vercel

On a host that reads neither (nginx, Apache, S3), add the equivalent fallback
yourself.

Also shipped in `dist/`:

- `robots.txt` — allows the public site, disallows `/student/` and `/admin/`
- `sitemap.xml` — public routes only; scholarship detail pages cannot be listed
  while the listings are held in the browser
- `favicon.svg`

**`robots.txt` and `sitemap.xml` both contain `https://example.com` placeholders
that must be replaced with the real domain before deploying.**

`dist/assets/*` is content-hashed, so it can be cached immutably; `vercel.json`
sets that header for Vercel. Set the same header on any other host.

## Current scope

What is not built yet, and what that means in practice:

- **No backend.** Everything runs in the browser; `src/lib/api.ts` is the seam
  where a server would be connected.
- **Authentication is local.** Sign-in is checked against seeded accounts held in
  the browser, and passwords sit in plain text. Replace with server-side
  verification before deploying.
- **Authorisation is navigation-only.** `ProtectedRoute` shapes the interface; it
  is not a security boundary and can be bypassed with developer tools. Enforce
  every rule server-side as well.
- **No email, SMS or push.** Notifications are in-app only.
- **No document upload.** Requirements are recorded as text labels; no file is
  transmitted or stored.
- **No payments.** Grant amounts are records, not disbursements.
- **Storage is browser-local.** Clearing site data removes everything.
- **No Inter webfont load.** The font stack names `Inter` first and falls back to
  the system UI font, so no third-party request is made.

Next steps: replace the placeholder listings with verified provider data, connect
a backend, move authentication and authorisation server-side, and add tests
around the rules above.
