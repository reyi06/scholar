# AGENTS.md

Guidance for AI agents (and humans) working in this repository.
Keep the **Change log** and **Verification log** sections at the bottom up to
date as you work — they are the running record of what has been done here.

---

## 1. What this is

**Pampanga GrantConnect** — a web-based scholarship information and student
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

Runtime dependencies are **React, React DOM and React Router only**. Icons,
dialogs, tables, CSV export and form validation are implemented in-repo to
honour the "avoid unnecessary dependencies" requirement. Do not add a
dependency for something small that already exists here.

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
`describedBy`), `Icon`, `Input`, `PageHeader`, `Pagination`, `SearchInput`,
`Select`, `Skeleton`, `Spinner`, `StatCard`, `LoadingState`/`LoadingRows`/
`ErrorState`, `Table`/`THead`/`TBody`/`TR`/`TH`/`TD` and the config-driven
`DataTable`, `Tabs`, `Textarea`, plus `controlClasses`.

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
`dark:` variants follow the OS/`prefers-color-scheme` setting. There is no
theme toggle and no `.dark` class. Making it class-based is a deliberate
behaviour change, not a pure addition:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

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

### 2026-10-17 — Pampanga GrantConnect implemented

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
  load, so a new grant reused `PGC-GRT-2026-0001`. Added
  `nextReference(kind, existingRefs)` and routed all four creation sites
  through it. Verified: the next grant correctly took the free slot
  `PGC-GRT-2026-0002` with zero duplicates.
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
