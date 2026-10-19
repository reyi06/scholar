# AGENTS.md

Guidance for AI agents (and humans) working in this repository.
Keep the **Change log** and **Verification log** sections at the bottom up to
date as you work — they are the running record of what has been done here.

---

## 1. What this is

**Scholar** — a web-based scholarship information and student
grant management system for the province of Pampanga, Philippines.

It does two things:

1. **Consolidates scholarship listings** from provincial, municipal, national,
   educational and private providers into one searchable public directory.
2. **Tracks student records** — applications, semester registration for existing
   grantees, and confirmed grant records — with a separate administrator area
   for review and management.

> **Scope note.** No backend is connected yet: data is served by a local browser
> store (`src/lib/api.ts`), sign-in is checked locally, and there is no email or
> document upload. The listings shipped in `src/data/sampleData.ts` are
> placeholder records with generic provider names. See sections 8 and 9.

---

## 2. Quick start

```bash
npm install        # install dependencies
npm run dev        # dev server -> http://localhost:5173
npm run build      # type-check (tsc -b) then build to dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

There is **no test runner configured**. Verification is currently manual —
see the Verification log for the approach used (browser-driven smoke tests of
every route plus Lighthouse).

Demo sign-in: student `maria.santos@example.com` / `student123`,
administrator `admin@example.com` / `admin123`.

---

## 3. Stack

| Tool          | Range      | Installed |
| ------------- | ---------- | --------- |
| Node.js       | —          | 24.21.0   |
| npm           | —          | 11.19.0   |
| react         | `^19.2.8`  | 19.3.1    |
| react-dom     | `^19.2.8`  | 19.3.1    |
| react-router  | `^8.4.0`   | 8.4.0     |
| vite          | `^8.3.0`   | 8.3.4     |
| tailwindcss   | `^4.3.3`   | 4.3.3     |
| @tailwindcss/vite | `^4.3.3` | 4.3.3    |
| typescript    | `~6.0.2`   | 6.0.3     |
| oxlint        | `^1.81.0`  | 1.88.0    |

Runtime dependencies are **React, React DOM, React Router and
`qrcode-generator`**. Icons, dialogs, tables, CSV export, form validation,
multipart uploads, JWT verification and one-time codes are implemented in-repo
to honour the "avoid unnecessary dependencies" requirement. Do not add a
dependency for something small that already exists here.

**The one exception, and why.** `qrcode-generator` encodes QR codes for the
scholarship share dialog. QR is a standardised algorithm — Reed–Solomon error
correction, version selection, eight mask patterns and their penalty rules —
whose output cannot be checked by reading it: a malformed code looks exactly
like a working one until someone points a phone at it. It is confined to
`src/components/ShareScholarship.tsx`; the SVG is still drawn here. If it is ever
replaced, keep the decoded output as the test, not a visual inspection.

Package manager is **npm** (`package-lock.json` is committed).

---

## 4. Directory structure

```
src/
├── App.tsx                     # Route table + lazy page imports + route guards
├── main.tsx                    # Entry: BrowserRouter > AuthProvider > ToastProvider
├── index.css                   # Tailwind import + @theme design tokens
├── types/index.ts              # EVERY domain model (single source of truth)
├── data/
│   ├── sampleData.ts           # Labelled sample records (clearly not real)
│   └── schema.ts               # DemoDatabase shape + seed builder + DB_VERSION
├── lib/
│   ├── api.ts                  # Data-access layer — the backend seam
│   ├── storage.ts              # localStorage wrapper (demo persistence)
│   ├── constants.ts            # Option lists + label maps + municipalities
│   ├── format.ts               # Date/currency/relative-time/text helpers
│   ├── validation.ts           # Composable validators + validateForm
│   ├── csv.ts                  # CSV serialisation + download
│   └── id.ts                   # Ids and reference numbers
├── hooks/
│   ├── useAsync.ts             # useAsync (load) + useAsyncAction (mutate)
│   ├── useSavedScholarships.ts # Bookmarks, shared by 4 screens
│   ├── useDebouncedValue.ts    # Debounce search inputs
│   └── useDocumentTitle.ts     # Per-page document title
├── context/
│   ├── authContext.ts / AuthProvider.tsx    # Session (demo)
│   └── toastContext.ts / ToastProvider.tsx  # Toasts
├── components/
│   ├── ui/                     # Design system (see section 6)
│   ├── layout/                 # PublicLayout, DashboardLayout, Sidebars,
│   │                           # ProtectedRoute, NotificationBell, Dropdown, navItems
│   ├── ScholarshipCard.tsx     # The only scholarship card used anywhere
│   ├── StatusBadge.tsx         # Domain status -> coloured badge
│   ├── DeadlineBadge.tsx       # Deadline urgency
│   ├── DemoBanner.tsx          # Standing "this is a demo" disclosure
│   └── ScrollToTop.tsx
└── pages/
    ├── public/                 # HomePage, ScholarshipDirectoryPage,
    │                           # ScholarshipDetailPage, LoginPage,
    │                           # RegisterPage, AboutPage
    ├── student/                # 8 pages (dashboard … notifications)
    ├── admin/                  # 10 pages (dashboard … settings)
    └── NotFoundPage.tsx
```

`public/` holds `favicon.svg` and `robots.txt`.

---

## 5. Architecture

### Data access — one seam
Pages **never** import `src/data/sampleData.ts` directly. Everything goes
through `src/lib/api.ts`, which returns Promises (with ~180 ms simulated
latency so loading states are real) and exposes grouped APIs: `authApi`,
`scholarshipsApi`, `savedApi`, `applicationsApi`, `registrationsApi`,
`grantsApi`, `announcementsApi`, `notificationsApi`, `studentsApi`,
`settingsApi`, `reportsApi`, `demoApi`.

To connect a backend, replace the method bodies with `fetch` calls and flip
`DEMO_MODE` to `false`. Page code does not change.

### Demo persistence
`src/lib/storage.ts` wraps `localStorage` (keys prefixed `pgc:`). `schema.ts`
exports `DB_VERSION`; bump it when the shape changes and stale payloads are
discarded automatically. `demoApi.reset()` re-seeds.

The demo session is a `sessionUserId` field inside the stored database. It is
a flag, not a token.

### State
No global store beyond auth and toasts. Each page loads what it needs on mount,
so data is always fresh after a mutation. Mutations reload via the `reload()`
returned by `useAsync`.

**Seeding forms from loaded data:** pass `onSuccess` to `useAsync` rather than
writing a watching `useEffect`. It avoids an extra render pass, and a
synchronous `setState` inside an effect is flagged by lint
(`react/set-state-in-effect`).

### Routing
`src/App.tsx` holds a flat route table. Every page is `React.lazy`-loaded so the
public site does not ship the student/admin code. Route groups are wrapped in
`<ProtectedRoute role="student"|"admin">`; there is a single `<Suspense>`
boundary around `<Routes>`.

Public auth screens are wrapped in `GuestOnlyRoute`, which bounces signed-in
users to their own dashboard.

---

## 6. Design system

`src/components/ui/index.ts` is the **barrel every page imports from**:
`import { Button, Card, PageHeader } from '../../components/ui'`.

Available: `Accordion`, `Alert`, `Badge`, `Button` / `LinkButton`
(+ `buttonClasses`), `Card`/`CardHeader`/`CardBody`/`CardFooter`, `Checkbox`,
`ConfirmDialog`, `DefinitionList`, `Dialog`, `EmptyState`, `Field` (+
`describedBy`, `hideLabel`), `Icon`, `Input`, `PageHeader`, `Pagination`,
`SearchInput`, `Section` (**prefer this over `Card`**), `Select`, `Skeleton`,
`Spinner`, `StatCard` / `StatRow` / `StatCell`, `LoadingState`/`LoadingRows`/
`ErrorState`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD` and the config-driven
`DataTable`, `Tabs`, `Textarea`, plus `controlClasses`.

### Visual language — follow this

The interface is deliberately quiet. Before adding anything, check it against
these rules:

