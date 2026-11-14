# Architecture

Status: 14 November 2026. This describes the code as it is, not an earlier plan.
Product scope is in `docs/spec/SPEC.md`; visual rules are in
`docs/design/DESIGN.md`; security findings are in
`docs/security/SECURITY-REVIEW.md`.

---

## 1. System shape

```
Browser
  React SPA (static files)
  │  fetch /api/*  same origin, HttpOnly cookie
  ▼
Node API (no framework, 70 routes)
  │  Prisma 7 + @prisma/adapter-pg
  ▼
PostgreSQL 17
  │
  └── uploaded files on disk (`uploads/`)
```

Three processes in development and in the demo: the static site, the API and
PostgreSQL. In production they sit behind one origin, with a reverse proxy
sending `/api` to the Node process and everything else to the static host.

There is **no server-side rendering**. `scripts/prerender.ts` writes 23 HTML
entries with route-specific titles, descriptions and Open Graph tags for
crawlers and link previews; the page itself still renders in the browser.

---

## 2. Runtime topology

| Context | Site | API | Database |
|---|---|---|---|
| Development | Vite `:5173` | Node `:8787` | PostgreSQL `:5432` |
| Production preview | Vite preview `:4173` | Node `:8787` | PostgreSQL |
| Demo package | Vite preview `:4174` | Node `:8788` | PostgreSQL `:55432` |

The browser calls `/api` on its own origin. Vite proxies that path in
development; a reverse proxy or host rewrite does it in production, which keeps
the session cookie first-party.

**Data mode is a build-time choice.** `src/lib/api.ts` exposes one API surface
and selects an implementation using `VITE_API_BASE_URL`:

- set → `src/lib/httpApi.ts` (`fetch` to `/api`);
- unset → the browser-storage implementation in `src/lib/api.ts` / `src/data/`.

A build without `VITE_API_BASE_URL` never contacts the API. The deployed and
demo builds use HTTP mode.

The API calls `server.listen(PORT)` without a host, so it listens on all
interfaces. In production it should sit behind a proxy or firewall; the demo
launcher binds the site to loopback but not the API.

---

## 3. Front end

**Boot.** `index.html` contains the root element, metadata and a small inline
script that applies the saved theme before first paint. `src/main.tsx` mounts
React and registers the service worker in production. `src/app/Providers.tsx`
composes the providers in this order:

1. `ThemeProvider` — class on `<html>`, saved in `localStorage`.
2. `BrowserRouter` — routing for everything below.
3. `AuthProvider` — resolves the session before a page asks who is signed in.
4. `ToastProvider` — innermost so any page can raise a toast.

**Routing.** `src/app/App.tsx` holds 33 routes plus a not-found page:
11 public, 9 student, 13 administrator. Every page is `lazy()`-loaded; one
`Suspense` boundary shows `LoadingPage` while a chunk arrives. Layouts and
route guards are eager because they render on almost every navigation.

**Data access.** Pages never call `fetch` directly. They import a resource API
from `src/lib/api.ts`, which is backed by `httpApi.ts` in HTTP mode. Types live
in `src/types/` and are shared by client and server. A small `useAsync` hook
owns per-screen `{ data, loading, error, reload }`; there is no global cache or
React Query.

**State.** React context and hooks only. `AuthProvider` distinguishes the two
modes: browser storage resolves the session synchronously; HTTP mode keeps
`initialising` true until `/api/auth/session` returns, so guards do not bounce
a signed-in user to login on refresh.

**Validation.** `src/lib/validation.ts`, `studentDetails.ts` and `documents.ts`
are shared with the server. Client checks are for fast feedback; the server
re-runs them because client input is untrusted.

**PWA.** `src/lib/serviceWorker.ts` registers `/sw.js` in production.
Navigation is network-first with a cached `index.html` fallback; hashed assets
are cache-first; `/api` is never cached.

---

## 4. API

`server/index.ts` is deliberately small: create the HTTP server, apply security
headers, match the route, resolve the session, call the handler, map errors.

**Routing.** `server/routes/*.ts` self-register with `route(method, path,
handler)` on import. `server/http/router.ts` splits paths into segments and
matches `:params`. The dispatcher prefers the match with the fewest parameter
segments, so `/api/applications/counts` is not swallowed by
`/api/applications/:id`.

**Request lifecycle:**

1. `applySecurityHeaders` — nosniff, frame denial, referrer policy, permissions
   policy, HSTS when TLS is terminated.
2. Match the route; unknown paths return JSON 404.
3. `currentUser(req)` — cookie → `Session` row → `User`; expired rows are
   deleted.
4. Handler receives `{ req, res, params, query, user }`.
5. `HttpError` becomes its status and message; unknown errors are logged and
   become a generic 500.

