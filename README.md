# Scholar

A web-based scholarship information and student grant management system for the
province of Pampanga, Philippines.

React, Vite, TypeScript and Tailwind CSS on the front; a dependency-free Node API
and a PostgreSQL database behind it. The browser never touches the database — it
calls `src/lib/api.ts`, which talks HTTP to `server/` when `VITE_API_BASE_URL` is
set and falls back to browser storage when it is not. See
[Data layer](#data-layer) for which mode does what, and
[`docs/AGENTS.md`](docs/AGENTS.md#9-security-posture-read-before-changing-anything-auth-related)
for the security boundary.

Scholarship listings currently shipped with the application are placeholder
records used to populate the interface. Replace them with verified provider
information before publishing.

---

## Contents

- [Stack](#stack)
- [Getting started](#getting-started)
- [Data layer](#data-layer)
- [Test accounts](#test-accounts)
- [Environment variables](#environment-variables)
- [Route documentation](#route-documentation)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [Product rules](#product-rules)
- [Deploying](#deploying)
- [Current scope](#current-scope)
- [Documentation](#documentation)

---

## Stack

| Tool          | Version |
| ------------- | ------- |
| React         | 19.3    |
| Vite          | 8.3     |
| Tailwind CSS  | 4.3     |
| TypeScript    | 6.0     |
| React Router  | 8.4     |
| Node.js       | 24      |
| PostgreSQL    | 17      |
| Prisma        | 7.10    |
| Vitest        | 5.0     |
| oxlint        | 1.88    |

Dependencies are deliberately minimal. The client runtime is React, React DOM,
React Router and `qrcode-generator`; the server adds `@prisma/client`,
`@prisma/adapter-pg` and `pg`. Icons, CSV export, dialogs, tables, form
validation, multipart uploads, password hashing, one-time codes, JWT/JWKS
verification and the HTTP router are all implemented in this repository rather
than pulled in. `qrcode-generator` is the one exception, because an encoder
whose output is wrong looks exactly like one that works — see
[`docs/AGENTS.md`](docs/AGENTS.md) §3.

## Getting started

```bash
npm install          # install dependencies
npm run db:migrate   # apply the migrations (needs PostgreSQL + DATABASE_URL)
npm run db:seed      # load the placeholder records
npm run server       # API on :8787
npm run dev          # front end on :5173, proxying /api to the server
```

The demonstration build runs `npm run server` and `npm run preview` (:4173)
instead — the dev server serves modules unbundled and is slower to demonstrate.

| Script                     | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `npm run dev`              | Dev server with hot module replacement               |
| `npm run build`            | Type-check, build, then prerender every public route  |
| `npm run preview`          | Serve the production build locally                   |
| `npm test`                 | Vitest: 71 tests over 10 files, no database needed    |
| `npm run lint`             | Lint with oxlint                                     |
| `npm run server`           | The Node API on `API_PORT` (default 8787)            |
| `npm run db:migrate`       | Apply Prisma migrations                              |
| `npm run db:seed`          | Load the placeholder records                         |
| `npm run db:reset`         | Drop, re-migrate and reseed                          |
| `npm run db:studio`        | Browse the database                                  |
| `npm run db:prune-documents` | Retention job (dry run by default)                 |
| `npm run check:responsive` | Drive Chrome at 390/768/1280; needs server + preview  |
| `npm run rehearse`         | Walk the demonstration script and time each step     |

## Data layer

The interface never reads the database directly. `src/lib/api.ts` is the single
seam; every screen calls it. Which implementation it delegates to is decided
once, at **build time**, by `VITE_API_BASE_URL` — Vite inlines the value, so
changing it requires a rebuild, not a restart.

| `VITE_API_BASE_URL` | Behaviour |
| ------------------- | --------- |
| `/api` (what `.env.example` sets) | HTTP. The browser calls `server/`, which owns PostgreSQL. Sessions, passwords, ownership and role checks are enforced per request. |
| *unset* | Browser storage. Every visitor gets their own copy of the records in `localStorage`; nothing is shared or durable, and sign-in is checked in the browser. Useful for previewing the interface without a database. |

**This is not a fallback that happens silently at runtime.** If a build is made
without the variable, the resulting bundle is a self-contained demo and the API
is never contacted; if it is made with the variable, every screen requires a
running server. The shipped `dist/` is built with `/api` — you can confirm it by
searching the bundle for the base URL.

### Local database (Prisma + PostgreSQL)

A small dependency-free Node API server (`server/index.ts`) owns the PostgreSQL
database. The browser never receives database credentials, and every
authorisation rule — who may read an application, who may confirm a grant — is
decided on the server, per request.

Requirements: a running PostgreSQL instance and an empty database for the app.
`DATABASE_URL` in `.env` points at it; Supabase works with the same variable.

```bash
cp .env.example .env     # DATABASE_URL, API_PORT, VITE_API_BASE_URL
npm run db:migrate       # apply the migrations
npm run db:seed          # load the placeholder records
npm run server           # API on :8787
npm run dev              # front end on :5173, proxying /api to the server
```

Useful extras: `npm run db:studio` (browse the data) and `npm run db:reset`
(drop everything, re-migrate and reseed).

Security properties this gives you that browser storage could not:

- passwords are stored as **scrypt hashes** (`server/passwords.ts`), not plain text
- sessions are **httpOnly cookies**; the browser holds only an opaque id
- a student's list of applications is **scoped to that student on the server**
- role checks run on the server, so they cannot be bypassed with developer tools
- login returns an identical message for a wrong password and an unknown email,
  so accounts cannot be enumerated

> **Both sources are complete and interchangeable.** The API covers
> authentication, scholarships, saved listings, applications, registrations,
> grants, announcements, notifications, students, settings and reports, and the
> client calls it whenever `VITE_API_BASE_URL` is set. Nothing in `src/pages`
> knows which source is active — the switch lives entirely in
> `src/lib/api.ts`.

### One difference worth knowing

Over HTTP the session is an httpOnly cookie, which JavaScript cannot read. It
can therefore only be resolved by asking the server, so `AuthProvider` starts in
an `initialising` state and `ProtectedRoute` shows a brief "Checking your
session…" before deciding. Redirecting during that window would bounce a
signed-in user to the login screen on every refresh.

## Test accounts

Sign-in uses the seeded accounts listed below.

Over HTTP they are real database rows with **scrypt hashes** and a server-side
session (`server/passwords.ts`, `server/http/auth.ts`); the browser never sees a
hash. In browser-storage mode the same credentials are checked in the browser and
ship in the bundle — fine for a demonstration, and one of the reasons that mode
must not be deployed. Either way, remove the demo accounts before public use.

| Role          | Email                       | Password     |
| ------------- | --------------------------- | ------------ |
| Student       | `maria.santos@example.com`  | `student123` |
| Administrator | `admin@example.com`         | `admin123`   |

The login screen lists both accounts and can fill them in with one click.
Additional student accounts exist in `src/data/sampleData.ts`
(`juan.delacruz@`, `ana.reyes@`, `paolo.bautista@` — all `@example.com`, all with
the password `student123`).

## Environment variables

**None are required for the browser-storage demo.** A build made without a
`.env` runs entirely in the browser. The API, the seeded database and the
demonstration all need the first three:

| Variable | Default | Used by | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | — | API, Prisma CLI, seed | PostgreSQL connection string. Migrations want the **direct** port (5432), not a pooler. |
| `API_PORT` | `8787` | API | Port the Node server listens on. |
| `VITE_API_BASE_URL` | *unset* | Build | `/api` selects the API. Unset selects browser storage. |
| `SITE_URL` | `https://example.com` | `npm run build` | Canonical URLs, Open Graph tags and `sitemap.xml`. |
| `GOOGLE_CLIENT_ID` | *empty* | API | Enables Google sign-in. Empty hides the button rather than offering a broken one. |
| `GOOGLE_CLIENT_SECRET` | *empty* | — | Not used: the ID-token flow has no code to exchange. |
| `UPLOAD_DIR` | `./uploads` | API | Where uploaded documents are written. |
| `MAIL_TRANSPORT` | `console` | API | `console` prints messages and codes to the server log. Any other value fails loudly until a transport is implemented. |
| `TRUST_PROXY` | `false` | API | Set `true` **only** behind a proxy that overwrites `x-forwarded-for`. |

Copy `.env.example` to `.env` to start. `.env` and `.env.local` are git-ignored.

Vite only exposes variables prefixed with `VITE_`, and **every one of them ends
up in the client bundle** — never put a secret in one. Everything else in the
table is server-side only.


## Route documentation

### Public

| Route               | Page                        | Purpose                                                                                       |
| ------------------- | --------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                 | Home                        | Hero, search, featured opportunities, categories, deadlines, calls to action                   |
| `/scholarships`     | Scholarship directory       | Search, filter and paginate every published listing                                            |
| `/scholarships/:id` | Scholarship details         | Provider, eligibility, benefits, requirements, deadline, contact details, application instructions |
| `/login`            | Login                       | Sign-in for students and administrators                                                        |
| `/register`         | Student registration        | Create a student account                                                                        |
| `/about`            | About                       | Scope, limitations and how the platform works                                                   |
| `/faqs`             | Frequently asked questions  | Grouped answers on listings, applying, grants, registration and accounts                         |

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
src/                        # React application
├── app/                    # Route table (App.tsx) and Providers.tsx
├── main.tsx                # Entry: mounts <Providers><App /></Providers>
├── styles/index.css        # Tailwind import + @theme design tokens
├── types/index.ts          # Every domain model, shared with the server
├── data/
│   ├── sampleData.ts       # Placeholder records
│   └── schema.ts           # Browser-store shape + seed builder
├── lib/
│   ├── api.ts              # Data-access seam (picks the implementation)
│   ├── httpApi.ts          # The HTTP implementation of that seam
│   ├── storage.ts          # localStorage wrapper (browser-storage mode)
│   ├── constants.ts        # Option lists, label maps, municipalities
│   ├── tones.ts            # Status → badge tone
│   ├── documents.ts        # Upload rules + classifier (client and server)
│   ├── studentDetails.ts   # Shared sign-up field validation
│   ├── format.ts           # Date, currency and text formatting
│   ├── validation.ts       # Composable validators
│   ├── csv.ts              # CSV export for reports
│   └── id.ts               # Id / reference-number helpers
├── hooks/                  # useAsync, useSavedScholarships, useDebouncedValue …
├── context/                # Auth, theme and toast providers
├── components/
│   ├── ui/                 # Design-system primitives
│   ├── layout/             # Layouts, sidebars, route guards
│   └── …                   # ScholarshipCard, StatusBadge, ShareScholarship …
└── pages/                  # public/, student/, admin/, NotFoundPage.tsx

server/                     # Node API — the only thing that touches the database
├── index.ts                # Bootstrap: security headers, dispatch, listen
├── http/                   # router.ts, auth.ts (sessions + guards), responses.ts
├── routes/                 # One module per resource
├── db.ts                   # Prisma client (PostgreSQL adapter)
├── mappers.ts              # Row → domain type
├── passwords.ts            # scrypt hashing
├── otp.ts                  # One-time codes
├── throttle.ts             # Failed-login counters
├── uploads.ts              # Multipart reader + file store
├── googleAuth.ts           # ID-token verification (JWKS, RS256)
├── mailer.ts               # Transport seam (console by default)
└── audit.ts                # Append-only trail

prisma/                     # schema.prisma, migrations, seed.ts
scripts/                    # prerender, db-reset, prune-documents,
                            # check-responsive, rehearse-demo
tests/                      # Vitest: 71 tests over 10 files
docs/                       # Spec, plan, deployment, security, defense, paper
public/                     # Icons, manifest, _redirects
```

Generated and git-ignored: `dist/` (the build), `uploads/` (student documents),
`tmp/` (screenshots and scratch files), `docs/paper/build/` (paper intermediates).


## Architecture

**Design system.** `src/components/ui/index.ts` is the barrel every page imports
from. Tokens live in `src/styles/index.css` under Tailwind v4's `@theme` block, so there
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
- **Dark mode is class-based and user-toggleable** (see `docs/AGENTS.md`). Every text
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

## Switching data sources

Both sources are complete and already implemented; nothing needs to be written
to move between them.

| Want | Do |
| --- | --- |
| The real thing (database, server-side sessions and authorisation) | Set `VITE_API_BASE_URL=/api`, run PostgreSQL + `npm run server`, then rebuild and restart the dev server |
| A UI preview with no database | Leave `VITE_API_BASE_URL` unset, rebuild, and open the site — it seeds `localStorage` on first load |
| Reset the browser demo | `demoApi.reset()` is exposed in the admin settings screen |

`src/types/index.ts` is the contract both sides share; a new field belongs there
first. Whatever the mode, `ProtectedRoute` is navigation, not security — the
rules that matter are re-checked in `server/http/auth.ts` and each route module.

Before a real deployment, in this order:

1. Replace the placeholder listings and the demo accounts (rule 1).
2. Set `MAIL_TRANSPORT` to a real transport; the console transport prints
   one-time codes to the server log by design.
3. Set `COOKIE_SECURE=true` and serve over TLS, so the session cookie is not
   transmissible in the clear.
4. Move `UPLOAD_DIR` outside the build directory, or uploads vanish on the next
   deploy.
5. Schedule `npm run db:prune-documents`; retention is unenforced until it runs.
6. Work through `docs/security/SECURITY-REVIEW.md` — it lists the findings that
   remain open, with severities.


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

`npm run build` runs the type check, builds the bundle, then **prerenders** each
public route with `scripts/prerender.ts`. The output in `dist/` is a static site.

Set the real domain before building, or every canonical URL, Open Graph tag and
`sitemap.xml` entry will say `example.com`:

```bash
SITE_URL=https://your-domain.example npm run build
```

### Why prerendering

The app is a single-page application, so without this every URL would serve the
same empty shell — search engines would index nothing, and sharing a listing to
Facebook would produce a bare link. The script writes one HTML file per public
route (home, directory, about, login, register and **every published listing**)
carrying a real `<title>`, description, canonical link and Open Graph tags, while
still shipping the bundle so the page behaves normally once it loads.

It also generates, so none of these need to be maintained by hand:

| Artefact | Purpose |
| --- | --- |
| `sitemap.xml` | Every public route plus every published listing |
| `robots.txt` | Allows the public site, disallows `/student/` and `/admin/` |
| `og-image.png` | 1200×630 social preview card |
| `icon-192/512.png`, `apple-touch-icon.png` | Home-screen icons |
| `sw.js` | Service worker: offline shell and asset caching |

### Host requirements

**The host must return `index.html` for unknown paths**, because routing happens
in the browser. Without it, refreshing or sharing a link such as
`/scholarships/sch_001` returns a 404. Two configurations are included:

- `public/_redirects` — copied into `dist/`, read by Netlify and Cloudflare Pages
- `vercel.json` — read by Vercel

Prerendered pages are real files (`dist/scholarships/<id>/index.html`), and the
common hosts serve those for both `/x` and `/x/` before applying the fallback.
On a host that reads neither config (nginx, Apache, S3), add the equivalent
fallback yourself.

### Progressive web app

`manifest.webmanifest` makes the site installable, with shortcuts to
Scholarships and My applications. The service worker precaches the app shell,
caches hashed assets on first use, and serves a cached shell when a navigation
fails offline. It **never** caches `/api/` — stale application data would be
worse than an honest error. It registers in production builds only, so it cannot
interfere with hot module replacement during development.

### Caching

`dist/assets/*` is content-hashed, so it can be cached immutably; `vercel.json`
sets that header for Vercel. Set the same header on any other host.

## Current scope

What exists, and what deliberately does not. This section previously described
the browser-only build, which is why it claimed there was no backend; it now
describes the repository.

**Built and verified:** a Node API over PostgreSQL with 15 route modules; sessions
as scrypt-hashed passwords plus an httpOnly cookie; per-request ownership and
role checks; document upload, classification and administrator review; one-time
code email verification; optional Google sign-in with a profile-completion step;
an audit trail of administrative acts; data-subject export and erasure requests;
a retention job; QR-code sharing of listings; reports with CSV export; and a
prerendered, installable front end.

**Not built, or limited on purpose:**

- **Email is a console transport.** One-time codes print in the server log; no
  message leaves the machine until `MAIL_TRANSPORT` is implemented.
- **No SMS or push.** In-app notifications only.
- **No payments.** A grant record is evidence of a decision, not a disbursement.
- **Uploads live on local disk** (`UPLOAD_DIR`), which a deployment must point at
  persistent storage.
- **Throttling is in memory**, so it resets with the process and does not hold
  across instances. There is no CSRF token; `SameSite=Lax` is the mitigation.
- **Browser-storage mode is a preview.** With `VITE_API_BASE_URL` unset, demo
  data and demo passwords live in `localStorage`, and authorisation is
  navigation only.
- **Listings and provider names are placeholders**, and the demo accounts still
  exist. Both must go before public use.
- **No Inter webfont load.** The stack names Inter and falls back to the system
  UI font, so no third-party request is made.

The research behind what to do next, phase by phase, is in
[`docs/plan/PLAN.md`](docs/plan/PLAN.md); the live list is §13 of
[`docs/AGENTS.md`](docs/AGENTS.md).

## Documentation

| Document | Read it for |
| --- | --- |
| [`docs/README.md`](docs/README.md) | Index of everything below |
| [`docs/AGENTS.md`](docs/AGENTS.md) | Conventions, business rules, security posture, and the change/verification logs |
| [`docs/spec/SPEC.md`](docs/spec/SPEC.md) | Product and technical specification |
| [`docs/plan/PLAN.md`](docs/plan/PLAN.md) | Standards-driven improvement plan |
| [`docs/deployment/DEPLOY.md`](docs/deployment/DEPLOY.md) | Deploying the three parts |
| [`docs/security/SECURITY-REVIEW.md`](docs/security/SECURITY-REVIEW.md) | Findings, severities, pre-deployment checklist |
| [`docs/defense/`](docs/defense) | Defense brief, system documentation, study guide |
| [`docs/paper/README.md`](docs/paper/README.md) | Rebuilding the capstone paper and its figures |