- **One accent.** Maroon (`brand-*`) is the only accent: `bg-brand-700` for
  solid primary buttons, `text-brand-800` for accent text and links. Gold
  (`gold-*`) is reserved for "Featured"/"Pinned" markers and the masthead rule.
  Do not introduce another hue.
- **Group with `Section`, not `Card`.** A page should read as titled sections
  separated by hairlines. Reserve `Card` for a form or a genuinely distinct
  panel. Sections are the default; cards are the exception.
- **Surfaces are flat.** `rounded-lg border border-slate-200 bg-white`, no
  resting shadow. The only shadow token is `shadow-float`, used by `Dialog`.
- **Metrics are text, not tiles.** `StatCard` renders label + value with no
  card chrome and has **no `icon` prop**. Group metrics in a bordered band or
  with `StatRow`/`StatCell`. Never build a wall of statistic cards.
- **Icons are not decoration.** Use them only where they carry meaning.
- **Type scale:** page title via `PageHeader` (`text-xl`/`text-2xl`), section
  headings `text-sm font-semibold`, body `text-sm text-slate-600`, meta
  `text-xs text-slate-500`. No oversized headings.
- **One primary action per page;** the rest are `outline` or `ghost`.
- **Container:** `mx-auto max-w-6xl px-5 py-8 sm:px-8`.
- **Progressive disclosure:** `Accordion` for long read-only blocks, `Dialog`
  for editing, `Tabs` for lists with modes, `hideLabel` for compact toolbars.
- **Tables are for tabular admin data only**, with search and filters in one
  compact toolbar row above the table rather than a filter panel.
- **Whitespace over density:** `space-y-10` between sections, `gap-4`/`gap-6`
  inside. If a page feels full, remove something.

Only `useToast` comes from outside the barrel
(`src/context/toastContext.ts`).

### Tailwind CSS v4 — important
This is **v4, not v3**.

- There is **no `tailwind.config.js` and no PostCSS config**. Do not add one.
- Tokens live in the `@theme` block in `src/index.css`. Adding
  `--color-x` there immediately creates `bg-x`, `text-x`, `border-x`, `outline-x`.
- `src/index.css` must keep `@import 'tailwindcss';` as the first line.
- Prefer utilities in JSX. There is no `App.css`; do not reintroduce per-page
  CSS files.
- **Only use token names that exist.** The palette defines `brand-50..950` and
  `accent-100/500/600/700`; a class like `bg-brand-800` works but
  `bg-brand-850` silently does nothing.
- Prefer `border-[3px]` over `border-3`; only real scale values
  (`border-2`, `border-4`) generate utilities.
- Ignore v3-era advice (`@tailwind base;`, `content: [...]`, `theme.extend`,
  `npx tailwindcss init`).

### Dark mode
Class-based and user-toggleable. `@custom-variant dark` in `src/index.css`
points `dark:` variants at a `.dark` class on `<html>` instead of the OS
setting:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

- `ThemeProvider` (`src/context/ThemeProvider.tsx`) owns the state, persists the
  choice to `localStorage` under `pgc-theme`, and toggles the class.
- `ThemeToggle` is rendered in the public header and the dashboard top bar.
- The initial theme is a stored choice, falling back to the OS preference.
- An inline script in `index.html` applies the class **before first paint**, so
  there is no flash of the wrong theme. If you change `readInitialTheme()`,
  change that script to match.
- `:root` and `.dark` set `color-scheme`, so native UI (scrollbars, date
  pickers, form controls) follows the theme too.
- **Dark surfaces use the `ink-*` ramp, never `slate-*`.** `slate-950` is
  `#020617`, near-black, and a page built on it reads as a hard, glaring block.
  `ink-950` (canvas) → `ink-900` (surface) → `ink-800` (border) is a neutral
  charcoal ramp defined in `@theme`. Use it for `dark:bg-*`, `dark:border-*`,
  `dark:divide-*` and `dark:ring-*`. The value *is* the dark value, so never
  reach for these behind a light-mode utility. `dark:text-*` still uses `slate`.

**When adding a component, give every text colour its `dark:` counterpart.** A
light-only `text-slate-500` on a dark surface measures 4.23:1 against a dark
background and fails the 4.5:1 threshold — exactly the bug that shipped in the
scholarship detail page. Decorative `aria-hidden` icons are exempt. Headings in
dark mode are `slate-100`, not `#ffffff`, which glares on a charcoal canvas.

### Accessibility
Lighthouse Accessibility is **100** on the audited pages; keep it there. The
conventions that get it there:

- `PageHeader` provides the single `<h1>` for a page.
- Every form control has an `id` and a `label`; errors render with
  `role="alert"` and are tied to the control via `aria-describedby`.
- `Dialog` traps Tab, closes on Escape, locks scroll and restores focus.
- `ConfirmDialog` guards every destructive or irreversible action.
- Global `:focus-visible` styling lives in `src/index.css`.

---

## 7. Code conventions

- 2-space indent, **single quotes**, **no semicolons**.
- No `enum` (`erasableSyntaxOnly`). Use union types and `const` arrays.
- Use `import type { X } from '...'` for type-only imports
  (`verbatimModuleSyntax`).
- **Relative imports use explicit extensions** (`'../../lib/api.ts'`,
  `'./Foo.tsx'`). The single exception is the UI barrel: `'../../components/ui'`.
- `noUnusedLocals` / `noUnusedParameters` are **on**: an unused variable fails
  the build, not just lint.
- Files that export components must export **only** components — that is why
  `buttonClasses`, `controlClasses` and `describedBy` live in
  `buttonStyles.ts` / `formStyles.ts` rather than beside their components.
  (`react/only-export-components`.)
- Do not name a plain function `useSomething` — lint treats it as a hook and
  rejects calls from callbacks.

---

## 8. Business rules — do not break these

These come from the project brief and are enforced in code. Treat them as
regression risks.

| # | Rule | Where it lives |
| - | ---- | -------------- |
| 1 | Placeholder listings must be replaced with verified provider data before publishing | `src/data/sampleData.ts` (see the note below the table) |
| 2 | Internal vs externally handled applications must stay distinguishable | `Scholarship.applicationMode`; copy on both applications screens |
| 3 | External application links must be shown when supplied | `ScholarshipDetailPage` |
| 4 | An application must never become a grant automatically | `grantsApi.confirmFromApplication` is the only path; `awaitingGrantConfirmation()` surfaces the gap |
| 5 | Semester registration is for existing grantees, tracked separately | `SemesterRegistrationPage` gates on holding a grant |
| 6 | Only administrators manage listings, reviews and grant records | `ProtectedRoute role="admin"` + admin-only routes |
| 7 | Students may only read/modify their own private records | `applicationsApi.get(id, studentId)` ownership check |
| 8 | Private records must not be reachable from public routes | No private data is fetched on public pages |
| 9 | Realistic empty states and validation messages, never fake successes | `EmptyState`, inline errors, toasts only after real effects |
| 10 | Nothing is claimed that is not implemented | No toast or copy asserts an email, upload or server write occurred |

**Note on labels.** Earlier revisions labelled placeholder listings in the
interface — a site-wide banner, per-card `Sample data` badges, a per-record
`isSample` field, and a disclaimer block on the About page. **All of that was
removed by explicit product decision.** Do not re-add labelling or
"demonstration prototype" copy to the UI without being asked. The records in
`src/data/sampleData.ts` are still placeholders with generic provider names, and
`README.md` documents that for developers.

Two subtleties that are easy to regress:

- **Withdrawing an application sets its status to `rejected`** (there is no
  separate `withdrawn` state), so withdrawn items appear under "Closed".
- **Reference numbers must stay unique.** The demo sequence counters reset on
  page load, so always allocate them through `nextReference(kind, existingRefs)`
  in `api.ts` — never call `createReferenceNumber` directly from a mutation.

---

## 9. Security posture (read before changing anything auth-related)

`ProtectedRoute` and the role checks are **navigation, not security**. The whole
application runs in the browser, so they can be bypassed with devtools, and the
demo database (including plain-text demo passwords) sits in `localStorage`.

