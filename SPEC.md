# Pampanga GrantConnect — Specification

Scholarship information and student grant management for the province of
Pampanga, Philippines. Written 2026-10-19; reflects commit `087e9b0`.

---

## 1. Product

| | |
|---|---|
| Purpose | Consolidate scholarship listings and track student applications, semester registration and confirmed grants |
| Audiences | Students, scholarship administrators, and the general public |
| Surfaces | Public directory · Student area · Administrator area |
| Data | 15 placeholder scholarship listings, 5 users, 10 applications, 4 registrations, 5 grants, 6 announcements |

## 2. Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 24.21.0 |
| UI | React | 19.3.1 |
| Routing | React Router | 8.4.0 |
| Build | Vite | 8.3.4 |
| Styling | Tailwind CSS | 4.3.3 |
| Language | TypeScript | 6.0.3 |
| Database | SQLite via Prisma | 7.10.1 |
| Lint | oxlint | 1.88.0 |
| Tests | — | none configured |

**Runtime dependencies: 5.** `react`, `react-dom`, `react-router`,
`@prisma/client`, `@prisma/adapter-better-sqlite3`. Icons, CSV export, dialogs,
tables, validation, the PNG encoder and the HTTP router are all hand-written.

## 3. Architecture

```
Browser ──► React SPA (Vite build, prerendered per route)
              │  src/lib/api.ts  ── the single data seam
              ├─► localStorage        (default; per-browser, not shared)
              └─► /api ─► server/index.ts ─► Prisma ─► SQLite (prisma/dev.db)
```

- **SPA** — 26 routes, `React.lazy` per page, one `Suspense` boundary.
- **API** — dependency-free Node `http` server with a hand-rolled router,
  session cookies and per-request authorisation.
- **Database** — 12 models; list-valued fields stored as JSON strings because
  SQLite has no array type, mapped in `server/mappers.ts`.

## 4. Data model (12 models)

| Model | Notes |
|---|---|
| `User` | id, email (unique), scrypt `passwordHash`, role, name |
| `Session` | server-side; browser holds only an httpOnly cookie |
| `StudentProfile` | 1:1 with User; enrolment, guardian, income |
| `Scholarship` | listing; `applicationMode` internal/external |
| `Application` | unique `referenceNo`; status, timeline |
| `ApplicationTimelineEntry` | append-only review history |
| `SemesterRegistration` | existing grantees only |
| `Grant` | `applicationId` is **unique** — one grant per application |
| `Announcement` | audience-scoped notices |
| `Notification` | `userId: null` means broadcast |
| `SavedScholarship` | composite key (student, scholarship) |
| `PlatformSettings` | single row, id `singleton` |

## 5. Routes (26)

**Public (6)** — `/`, `/scholarships`, `/scholarships/:id`, `/about`, `/login`,
`/register`

**Student (8)** — `/student/dashboard`, `/profile`, `/saved`, `/applications`,
`/applications/:id`, `/semester-registration`, `/grants`, `/notifications`

**Administrator (11)** — `/admin/dashboard`, `/scholarships`,
`/scholarships/new`, `/scholarships/:id/edit`, `/students`, `/applications`,
`/registrations`, `/grants`, `/announcements`, `/reports`, `/settings`

**Catch-all (1)** — `*` → 404

## 6. API surface (51 endpoints)

| Group | Endpoints |
|---|---|
| Health | `GET /api/health` |
| Auth | `GET session` · `POST login` · `POST logout` · `POST register` · `GET /api/accounts` |
| Scholarships | `GET /api/scholarships` · `GET options` · `GET :id` |
| Saved | `GET /api/saved` · `GET ids` · `POST :scholarshipId/toggle` |
| Applications | `GET` · `GET :id` · `POST` · `PATCH :id` · `POST :id/status` · `POST :id/withdraw` · `DELETE :id` · `GET awaiting-grant` · `GET counts` |
| Profile | `GET /api/profile` · `PATCH /api/profile` |
| Registrations | `GET` · `GET :id` · `GET counts` · `POST` · `POST :id/status` |
| Grants | `GET` · `GET :id` · `GET total-released` · `POST` · `POST confirm` · `PATCH :id` · `DELETE :id` |
| Announcements | `GET` · `POST` · `PATCH :id` · `DELETE :id` |
| Notifications | `GET` · `GET unread-count` · `POST read-all` · `POST :id/read` |
| Students | `GET` · `GET count` · `GET :id` · `PATCH :id` · `DELETE :id` |
| Settings | `GET /api/settings` · `PATCH /api/settings` |
| Reports | `GET /api/reports` (overview + 5 breakdowns) |
| Maintenance | `POST /api/reset` (501 — delegated to `npm run db:seed`) |

## 7. Design system

**Tokens** (`src/index.css`, 22 variables): maroon `brand-50…950` as the single
accent, `gold-100…800` reserved for featured/pinned markers and the masthead
rule, `canvas` for the near-white page, one `shadow-float` used only by dialogs.