**Authorisation.** Guards are explicit per route:
`requireUser`, `requireRole(user, 'admin')`,
`requireOwnerOrAdmin(user, ownerId)`. Student queries are pinned to the
signed-in id; administrators are checked by role.

**Errors.** JSON shape is `{ "error": "message" }`. The API speaks
`200/201` success, `400` validation, `401` no session, `403` wrong role or
owner, `404` missing, `409` business conflict, `413` body/upload too large,
`429` throttled, `500` unexpected.

**Pagination.** List endpoints clamp `pageSize` to 1–100 and return
`{ items, total, page, pageSize, totalPages }`.

There is no Express, no ORM query builder in the client, and no raw SQL.
Prisma parameterises every value.

---

## 5. Data model

Prisma 7 with the PostgreSQL driver adapter. One `PrismaClient` instance in
`server/db.ts`. Fifteen models:

| Group | Models |
|---|---|
| Identity | `User`, `Session`, `StudentProfile`, `EmailVerification` |
| Catalogue | `Scholarship`, `SavedScholarship` |
| Process | `Application`, `ApplicationTimelineEntry`, `SemesterRegistration`, `Grant` |
| Supporting | `StudentDocument`, `Announcement`, `Notification`, `AuditEntry`, `PlatformSettings` |

**Constraints that encode rules:**

| Constraint | Why |
|---|---|
| `Application.referenceNo @unique` | One public reference per application |
| `@@unique([studentId, scholarshipId])` | One application per student per listing |
| `Grant.applicationId @unique` | One confirmed grant per application |
| `Grant.referenceNo @unique` | One public grant reference |
| `SemesterRegistration.referenceNo @unique` | One public registration reference |
| `@@unique([studentId, academicYear, semester])` | One registration per term |
| `User.email @unique`, `User.googleSub @unique` | One account per identity |
| `SavedScholarship` composite key | Save once per listing |

**Money** is `Grant.amountCentavos Int`. The API accepts pesos and converts at
the boundary; sums are integers.

**List fields** (`educationLevels`, `benefits`, `eligibility`, `requirements`,
`responses`, `documentNames`, `tags`) are JSON text. They are parsed in
`server/mappers.ts` and the client types. This keeps client/server shapes
identical but means those fields are not directly queryable in SQL.

---

## 6. Domain workflows

### 6.1 Apply

`POST /api/applications` requires a student, a complete profile, a listing that
is `open`, `applicationMode === 'internal'`, a deadline that has not passed, and
`PlatformSettings.applicationsOpen`. It refuses external listings and expired
deadlines server-side, not only in the UI. An empty deadline means a rolling
intake and is never treated as expired.

An existing draft is updated in place; a second application for the same listing
is rejected by the unique pair. Reference numbers are computed from existing
rows; a reference collision is retried. The application and its notification
are written in one transaction.

### 6.2 Decide

`POST /api/applications/:id/status` is administrator-only. It requires a note
of at least five characters and follows an explicit transition map:

- submitted / under-review / needs-info → under-review, needs-info, approved
  or rejected;
- approved → rejected only as a correction;
- rejected → under-review to reopen.

A same-status decision is refused. Once a grant exists, the decision is locked
because it is part of the financial record. The status update and notification
are one transaction; the audit entry follows.

### 6.3 Confirm a grant

`POST /api/grants/confirm` is administrator-only and requires an **approved**
application with no existing grant. The grant, its notification and the audit
entry are the act that releases funds. `Grant.applicationId @unique` is the
database backstop.

`POST /api/grants` (the manual form) uses the same helper and also requires an
approved application with no grant. `PATCH` validates amount and status;
`PATCH` and `DELETE` are audited.

### 6.4 Semester registration

`POST /api/registrations` is student-only and requires an **active** grant.
Uniqueness is `(studentId, academicYear, semester)`. A verified registration is
locked; a rejected one can be corrected to verified. A registration that a grant
depends on cannot change status.

### 6.5 Documents

Upload is `multipart/form-data`, one file, capped at 5 MB. Accepted types are
PDF, JPEG and PNG, checked again on the server. Classification is the same
function in browser and server (`src/lib/documents.ts`).

The file is written as `<document-id>.<ext>`, with the extension derived from
the MIME type, never the uploaded name. The row stores the display name and the
generated name. Download is owner-or-admin, always an attachment with `nosniff`
and a sanitised `Content-Disposition`; staff access is audited. If the row insert
fails after the bytes are written, the file is removed.

### 6.6 Announcements, notifications and audit

Announcements have a category and an audience (`all`, `students`, `admins`). The
audience is derived from the session on read; it is not accepted from the query
string. Administrators see everything, students see `all + students`, anonymous
visitors see `all`.

Notifications are per-user, with `userId: null` for broadcast rows. The bell
reads an unread count and a list.