A real deployment must:

- authenticate on a server and store only hashed credentials,
- enforce every authorisation rule server-side (especially application
  ownership and grant confirmation),
- keep private student information and uploaded documents off public routes,
- never place secrets in `VITE_*` variables, which are bundled into the client.

Do not present the current implementation as secure.

---

## 10. Machine / environment notes

- Node lives in a managed toolchain directory, not a global install:
  `C:\Users\reyes\toolchains\node\node-v24.21.0-win-x64\`. `npm` resolves via
  `npm.ps1`, so `Start-Process npm` fails on Windows — invoke npm through a
  shell or use `npm.cmd`.
- **pnpm, yarn and bun are not installed.** corepack (0.36.0) is available but
  this project targets npm.
- No global git identity is configured; the repo carries its own
  (`reyestimothy252` / `reyestimothy252@gmail.com`, repo-local only).
- Source files use **LF**; `.gitattributes` enforces it (`* text=auto eol=lf`).
- Working directory: `C:\Users\reyes\Desktop\my-website`.

---

## 11. Verification log

Newest first. Record the command and its observed result.

### 2026-10-19 - scholarship sharing and QR codes (decoded, not eyeballed)

- `npm run lint` clean; `npx tsc -b` clean; `npm run build` clean.
- The Share dialog opens from the listing sidebar and renders a 29x29 QR
  (version 3, EC level M) inside a 4-module quiet zone.
- **The code was decoded, not inspected.** The rendered SVG's modules were
  extracted, rasterised, and read with OpenCV's `QRCodeDetector`:
  `decoded: 'http://localhost:5173/scholarships/sch_008'` — the exact URL in the
  field beside it. A screenshot can show a plausible-looking QR that does not
  scan, so this is the check that matters.
- Escape closes the dialog and returns focus.
- `navigator.clipboard.writeText` was refused in the test browser; the
  selection-based fallback ran and the failure was reported as a toast rather
  than a false success. Copying therefore degrades instead of silently doing
  nothing.
- Note: adding the dependency triggered Vite to re-optimise and reload, so the
  first page load after installing it was blank for a few seconds. Not a defect.

### 2026-10-19 - typography sweep, OTP and a full route sweep (all passing)

- `npm run lint` clean; `npx tsc -b` clean; `npm run build` clean — 20
  prerendered pages. Home now emits its own title (`Scholar - Scholarships in
  Pampanga`) instead of inheriting the shell title.
- **Route sweep, 27 routes, zero console errors and zero text anomalies**
  (`undefined`, `NaN`, `[object Object]`, replacement characters):
  - public: home, directory, listing detail, about, faqs, login, register,
    forgot-password, 404
  - student, signed in: dashboard, profile, saved, applications, documents,
    semester registration, grants, notifications
  - administrator, signed in: dashboard, scholarships, students, applications,
    registrations, grants, documents, announcements, reports, settings
- **OTP verified over real HTTP**, so the security properties are demonstrated
  rather than asserted:
  - a new registration reports `emailVerified: false`
  - the console transport printed the code, which was then accepted (200)
  - a code cannot be replayed after use (400)
  - five wrong guesses exhaust the challenge — the **correct** code is then
    refused
  - a `verify-email` code is refused when presented for `reset-password`
  - the reset set a new password; the old password then returns 401 and the
    new one 200, and existing sessions were deleted
  - an unknown address returns a byte-identical reply to a known one
- **The `(?)` affordance verified in the browser**: `role="tooltip"`, hidden at
  rest, revealed on hover and focus, and readable with a real border and
  surface in both themes.
- **Two environment traps, neither a defect**, recorded so they are not
  re-diagnosed as bugs:
  1. After a dev-server restart the first page load took **over 12 s** — Vite
     transforms the whole graph unbundled. A probe at 5-9 s therefore sees an
     empty `#root` and reports a false failure.
  2. With **22 browser tabs** open, pages stopped rendering entirely. Closing
     them restored normal behaviour.
  Also: `Get-NetTCPConnection -LocalPort 8787` before concluding a route is
  missing, and `npm run dev` resurfaces stale module graphs after bulk file
  rewrites — a restart fixes `does not provide an export named …`.

### 2026-10-19 - Google sign-in and the profile-completion gate (verified)

- `npm run lint` clean; `npx tsc -b` clean; `npm run build` clean — 20 pages.
  Migration `20261019093734_google_sign_in` applied.
- **Unconfigured behaviour is honest.** With `GOOGLE_CLIENT_ID` unset,
  `GET /api/auth/google/config` returns `{configured:false}`, the login page
  renders **no button and no "or" divider**, and the GIS script is never
  fetched. `POST /api/auth/google` returns **503**. Nothing advertises a
  capability that is not wired.
- **The important security case:** a Google-created account stores an empty
  `passwordHash`. Signing in with an empty password returns **401**
  ("Those credentials did not match any account"), as does a guessed password.
  The login route refuses any account with no hash rather than asking
  `verifyPassword` to check against nothing.
- **Existing password accounts are unaffected:** a normal login still returns
  200 with `profileComplete: true, hasPassword: true, usesGoogle: false`.
- **Token verification path exercised:** malformed credentials are rejected
  401 with a specific message; audience, issuer and expiry checks are all
  present in `server/googleAuth.ts`. A real Google token could not be tested
  here because it needs a Cloud OAuth client, so the signature path is
  exercised only by construction.
- **Route guard, in the browser:** with a session for a `profileComplete:false`
  account, a deep link to `/student/grants` lands on `/welcome`; the email is
  pre-filled and disabled; submitting with an invented municipality is refused;
  submitting a real one returns 200 and the session then reports
  `profileComplete: true`.
- **A real gap found and closed:** the server accepted `municipality: "Angola"`
  (not a Pampanga LGU) in the earlier HTTP test, because only the client's
  select constrained it. `POST /api/auth/google/complete` and
  `POST /api/auth/register` now validate against `MUNICIPALITIES_ONLY`.
- Note: the first browser attempt failed because a previous session was still
  active, so `GuestOnlyRoute` never rendered the login form and the script hit
  missing inputs. Sign out first when testing an auth screen.

### 2026-10-19 - document upload, classification and review (verified end to end)

- `npm run lint` clean; `npx tsc -b` clean; `npm run build` clean — 20
  prerendered pages.
- **Migration applied:** `20261019085257_student_documents` created the
  `StudentDocument` table against SQLite. `npx prisma generate` run first.
- **Verified over real HTTP** with the API on :8787 and curl cookie jars:
  - upload with an explicit classification → 201, `enrollment`
  - upload with the classification left empty → the server classified
    `my-transcript-2026.pdf` as `grades` and titled it "My transcript 2026"
  - a `text/plain` upload → `400 Upload a PDF, JPEG or PNG file.`
  - download → 200, `application/pdf`, `Content-Disposition: attachment`,
    **809 bytes out for 809 in** (byte-exact)
- **Authorisation matrix, all as intended:** signed out 401 · owner 200 ·
  admin 200 · student verifying their own document **403** · rejecting without
  a note 400 · rejecting with one 200 · verifying 200 · invalid classification
  400 · student deleting a verified document **409** · admin deleting 200, row
  gone, file gone.
- **Browser run, student:** a real `File` dropped into the input pre-filled the
  title and classification from the name (`barangay-residency-certificate.pdf`
  → "Proof of residency"), upload succeeded, the toast named the saved title,
  the input and title cleared, and the list regrouped under a new heading.
- **Browser run, administrator:** the queue showed "2 awaiting review", Review
  opened with classification and note fields, "Return to student" was disabled
  until a note existed, verifying moved the count to "1 awaiting review", and
  the student's view then showed the Verified badge.
- **Two defects found by looking at the rendered page and fixed:** the section
  heading read "All documents reviewed" while the list was still loading, and
  the dialog wrapped `Select` in a `Field`, producing two labels for one
  control. A third was fixed on the student side: Remove was offered on a
  verified document the server would refuse to delete.