**25 UI components**: Accordion, Alert, Badge, Button, Card, Checkbox,
ConfirmDialog, DefinitionList, Dialog, EmptyState, Field, Icon, Input,
PageHeader, Pagination, SearchInput, Section, Select, Skeleton, Spinner,
StatCard, States, Table, Tabs, Textarea.

**Rules** — `Section` over `Card` for grouping; flat surfaces, no resting
shadow; metrics as text not tiles; one primary action per page; progressive
disclosure; container `max-w-6xl`; type scale h1 24 → section 16 → body 14 →
meta 12; **dark mode** class-based and toggleable.

## 8. Business rules enforced

| # | Rule | Where |
|---|---|---|
| 1 | Grants require explicit administrative confirmation | `POST /api/grants/confirm` is the only path; approving an application never creates a grant |
| 2 | Internal vs provider-handled applications stay distinct | `Scholarship.applicationMode` |
| 3 | External application links shown when supplied | Detail page |
| 4 | Semester registration is for existing grantees | `POST /api/registrations` returns 403 with no confirmed grant |
| 5 | Students reach only their own records | `requireOwnerOrAdmin` on every student-scoped read |
| 6 | Only administrators manage listings, reviews, grants | `requireRole(user, 'admin')` |
| 7 | Login cannot enumerate accounts | Wrong password and unknown email return a byte-identical 401 |
| 8 | Review decisions need a note | `POST /api/applications/:id/status` rejects a note under 5 characters |
| 9 | Reference numbers never collide | `nextReference()` reads existing numbers from the database |

## 9. Security posture

**Implemented** — scrypt password hashing (`node:crypto`); httpOnly session
cookies; server-side authorisation; ownership checks; Prisma parameterised
queries; no credentials reach the browser; API never cached by the service
worker.

**Not implemented** — rate limiting, CSRF tokens, security headers, audit log,
account lockout, email verification, password reset, 2FA.

**Known exposure** — `GET /api/accounts` returns the seeded credentials in plain
text so the login screen can offer them. **Delete before deploying.**

## 10. Build & deploy

```bash
npm run dev        # Vite on :5173, proxies /api
npm run server     # API on :8787
npm run db:migrate # create prisma/dev.db
npm run db:seed    # load placeholder records
npm run build      # tsc -b → vite build → prerender
```

`scripts/prerender.ts` writes one HTML file per public route with real
`<title>`, description, canonical and Open Graph tags; regenerates `sitemap.xml`
(19 URLs incl. all listings) and `robots.txt`; draws `og-image.png` (1200×630),
`icon-192/512` and `apple-touch-icon` with a hand-written PNG encoder; emits the
service worker. `SITE_URL` sets the origin.

Host needs an SPA fallback — `public/_redirects` (Netlify, Cloudflare Pages) and
`vercel.json` (Vercel) are included.

## 11. Code inventory

| Area | Files | Lines |
|---|---|---|
| Pages | 25 | 7,067 |
| Components (25 UI + 16 layout/domain) | 41 | 2,537 |
| Lib (api, validation, format, csv, storage, ids, constants, serviceWorker) | 8 | 1,758 |
| Data (seed records, schema) | 2 | 1,142 |
| Server | 5 | 1,656 |
| Types | 1 | 295 |
| Context | 6 | 268 |
| Hooks | 4 | 193 |
| Prerender script | 1 | 371 |
| Prisma seed | 1 | 232 |
| **Total** | **~94** | **~15,500** |

## 12. Verification status

| Check | Result |
|---|---|
| `npm run lint` | clean |
| `tsc -b` (app + server + scripts) | clean |
| `npm run build` | clean; 290 kB app bundle (86 kB gzip) |
| Lighthouse, light + dark, 8 pages | Accessibility / Best Practices / SEO **100**, zero failures |
| Every route smoke-tested | renders, empty console |
| Prerendered pages | 19 written; one `<title>`, one `description`, full OG set |
| Service worker | 1 registration, scope `/` |
| API over real HTTP | ownership 403, role 403, no account enumeration, session lifecycle |
| Tests | **none** |

## 13. Known gaps

**Blockers before a public domain**
1. Listings are invented — generic providers, fabricated eligibility and deadlines.
2. `GET /api/accounts` exposes seeded passwords.

**Not built**
- **Client is not wired to the API.** Every page still reads `localStorage`
  unless the adapter is added; the API works but has no caller.
- Document upload (requirements are text labels only).
- Email of any kind — including password reset.
- Filipino / Kapampangan translations.
- Offline support is shell-only; data is not cached.
- Tier 2: optimistic updates, undo, autosave, blur validation, printable
  receipt, bulk actions, fuzzy search, sortable columns, command palette.
- Tier 3: rate limiting, CSRF, security headers, audit log, privacy notice,
  error tracking, analytics.
- i18n scaffolding, and the `SPEC.md`-adjacent `PRODUCT.md` / `DESIGN.md` that
  the Impeccable skill expects.