`server/audit.ts` records decisions, grant changes, document access, account
changes, settings, announcements and data-subject requests. It is intentionally
fire-and-forget: an audit failure must not roll back the action, but it is logged
loudly.

---

## 7. Authentication and sessions

- **Passwords:** scrypt with a random 16-byte salt, stored as
  `scrypt:salt:hash`, compared with `timingSafeEqual`.
- **Sessions:** a random UUID stored in `Session`, sent as
  `pgc_session` with `HttpOnly; SameSite=Lax; Max-Age=30d`; `Secure` when TLS is
  terminating. Logout deletes the row. Expiry is checked on every request.
- **Throttling:** login is 5 failures per account and 20 per address in 15
  minutes, cleared on success. Registration is 10 attempts per address per hour.
  These counters are in memory, so they assume one API process.
- **Google:** the browser obtains a Google ID token; the server verifies the
  RS256 signature against Google's JWKS and checks `aud`, `iss`, `exp` and `sub`.
  Accounts are keyed on `sub`, never email; an existing password account with
  the same address is refused rather than silently linked.
- **One-time codes:** six digits from `crypto.randomInt`, stored hashed, short
  TTL, five attempts, address allowance. `MAIL_TRANSPORT=console` prints the code
  to the server log; the UI reports `delivery: 'log'` rather than claiming an
  email was sent.
- **Roles:** `student` and `admin`. A student can only reach their own records;
  `requireOwnerOrAdmin` is used on every student-scoped read.

---

## 8. Build, prerender and PWA

`npm run build` runs:

1. `tsc -b` over the app, server and node projects;
2. `vite build` → hashed assets in `dist/`;
3. `node --env-file=.env scripts/prerender.ts`.

The prerender step writes 23 HTML entries (public routes and published
listings) with title, description, canonical and Open Graph tags. It also writes
`sitemap.xml`, `robots.txt`, the PWA icons, the Open Graph image (with a
hand-written PNG encoder) and `sw.js`. It is metadata, not SSR.

The service worker caches the shell and assets, never `/api`. Offline support is
shell-only; data is not cached.

---

## 9. Deployment

The three parts:

- static files (`dist/`) behind a host with an SPA fallback;
- the Node API as a long-running process;
- PostgreSQL, reachable only by the API.

Required configuration is in `docs/deployment/DEPLOY.md`: `DATABASE_URL`,
`API_PORT`, `SITE_URL`, `VITE_API_BASE_URL`, Google client IDs, `UPLOAD_DIR`,
`MAIL_TRANSPORT`, `TRUST_PROXY`. TLS must terminate before the cookie can be
`Secure`; `TRUST_PROXY=true` is only safe when the proxy overwrites
`X-Forwarded-For`.

CI is `.github/workflows/verify.yml`: install, generate Prisma, tests,
type-check, lint, migrate, seed and build against a PostgreSQL service. `main`
is protected: PR, one approval, green `verify`, no force pushes or deletions.

---

## 10. Testing and verification

- **81 unit/component tests in 11 files** (Vitest, jsdom, Testing Library). They
  cover pure rules: document classification and upload validation, password
  hashing, throttling, form validation, reference numbering, Google authority,
  CSV escaping, error boundary, status transitions and deadlines.
- **Rehearsal:** `npm run rehearse` drives the production preview and API
  through 11 steps: register, apply, approve (no grant), confirm, student sees
  grant, register a semester, reports, activity. It needs the API and preview.
- **Responsive:** `npm run check:responsive` drives Chrome at 390/768/1280 and
  reports overflow and missing headings.
- **CI:** the same tests, type-check, lint, migrations and build run on every PR.

The suite is database-free by design. Database/HTTP workflows are covered by the
rehearsal, not by unit tests.

---

## 11. Trade-offs and known gaps

- **No SSR.** Public pages have metadata but content is client-rendered.
- **Two data implementations.** Browser-storage mode is retained for the
  original demo; it duplicates behaviour and is not the production path.
- **JSON-in-TEXT** list fields limit SQL queries and reporting.
- **In-memory throttles** do not survive multiple API instances.
- **Audit is fire-and-forget**, so a trail can have gaps.
- **Demo accounts** remain and must be removed or gated before a real launch.
- **Listing status is only as fresh as the last check.** The catalogue is built
  from published programme information, but Pampanga programmes re-open every
  intake; eight of the fifteen are already marked closed.
- **Email** is console-only; Google sign-in is hidden without a client id.
- **`/api/settings` and `/api/grants/total-released` are public.** That is a
  product decision, not an accident.
- **The API listens on all interfaces** by default; bind it behind a proxy or
  firewall for deployment.

See `docs/security/SECURITY-REVIEW.md` for the full pre-deployment list.