- **Note on a false failure:** the first HTTP run returned
  `No route for POST /api/documents` because a server started at 15:32 was
  still holding port 8787, so requests reached pre-document code. The second
  run, after killing it, passed. Check `Get-NetTCPConnection -LocalPort 8787`
  before concluding a route is missing.

### 2026-10-19 - FAQ, diagrams and a retuned dark theme (all passing)

- `npm run lint` clean; `npx tsc -b` clean; `npm run build` clean — **20
  prerendered pages** (14 listings plus home, directory, about, faqs, login,
  register) and **19 sitemap URLs**.
- **About page diagrams render.** The lifecycle rail shows all 6 stages in
  order; the site map renders 3 role columns and 18 real links. Console empty.
- **Dark theme measured in the browser** with the toggle, not by poking
  `localStorage` (the storage write races the reload — the control is the
  reliable path). With `.dark` applied:
  - canvas `oklch(0.205 0.007 265)` — previously `slate-950`, `#020617`
  - body text `oklch(0.869 0.022 252.894)`
  - headings now `slate-100` rather than pure white
- The remap was mechanical and audited: **124** `dark:` surface/border
  utilities across 42 files moved from `slate` to `ink`, **0** left behind, and
  **55** `dark:text-white` heading colours softened. Verified by counting both
  the remaining old class and the new token after the sweep.
- **The two modal scrims were checked specifically** (`bg-slate-900/40`, no
  `dark:` variant). Because the sweep changes only `dark:`-prefixed utilities
  and does not redefine Tailwind's `slate` variables, the scrims keep their
  near-black value in both themes and stay correct.

### 2026-10-19 - client wired to the API (all pages verified)

- **`src/lib/httpApi.ts`** implements the whole data-layer surface over HTTP,
  mirroring `src/lib/api.ts` method for method. `src/lib/api.ts` selects between
  the two at module load from `VITE_API_BASE_URL`, so no page changed.
- **Async session hydration.** An httpOnly cookie cannot be read by JavaScript,
  so `AuthProvider` starts in `initialising` and `ProtectedRoute` /
  `GuestOnlyRoute` wait before deciding. Verified: a refresh keeps the session
  instead of bouncing to the login screen.
- **Verified against a running API** as both roles: 7 student pages and 9
  administrator pages all rendered with real data - application references
  (SCH-APP-2026-0006, 0003, 0002, 0005), grants (SCH-GRT-2026-0001), 10
  scholarship rows, 4 students, 25 report rows. Console empty of errors.
- **Server gaps filled** for the client: educationLevel, deadlineWithinDays,
  featured and sort on the scholarship query; create/update/delete for listings;
  `query` search on applications, registrations and grants; `GET /api/stats`.
- **Bug found and fixed:** `scholarshipQuery({})` returns an empty string, so
  `listAll` produced `/api/scholarships&pageSize=1000` - an `&` with no `?`,
  matching no route. The applications page depends on that call for scholarship
  names and never resolved. Both `list` and `listAll` now build through the one
  `queryString` helper so the separator cannot be wrong.
- **Router fix:** static segments now win over parameters. Previously
  `/api/applications/counts` was captured by `/api/applications/:id`.
- **Timeout added** to the HTTP client, so a request that never settles fails
  with a message instead of leaving the UI on a spinner indefinitely.
- **`GET /api/accounts` removed.** The API no longer serves passwords.
- Note for future debugging: a dev-server page load measures ~4 s because Vite
  serves modules unbundled and re-transforms the graph after an edit. The
  production chunk for the same page is 2-3 kB gzipped. That is a dev
  characteristic, not a product defect - and it is what a long "Loading page…"
  in development means.

### 2026-10-17 — Tier 1 chunk 1: prerendering, Open Graph and a PWA (all passing)

**Prerendering.** `npm run build` now runs `scripts/prerender.ts` after
`vite build`. Verified on the built output:

- 19 pages written (14 published listings plus home, directory, about, login,
  register), each a real file at `dist/scholarships/<id>/index.html`.
- A prerendered listing carries exactly **one** `<title>` and **one**
  `description` (no duplicates from the shell), plus `og:title`,
  `og:description`, `og:image`, `og:url`, `og:image:width/height`,
  `twitter:card` and a canonical link.
- The SPA body is preserved: `id="root"` and the inline theme script survive, so
  the page still behaves like an app once the bundle loads.
- `login` is marked `noindex` — an auth screen has nothing to offer a search
  result.

**Generated crawler files.** `sitemap.xml` now lists **19 URLs including all 14
listing pages** (previously 5 static routes and no listings, because the listings
were browser-side). `robots.txt` is generated with the real domain.

**Images and PWA.** Verified present in `dist/` and valid: `og-image.png`
(1200×630), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`,
`manifest.webmanifest`, `sw.js`.

**Service worker.** Served the real build with `vite preview` and loaded it:
the app boots (3 featured listings, correct `h1`), the manifest link is present,
`theme-color` resolves to `#7c1d20`, and
`navigator.serviceWorker.getRegistrations()` reports **1 registration** scoped to
the origin. Precache list reports `/`, `/index.html`, `/manifest.webmanifest`,
`/favicon.svg`, `/icon-192.png`. The API is deliberately never cached.

**Two bugs found and fixed while verifying this:**
1. The generated PNGs were written only into `public/`, which Vite had already
   copied into `dist/` by the time the script ran — so they never reached the
   build. The script now writes to both.
2. The hand-written `capBase` drawing primitive placed its shape at x≈1080 on a
   1200px canvas instead of the centre. Decoding the PNG pixels showed it
   precisely. Rather than debug a primitive whose output was invisible on the
   icon anyway, it was deleted and the mark is built from the two shapes that
   provably render correctly — a centred diamond and a gold rule.

- `npm run lint` clean; `npm run build` clean, including type-checking
  `scripts/` via `tsconfig.server.json`.

### 2026-10-17 — dark mode and UI refinement pass (all passing)

- **Dark mode** is class-based and toggleable, with `ThemeProvider` persisting
  the choice and an inline script in `index.html` applying it before first
  paint. Verified: toggling sets `.dark` on `<html>`, stores `pgc-theme`, and
  survives a reload; body computes to `slate-950`, cards to `slate-900` with
  white headings.
- **Lighthouse in dark mode** on home, directory, detail, login, student
  dashboard, admin dashboard and admin grants: **Accessibility 100, Best
  Practices 100, SEO 100, zero failures** on all seven.
- **Four real defects found by auditing the rendered UI rather than the code:**
  1. Every scholarship description ended with **two full stops** — my own
     earlier bulk edit replaced the "Sample content — illustrative only."
     sentence with `"."` instead of removing it. Fixed in the source and
     `DB_VERSION` bumped to 3 so browsers re-seed; the database was re-seeded
     and the API now returns 0 descriptions ending in `..`.
  2. Section headings were **14px, identical to body text**, so hierarchy rested
     on weight alone. Raised to 16px: h1 24 → section 16 → body 14 → meta 12.
  3. The default "Soonest deadline" sort **led with expired listings** ("Closed
     5 days ago" ranked first). Open listings with a future deadline now rank
     above closed ones, in both the client and the API.
  4. Card footers **did not line up across a row**; the card is now a flex column
     with the footer pushed to the bottom.
- Also fixed: the directory search input was 224px and clipped its own
  placeholder; the dashboard top bar rendered an `h2` before the page's `h1`;
  the notification count used the semantic danger colour; one `text-slate-500`
  had no dark counterpart (4.23:1, below threshold).
- `npm run lint` clean; `npm run build` clean.

### 2026-10-17 — SQLite database and API server (verified end to end)

- **Schema and migration:** `prisma/schema.prisma` with 13 models mirroring
  `src/types/index.ts`. `npm run db:migrate` created `prisma/dev.db`; the
  migration applied cleanly.
- **Seed:** `npm run db:seed` loaded 5 users, 15 scholarships, 10 applications,
  20 timeline entries, 4 registrations, 5 grants, 6 announcements,
  7 notifications and 6 bookmarks, with passwords stored as scrypt hashes.
- **Server:** `npm run server` starts a dependency-free Node API. Verified over
  real HTTP:
  - `GET /api/health` → 200
  - login with a wrong password → 401 with a generic message, **byte-identical**
    to the response for an unknown email address (no account enumeration)
  - student login → 200, `Set-Cookie: pgc_session=…; HttpOnly`
  - `GET /api/auth/session` with the cookie → 200 with the user
  - `GET /api/applications` as a student → 6 rows, **1 distinct student** (scoped
    on the server, not in the browser)
  - student calling the admin-only `GET /api/scholarships/options` → **403**
  - student reading **another student's** application → **403**; their own → 200.
    This check was previously bypassable with developer tools.
  - `POST /api/saved/sch_003/toggle` → persisted and reflected in the list
  - logout → 200, and the session endpoint then returns `null`
- **Type checking the server paid off immediately.** Node strips TypeScript
  without checking it, so `tsconfig.server.json` was added and referenced from
  `tsconfig.json`. The first run caught an unused import and a missing required
  `createdAt` on two `Notification` creates that would have thrown at runtime.
- `npm run lint` clean; `npm run build` clean (app bundle unchanged at
  290.59 kB, since the server is not part of the bundle).

### 2026-10-17 — premium/minimal redesign (all passing)

- **Build/lint:** `npm run lint` clean; `tsc -b` + Vite build clean, no
  warnings. Initial bundle **290.59 kB (85.65 kB gzip)**, down from 294.64 kB.
- **Palette verified in the browser:** the primary button computes to
  `oklch(0.38 0.14 18)` (maroon), the canvas to `oklch(0.988 0.002 80)`
  (near-white), and the masthead rule to a maroon→gold gradient.
- **Density reduction, measured:**
  - Home dropped from ~4,759 to **1,409** characters of rendered text, with two
    page sections instead of seven.
  - Student dashboard dropped from a stat-card grid plus three card grids to
    **814** characters: one "Your next step" action, an application-count band,
    and a recent-updates list.
  - Student profile now renders **0 editable inputs** until "Edit profile" is
    chosen, down from every field being editable at once.
- **Route sweep:** every student and admin page was loaded with a session
  seeded for the right role. Student: dashboard, profile, applications (6 rows),
  grants (2 rows), registration, notifications. Admin: dashboard, grants
  (5 rows), reports (5 tables / 25 rows), scholarships (10 rows),
  announcements (now a plain list, 0 cards), applications. Console empty of
  errors throughout.
- **Lighthouse** on home, directory, detail, about, student dashboard, admin
  dashboard, admin grants and admin applications: **Accessibility 100, Best
  Practices 100, SEO 100, zero audit failures.**
- **Two regressions found and fixed by that audit:** the directory jumped
  `h1 → h3` (fixed with a visually hidden "Search results" `h2`), and the
  dashboard shell's sidebar label used `slate-400` on white (≈2.6:1), failing
  contrast on every authenticated page — raised to `slate-500`, along with the
  notification relative-time, the dialog close control, the 404 eyebrow and the
  unsaved-bookmark icon.

### 2026-10-17 — release polish: disclaimers removed, home page rebuilt (all passing)

- **Build/lint:** `npm run lint` clean; `tsc -b` + Vite build clean, no
  warnings. Initial bundle fell from 368 kB to **294.56 kB (86.23 kB gzip)**.
- **Disclaimer sweep:** the rendered text of every public page (home, directory,
  both detail variants, about, login, register, 404) and the student and admin
  pages was scanned for `Demonstration prototype`, `Sample data`, `placeholder`,
  `not implemented`, `not secure`, `no backend`, `This prototype`, `Illustrative`
  and `demo mode`. **Zero matches**, and the word "Sample" no longer appears on
  any page. The login screen now reads "Test accounts".
- **Home page rebuild:** all five new sections render — Announcements and
  advisories, Featured opportunities, Browse by category, Closing soon, How this
  works. Stats band reports 13 open listings, 12 providers, 7 municipalities and
  7 closing within 30 days.
- **Advisory accordion:** 6 dated `<details>` items with the first open by
  default; clicking a second moved the open count 1 → 2, clicking again returned
  it to 1.
- **Footer:** office block renders the name, address, telephone and email;
  `mailto:`/`tel:` links present.
- **Schema migration:** `DB_VERSION` bumped 1 → 2 so browsers holding the
  previously labelled seed data discard it and re-seed. Verified by loading the
  app with stale `localStorage` present and confirming the new copy appeared.
- **Accessibility:** Lighthouse on home, directory, detail and about returned
  Accessibility / Best Practices / SEO all **100**. An informational
  `label-content-name-mismatch` (weight 0, so it did not affect the score) was
  traced to the account-menu avatar: the accessible name "Account menu" did not
  contain the visible initials. The initials are now rendered through a
  pseudo-element so they are purely decorative, and the audit reports **zero
  failures**.
- **Regressions:** filters, URL seeding, empty states, pagination, detail-page
  application modes, route guards and the ownership check were re-checked after
  the refactor. Console was empty of errors throughout.

### 2026-10-17 — full browser smoke test of every route (all passing)

Built with `npm run build`, served with `npm run preview` (port 4173), driven
through a real browser. Console was empty of errors on every page visited.

- **Build/lint:** `npm run lint` clean; `tsc -b` + Vite build clean, no
  warnings. 173 modules; initial bundle 368.12 kB (108.57 kB gzip) after route
  level code splitting (was 520.33 kB before splitting).
- **Public routes:** `/` (11 scholarship links, 5 category tiles, demo banner
  and sample notices present), `/scholarships`, `/scholarships/:id`, `/about`,
  `/login`, `/register` all render.
- **Filters:** `?type=private` → "1 listing found" with the type select seeded;
  `?q=vocational` → "2 listings found" with the search box seeded;
  `?q=zzzznomatch` → "0 listings found" plus the empty state; unfiltered →
  "14 listings found" (15 records minus the draft) with pagination.
- **Detail page:** an external listing shows the provider link and the
  "handles its own applications" notice and no in-platform CTA; an internal
  listing shows "Apply through this platform" and a sign-in CTA; an unknown id
  shows the neutral "Scholarship not found" state.
- **Route guards:** signed out, `/student/dashboard` and `/admin/dashboard`
  both redirect to `/login`; signed in as a student, `/admin/dashboard`
  redirects to `/student/dashboard`.
- **Ownership (rule 7):** the student's own application renders; another
  student's application renders the neutral not-found state and **does not leak
  its reference number**.
- **Student area:** all 8 routes render. Dashboard reports 4 saved, 4
  applications in progress, 1 pending registration, 2 confirmed grants
  (₱30,000).
- **Admin area:** all 10 routes render. Data confirmed present: scholarships
  table, 4 student records, 12 review actions, 4 registrations, 5 grants,
  5 report tables (25 rows), settings form with live demo counts.
- **Business rule 4 end to end:** approving an application recorded the
  decision (row moved to *Approved*, `localStorage` status `approved`) but
  created **no** grant; the application then appeared under "Awaiting grant
  confirmation" with the notice "Confirmed here — and only here"; confirming the
  grant created the record (₱9,500, 2nd Semester) and the UI reloaded to
  ₱68,500 total, 6 grants, awaiting back to 0.
- **Lighthouse** (`/` and `/scholarships`): **Accessibility 100, Best Practices
  100, SEO 100**.
- **404:** an unknown URL renders the standalone "Page not found" page.

### 2026-10-17 — toolchain baseline verification
- `npm run lint` clean; `npm run build` succeeded (16 modules, 166 ms);
  dev server booted on port 5173 and served the transformed entry module.

---

## 12. Change log

Newest first. One entry per meaningful change.

### 2026-10-19 - share a listing as a link or a QR code

- **`src/components/ShareScholarship.tsx`** adds a Share button to the listing
  sidebar. It opens a dialog with a QR code, the address, a Copy Link button and,
  where the browser supports it, the native share sheet.
- **The QR is generated in the browser**, not fetched from an image service: a
  listing URL reveals which scholarship a student is looking at, and that is not
  something to hand a third party for a picture.
- **Always dark-on-white with a four-module quiet zone, in both themes.** A code
  recoloured for dark mode does not scan reliably.
- `qrcode-generator` is used for the encoding only; the SVG is drawn here. This
  is the one client dependency chosen over a hand-rolled implementation — see
  the dependency note in section 3 for the reasoning and the verification
  requirement.
- Copy falls back to selecting the field and `document.execCommand('copy')` when
  the Clipboard API is unavailable or refused, and reports failure rather than
  claiming success.

### 2026-10-19 - OTP verification, sign-up prerequisites, typography, rename

- **Renamed to Scholar.** User-facing copy, the manifest, the prerendered
  titles, the documentation and the reference prefix (`PGC-` → `SCH-`) all
  follow the new name. Internal `pgc-theme` / `pgc:` storage keys and the
  `pgc_session` cookie were deliberately left alone: they are not user-visible,
  and changing them would invalidate sessions and stored preferences for no
  benefit.
- **`server/otp.ts`** — one-time codes on the same primitives as passwords
  (scrypt, constant-time compare, `node:crypto`). A six-digit code is
  low-entropy, so the hash is not what makes it safe: a 10-minute expiry, a
  five-attempt cap, a 60-second resend cooldown, an hourly ceiling per account,
  single use and a per-purpose scope are. A code issued to confirm an address
  cannot be replayed to reset a password.
- **`server/mailer.ts`** — a transport seam with a console implementation. It
  prints the message, including the code, to the server log, which is exactly
  what a demonstration needs. `MAIL_TRANSPORT` swaps it; an unknown value fails
  loudly rather than pretending a message was sent. The API reports
  `delivery: 'log' | 'email' | 'none'` so the interface can say where the
  message actually went.
- **Endpoints:** `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`.
  Requests answer identically whether or not the address belongs to an account,
  so the endpoint cannot enumerate students.
- **`EmailVerificationSection`** on the profile, and **`/forgot-password`**.
  Verification is a signal, not a gate — a deployment without mail configured
  must still be usable.
- **Sign-up now collects the student details as prerequisites**, in a two-step
  form, because eligibility is decided on them: a municipal scholarship needs a
  barangay, an age-limited one needs a birth date. `StudentDetailsFields` is
  shared by registration and the Google profile step so the two cannot drift.
  Server-side validation lives in one `readStudentDetails` function used by
  both routes.
- **`HelpHint`** replaces permanent explanatory text with a `(?)` that reveals
  it on hover, focus or tap. `Field`, `Section` and `PageHeader` all fold their
  `hint`/`description` into it, so every page inherited the change at once.
  Errors stay inline and are still announced with `role="alert"`.
- **Typography convention** applied across the app: Title Case for titles,
  headings, navigation, buttons, form labels, options and statuses; sentence
  case for descriptions, hints, placeholders, validation messages and loading
  states. Loading text was corrected back to sentence case after an initial
  sweep over-applied Title Case to it.
- **Home page was missing from the prerender list** even though the count
  included it, so `dist/index.html` shipped the shell title. It now has its own
  entry.

### 2026-10-19 - Google sign-in, with a profile-completion step

- **`server/googleAuth.ts`** verifies a Google ID token without a client
  library: RS256 against Google's published JWKS (honouring the response's
  `Cache-Control`, refetching once on an unknown `kid`), with `aud`, `iss` and
  `exp` checks. The algorithm is **pinned to RS256**, so a token cannot ask to
  be verified with `none`. Implemented on `node:crypto`, in keeping with the
  project's habit of hand-rolling bounded, well-understood problems.
- **Google Identity Services is the only library used**, and the flow is the
  **ID-token** one, which is what GIS is designed for. The older
  `gapi.auth2`/`platform.js` were retired on 31 March 2023. The token is opaque
  to the browser: it is forwarded to the API, which verifies it. The client
  secret never reaches the client.
- **Identity is keyed on `sub`, never email** — Google is explicit that an
  address can change and `sub` cannot. `User.googleSub` is unique and nullable.
- **Linking is refused, not faked.** Signing in with Google using the address of
  an existing password account returns 409 with a specific message, because
  merging without proving control of the existing account would let anyone who
  registers that address take it over. `googleIsAuthoritative()` records which
  addresses Google actually vouches for (`@gmail.com`, or Workspace with `hd`).
- **A Google account has no password.** `passwordHash` is an empty string, and
  the login route refuses any account with no hash — so an empty password can
  never authenticate one.
- **`profileComplete`** drives a new `/welcome` step. Google returns only a name
  and an email, while everything behind the student area assumes a profile, so
  `ProtectedRoute` diverts an incomplete account there and releases it on
  success. `POST /api/auth/google/complete` is separate from `PATCH /api/profile`
  because it is the one-time step that turns a bare account into a student
  record.
- **`src/components/GoogleSignInButton.tsx`** loads GIS lazily and renders the
  official button; it returns `null` when the API reports no client id, so the
  control is never offered and then broken (rule 10).
- `GET /api/auth/google/config` tells the browser whether sign-in is available
  and with which client id, so one build works against any deployment and no
  client id is baked into a `VITE_*` variable.
- **Server-side municipality validation** added to register and profile
  completion, closing a gap the client-only select left open.

### 2026-10-19 - document upload, classification and review

- **`StudentDocument`** (Prisma + `src/types/index.ts`) files a document against
  the **student profile**, not an application, because one certificate of
  enrolment is evidence for every listing a student applies to. `applicationId`
  is set only when a file was attached to one particular application.
- **Classification is shared code.** `src/lib/documents.ts` holds the keyword
  classifier, the accepted types (PDF/JPEG/PNG), the 5 MB cap and the title
  guess. It works on strings rather than `File` or `fs`, so the browser and the
  server run the *same* function — the suggestion a student sees is the one the
  server would have made, so correcting it is a real choice rather than two
  implementations disagreeing.
- **`server/uploads.ts`** — a narrow hand-rolled `multipart/form-data` reader
  (one file plus text fields), and a file store under `uploads/` beside the
  database. The stored name is the document id plus an extension derived from
  the **content type**, never from the uploaded name, which is the one part of
  an upload the sender controls and which ends up in a filesystem path.
- **Endpoints:** `GET /api/documents`, `GET /api/documents/records` (admin, with
  owner), `POST /api/documents`, `GET /api/documents/:id/file`,
  `PATCH /api/documents/:id`, `DELETE /api/documents/:id`.
- **The split of authority is the point.** A student may rename and reclassify
  their own file; only an administrator may mark it verified or rejected, and a
  rejection must carry a note. A verified document cannot be deleted by the
  student — it is the evidence a decision rested on — and the UI does not offer
  the control, so the rule is not discovered as an error.
- **Downloads are always `Content-Disposition: attachment`.** An uploaded file is
  untrusted content and must never be rendered inline on this origin.
- **`src/pages/student/DocumentsPage.tsx`** — upload with the classification
  pre-filled from the file name and editable, then the library grouped by
  classification.
- **`src/pages/admin/AdminDocumentsPage.tsx`** — a review queue filtered to
  `submitted` by default, with a dialog to reclassify, verify, or return with a
  note.
- `DB_VERSION` bumped to 4; the local data layer stores bytes as data URLs so
  the demo build can still open a file. `uploads/` is git-ignored.

### 2026-10-19 - dark theme retuned, FAQ page, site diagrams, hero illustrations

- **The dark theme no longer uses Tailwind's `slate` for surfaces.** `slate-950`
  is `#020617` — near-black — which made every dark page read as a hard, glaring
  block. `src/index.css` now defines a dedicated `ink-600..950` ramp (a neutral
  charcoal) that only ever appears behind a `dark:` variant, so the token value
  *is* the dark value and nothing has to be overridden. Elevation steps lighter,
  exactly as it does in light mode: canvas `ink-950` → surface `ink-900` →
  border `ink-800`. Headings in dark mode are `slate-100`, not `#fff`.
- **Applied by sweeping the `dark:` utilities** (124 surface/border occurrences
  across 42 files, plus 55 heading colours). Mapping only the `dark:`-prefixed
  utilities is what keeps it safe: utilities such as the modal scrim
  `bg-slate-900/40` are light-mode declarations and keep their original value.
- **`src/pages/public/FaqPage.tsx`** — a new `/faqs` route with 7 grouped
  sections, wired into the router, the public nav, the footer and the
  prerenderer.
- **`src/components/Illustrations.tsx`** — hand-authored SVG line art for the
  hero and the three process steps, revealed with a measured stroke-dash
  animation (`--draw-length`, set from `getTotalLength()`), with the resting
  state fully drawn so the artwork survives a browser that never runs the
  animation.
- **`src/components/Diagrams.tsx`** — `SiteMapDiagram` (three role columns whose
  links genuinely navigate) and `LifecycleDiagram` (the application stages, with
  the grant-confirmation step marked as the one that releases funds). Both use
  real HTML text rather than SVG text, which would be unselectable, unsearchable
  and illegible at phone widths. They replace the prose block that previously
  explained the same distinctions on the About page.
- **`src/hooks/useInView.ts`** — a small reveal-on-scroll hook with a positive
  bottom `rootMargin`, so sections start revealing slightly before they enter the
  viewport instead of painting late.
- **Home page** rebuilt around the hero search, the three-step process and an
  "Announcements and advisories" accordion; the scholarship listings were removed
  from it by product decision.

### 2026-10-19 - client wired to the API, spec sheet and deployment guide

- **`src/lib/httpApi.ts`**: the whole data layer over HTTP, mirroring the local
  implementation. `src/lib/api.ts` now picks between them at module load from
  `VITE_API_BASE_URL`, which is why no page needed to change. Local
  implementations were renamed `local*` and the twelve exports became a single
  conditional binding at the foot of the file.
- **Async session hydration** in `AuthProvider`, with `ProtectedRoute` and
  `GuestOnlyRoute` waiting on `initialising`. An httpOnly cookie is invisible to
  JavaScript, so the session has to be fetched before a route guard can decide.
- **`src/lib/testAccounts.ts`** holds the demo credentials, replacing
  `GET /api/accounts`. The API no longer serves passwords at all.
- **Server additions**: scholarship mutations; educationLevel,
  deadlineWithinDays, featured and sort filters; `query` search on
  applications, registrations and grants; `GET /api/stats`.
- **Router now prefers static segments over parameters**, collected and scored
  rather than matched in registration order. This fixed static paths such as
  `/api/applications/counts` being captured by `/api/applications/:id`.
- **Client request timeout**: a hung request now surfaces an error rather than
  an indefinite spinner.
- **`SPEC.md`** and **`DEPLOY.md`** added; `vercel.json` stopped excluding only
  `assets/`, which would have rewritten `/api/*` to `index.html`.

### 2026-10-17 - prerendering, Open Graph, PWA (Tier 1, part 1)

- **`scripts/prerender.ts`** runs after `vite build` (wired into `npm run
  build`). It writes one HTML file per public route with per-page `<title>`,
  description, canonical and Open Graph/Twitter tags, then regenerates
  `sitemap.xml` (now including every published listing) and `robots.txt` with
  the real domain. `SITE_URL` controls the origin and defaults to
  `https://example.com`.
- **Brand images generated with no dependency**: a small PNG encoder using
  `node:zlib`, drawing a centred diamond and gold rule on maroon. Writes
  `og-image.png` (1200×630), `icon-192/512.png` and `apple-touch-icon.png` into
  both `public/` (dev, committed) and `dist/` (the build — Vite has already
  copied `public/` by then).
- **PWA**: `public/manifest.webmanifest` with shortcuts, plus a service worker
  emitted by the prerender script. It precaches the app shell, caches hashed
  assets on first use and serves the cached shell when a navigation fails
  offline. `/api/` is never cached. Registered in production builds only, via
  `src/lib/serviceWorker.ts`.
- **`public/sitemap.xml` and `public/robots.txt` deleted** — they are generated
  artefacts now, and the checked-in copies had `example.com` placeholders that
  would otherwise ship.
- `tsconfig.server.json` now also covers `scripts/`.

### 2026-10-17 — dark mode, plus the defects the visual audit turned up

- **Dark mode** (`@custom-variant dark`, `themeContext.ts`, `ThemeProvider.tsx`,
  `ThemeToggle.tsx`): class-based instead of OS-driven, toggled from the public
  header and the dashboard top bar, persisted to `localStorage`, with an inline
  script in `index.html` applying it before first paint to avoid a flash.
  `color-scheme` follows the theme so native controls match. Added `sun`/`moon`
  icons.
- **Defects fixed after auditing the rendered UI:**
  - descriptions ended in `..` — my earlier bulk removal of the "Sample content"
    sentence substituted `"."` rather than nothing; corrected in the source and
    `DB_VERSION` bumped to 3.
  - section headings were the same 14px as body text; raised to 16px.
  - "Soonest deadline" led with expired listings; open listings now rank first
    (client and API).
  - card footers did not align across a grid row; the card is a flex column now.
  - the directory search input clipped its own placeholder; filters now have
    fixed widths on large screens so the search keeps its space.
  - the dashboard top bar used an `h2` ahead of the page `h1`; it is plain text.
  - the notification count used the semantic danger colour; now the accent.
  - one `text-slate-500` lacked a `dark:` counterpart and failed contrast in
    dark mode (4.23:1).

### 2026-10-17 — SQLite database, API server and deployment config

- **Prisma + SQLite.** `prisma/schema.prisma` (13 models). Note the toolchain
  detail: the `prisma` CLI's `latest` dist-tag currently points at an `8.0.0-rc`
  while `@prisma/client`'s points at `7.10.1`, so both are pinned to `7.10.1`.
  Prisma 7 reads the datasource URL from `prisma.config.ts` rather than the
  schema and no longer auto-loads `.env`, and it requires a driver adapter —
  `@prisma/adapter-better-sqlite3`.
- **Seed** (`prisma/seed.ts`) driven from the existing `src/data/sampleData.ts`,
  so the placeholder content has one source of truth. Passwords are hashed with
  scrypt from `node:crypto` rather than stored in plain text.
- **API server** (`server/index.ts`): dependency-free Node `http` with a small
  router, session cookies, and server-side authorisation helpers
  (`requireUser`, `requireRole`, `requireOwnerOrAdmin`). Covers authentication,
  scholarships, saved listings and applications.
- **Supporting modules:** `server/passwords.ts` (scrypt verify with a
  length-checked `timingSafeEqual`), `server/ids.ts` (collision-free reference
  numbers read from the database), `server/mappers.ts` (JSON columns ↔ domain
  types).
- **Dev proxy** (`vite.config.ts`): `/api` proxies to the server so requests are
  same-origin and the session cookie works without cross-origin cookie rules.
- **`tsconfig.server.json`**, referenced from `tsconfig.json`, so the server is
  type-checked. Node strips types without checking them, so without this the
  server would run with silent type errors.
- **Scripts:** `server`, `db:migrate`, `db:seed`, `db:studio`, `db:reset`.
- **`.env.example`** added; `.env` and the SQLite file are git-ignored.
- **Deployment config:** `public/_redirects` and `vercel.json` add the SPA
  fallback, without which a refresh on a deep link returns a 404.
  `public/sitemap.xml` added and `robots.txt` gained its `Sitemap:` directive.
  `public/favicon.svg` replaced the purple Vite starter icon with a maroon and
  gold mark matching the header logo.

### 2026-10-17 — redesign to a modern, minimal interface (maroon and gold)

**Design tokens** (`src/index.css`): replaced the blue accent with a maroon
scale and added a gold scale. Canvas moved to a near-white warm off-white and
the single `shadow-float` token replaced the previous shadow scale. Added an
`.accent-rule` utility for the maroon→gold masthead hairline.

**Primitives rewritten:** `Button`/`buttonClasses` (flat, `rounded-md`, no
resting shadow, only the primary variant carries the accent), `controlClasses`
(no shadow, subtler borders), `Card` (`rounded-lg`, no shadow, `px-5 py-4`),
`Badge` (muted; `accent` tone removed, `gold` tone added), `PageHeader`
(title down to `text-xl`/`text-2xl` `semibold`), `Table` (quieter header, less
padding), `Dialog` (`rounded-lg`, no backdrop blur, `shadow-float`), `Alert`
(no icon), `EmptyState` (borderless, no box), `DefinitionList` (quiet labels),
`States`, `DeadlineBadge` (quiet text that gains weight as the date nears).

**Added:** `Section` — a titled region separated by a hairline, with no border,
background or shadow. This is now the default way to group content, so pages no
longer read as a stack of cards. `Card` is reserved for forms and distinct
panels. Also added `StatRow`/`StatCell`, and `hideLabel` on `Field`, `Input`
and `Select` so filter toolbars can stay compact without losing their labels.

**`StatCard` rebuilt** from a bordered tile into plain label + value, and its
`icon` prop was removed. The 8-tile admin dashboard grid and the 6-tile reports
grid are gone; metrics are now grouped in a single bordered band.

**Layouts:** `PublicLayout` reduced to logo + Scholarships + About + Sign in +
one primary action, with a minimal single-row footer replacing the four-column
block. `DashboardLayout` narrowed to a `w-60` sidebar with quieter nav items and
a slimmer top bar; it still supplies the `max-w-6xl` container for its pages.

**Pages:** home reduced to hero-with-search, featured listings and one call to
action. Directory reduced to one search bar plus four filters in a single
toolbar, a two-column grid and pagination. Detail page split into sections with
a sticky sidebar holding the single primary action. Login and register reduced
to centred `max-w-sm` forms. About converted from stacked cards to sections.
Student and admin areas regrouped into sections, with a read-only profile plus
explicit edit mode, a review-before-submit step for semester registration, and
chronological lists for announcements and notifications.

### 2026-10-17 — release polish pass

- **Removed all in-product disclaimers** by product decision: the site-wide
  `DemoBanner`, the `SampleDataNotice` component and its six usages, the per-card
  and per-row "Sample data" badges, the `isSample` field on five domain models and
  every seed record, the `DEMO_MODE` flag, the login/register "demonstration"
  alerts, the profile "stored in this browser only" notice, the "document upload
  is not implemented" notes, and the admin Settings "Environment" card and demo
  reset copy (now "Stored records" / "Restore shipped records").
- **Rewrote the About page** as a genuine informational page: what the platform
  does, how to use it, where applications are submitted, the applications /
  registration / grants distinction, provider types, privacy of records and a
  help block. The developer-oriented route tables and security caveats moved to
  the README where they belong.
- **Removed the `Sample ` prefix** from the twelve provider names, the contact
  persons and the four school names in the seed data, and rewrote the six
  announcements and four notifications that narrated themselves as sample
  content.
- **Rebuilt the home page** in the style of the Scholarship Affairs Unit site:
  hero with a "Find a scholarship" CTA, a numbered stats band, a prominent
  Announcements and advisories accordion, featured listings, category tiles,
  closing-soon list, a "How this works" explainer and a closing CTA.
- **Rebuilt the public footer** as an institutional block: office name, address,
  telephone and email plus three link columns (Scholarships, For students) and a
  copyright bar.
- **Added `Accordion`** to the design system — a disclosure list built on native
  `<details>`/`<summary>`, so keyboard use, screen readers and find-in-page all
  work without extra code. Its rotating marker is styled by `.disclosure-marker`
  in `src/index.css`.
- **Bumped `DB_VERSION` to 2** so browsers holding the previously labelled seed
  data re-seed instead of showing stale copy.
- Corrected two lint findings surfaced by the refactor: an unused `Badge` import
  and an impure `new Date()` call during render in the footer (now hoisted to a
  module-level constant).
- Updated `README.md` (Demo mode → Local data layer, Demo accounts → Test
  accounts, Business rules → Product rules, Limitations → Current scope) and
  `AGENTS.md` (business-rule rows 1 and 10, plus an explicit note not to re-add
  labelling).

### 2026-10-17 — Scholar implemented

- Added `react-router@8` (the only new runtime dependency).
- **Types** (`src/types/index.ts`): `User`, `StudentProfile`, `StudentRecord`,
  `Scholarship` (+ `ScholarshipFilters`), `Application`, `SemesterRegistration`,
  `Grant`, `Announcement`, `Notification`, `PlatformSettings`, `Paginated`.
- **Data layer** (`src/lib/api.ts`): full promise-based API over a
  localStorage-backed demo database, with `DEMO_MODE`, simulated latency and
  `demoApi.reset()`.
- **Sample data** (`src/data/sampleData.ts`): 15 scholarships (one deliberately
  `draft`, one closed, four `external`), 5 users, 10 applications, 4
  registrations, 5 grants, 6 announcements, notifications and bookmarks. Every
  record carries `isSample`; provider names are prefixed "Sample".
- **Design system** (`src/components/ui/`): 21 reusable components plus
  `buttonStyles.ts` / `formStyles.ts` to keep component files
  Fast-Refresh-clean.
- **Layouts**: public navbar/footer, dashboard shell with sidebar and mobile
  drawer, `ProtectedRoute`, notification bell, demo banner.
- **Pages**: 6 public, 8 student, 10 administrator, plus a 404 page.
- **Routing**: `src/App.tsx` with route-level `React.lazy` code splitting and a
  `GuestOnlyRoute` wrapper for the auth screens.
- Removed the Vite starter page and its demo assets.
- Renamed the app in `index.html` and rewrote `README.md`.
- Added `public/robots.txt` (fixes the Lighthouse SEO audit; noted as advisory
  only, not access control).
- Added `.env*` patterns to `.gitignore`.

#### Fixes found and corrected during verification

- `validateForm` required an index signature, so typed interfaces could not be
  passed. Relaxed to `T extends object`.
- A sample scholarship used `type: 'vocational'` (an education level, not a
  scholarship type) — corrected to `educational`.
- The scholarship detail page referenced a narrowed-to-`null` value.
- `useSavedScholarships` declared `useDemoAccount`-style naming risk and an
  unstable array dependency; both corrected.
- Eight `set-state-in-effect` warnings from form seeding were removed by adding
  an `onSuccess` callback to `useAsync` — no lint suppressions were used.
- **Reference numbers could collide:** the demo sequence counters reset on page
  load, so a new grant reused `SCH-GRT-2026-0001`. Added
  `nextReference(kind, existingRefs)` and routed all four creation sites
  through it. Verified: the next grant correctly took the free slot
  `SCH-GRT-2026-0002` with zero duplicates.
- Added `--color-brand-950` (referenced but undefined) and replaced
  `border-3` with `border-[3px]` (not a real scale value), both of which
  silently produced no CSS.
- Removed the `React.` namespace usage in `App.tsx` in favour of an explicit
  `ReactNode` import.

### 2026-10-17 — project scaffolded and Tailwind wired up
- Scaffolded from the Vite `react-ts` template; added Tailwind v4 via
  `@tailwindcss/vite`; replaced the demo page; added `.gitattributes`; created
  the initial commit on `main`.

---

## 13. Open items / next steps

1. **Connect a real backend.** Replace the bodies in `src/lib/api.ts` and set
   `DEMO_MODE = false`. Then enforce every rule in section 8 server-side,
   especially ownership and grant confirmation.
2. **Replace the placeholder listings** with verified listings from real
   providers, and swap the generic provider and school names for the real ones.
3. **Add tests.** Nothing is installed; Vitest + React Testing Library is the
   natural fit. The business rules in section 8 are the highest-value cases.
4. **Add real authentication** (server-side, hashed credentials, no plain-text
   passwords) and remove the demo credentials from the login screen.
5. Consider a theme toggle (`@custom-variant dark`) if users ask for it.
6. Consider a Prettier/`editorconfig` config if formatting should be enforced
   beyond oxlint.
7. `public/favicon.svg` is still the starter icon.
