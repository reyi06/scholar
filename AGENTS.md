# Scholar — agent guide

A scholarship information and grant management system for the Province of
Pampanga. React + Vite + TypeScript + Tailwind on the front, a dependency-free
Node API and PostgreSQL behind it.

Read this before changing anything. It is the short working guide; the details
are in `docs/`.

---

## Current state

| | |
|---|---|
| Routes | 36 + not-found: 12 public, 9 student, 14 admin |
| API | 73 endpoints in 16 modules |
| Database | 17 Prisma models on PostgreSQL 17 |
| UI | 26 hand-rolled primitives in `src/components/ui/` |
| Tests | 83 tests in 11 files; type-check and lint clean |
| Build | 23 pages prerendered (15 published listings) |
| CI | `.github/workflows/verify.yml`; `main` is protected |
| Repo | public technical tree; member planning and the paper live outside it |

---

## Commands

```bash
npm run dev                 # Vite :5173, proxies /api to :8787
npm run server              # Node API :8787
npm run build               # tsc -b && vite build && prerender
npm run lint                # oxlint
npm test                    # vitest run
npm run test:watch          # vitest
npm run db:migrate          # prisma migrate dev
npm run db:seed             # reset + seed demo data
npm run db:catalogue        # upsert the 15 listings, keep accounts
npm run db:reset            # drop + migrate + seed
npm run db:prune-documents  # remove old document rows/files (dry run by default)
npm run check:responsive    # Chrome at 390/768/1280; needs site + API
npm run perf:probe <url>    # LCP/FCP/TTFB and payload on a throttled phone
npm run a11y:probe <url>    # axe-core WCAG 2.2 AA scan of the deployed pages
npm run rehearse            # 11-step demo through the production preview
```

Run **tests, type-check, lint and build** before declaring work done. `build`
and the database scripts need a `.env` with `DATABASE_URL`; `build` also needs
PostgreSQL for the prerender step. Do not delete the prerender to make a build
pass — fix the environment or report it.

Development is two processes: `npm run server` and `npm run dev`. The Vite
proxy exists so the session cookie stays same-origin. A page that says it cannot
connect usually means the API is down, not that the route is missing.

---

## Architecture that matters

The browser **never** touches the database. All data access goes through
`src/lib/api.ts`:

- with `VITE_API_BASE_URL` set, it calls `src/lib/httpApi.ts` → `/api`;
- with it unset, it uses the browser-storage implementation.

`server/index.ts` also serves `dist/` itself, for any path that is not `/api`
(`server/static.ts`): SPA fallback, the CSP from `vite.config.ts`, immutable
caching for `/assets/`. It costs nothing when a host serves the static files
instead, and it is what lets one tunnel hostname cover the whole site. Nothing
else about the split changes — every byte of data still comes from `/api`, and
`@prisma/client` still never reaches the browser.

That is a build-time choice. The deployed and demo builds use HTTP. Do not add
a `fetch` in a component, and do not let a Prisma import reach the client.
Do not weaken or bypass the server-side ownership checks.

Detailed map: `docs/architecture/ARCHITECTURE.md`; endpoint map:
`docs/architecture/API.md`; decisions: `docs/architecture/DECISIONS.md`.

---

## Repository map

```
src/
  app/          App.tsx (route table), Providers.tsx
  pages/        one screen per route (public/student/admin)
  components/   ui/ primitives + layout/ shells and guards
  lib/          api.ts (data seam), httpApi.ts, validation, documents, format
  context/      auth, theme, toast
  hooks/        useAsync, useDebouncedValue, ...
  types/        shared domain types
server/
  index.ts      HTTP server, dispatch, errors
  http/         router, auth, responses
  routes/       15 modules, one per resource
  rules.ts      pure business rules (deadlines, transitions, unique errors)
  passwords.ts  scrypt
  uploads.ts    multipart + disk storage
  googleAuth.ts ID-token verification
  otp.ts        one-time codes
  audit.ts      activity trail
prisma/         schema, migrations, seed
scripts/        prerender, rehearsal, responsive check, db reset, prune
tests/          Vitest
docs/           spec, architecture, design, deployment, security
.opencode/      vendored project skills
```

---

## Non-negotiable rules

- **No component library.** Extend `src/components/ui/`. No shadcn, Radix,
  Material UI, Bootstrap or a second Button/Card.
- **Do not add a second data layer.** Use `src/lib/api.ts`; keep both build
  modes working.
- **Authorisation belongs on the server.** Query scoping and role checks go in
  `server/`, never only in a React component.
- **Money is integer centavos** in the database; the API speaks pesos. Convert
  only at the boundary.
- **Approval is not a grant.** A grant comes only from an explicit
  confirmation of an approved application; `Grant.applicationId` is unique.
- **Documents belong to the student.** Stored file names are generated; never
  use the uploaded name as a path.
- **One application per student and listing**, one registration per term, one
  grant per application. These are database constraints, not just checks.
- **Listings are researched, not guaranteed.** Each one reflects published
  programme information on the date it was written; statuses and deadlines change
  every intake. Reconfirm before publishing a change to a listing.
- **No secrets in git.** `.env`, uploads, `dist`, `node_modules`, `tmp` are
  ignored.
- **Public repo only.** No member planning, task lists, contribution forms or
  capstone paper in this repository.

---

## Business invariants

| Invariant | Where |
|---|---|
| Apply: complete profile, open internal listing, deadline not passed, applications open | `server/routes/applications.ts` |
| Draft is updated, not duplicated; one per student+listing | route + `@@unique` |
| Decisions follow a transition map; a grant locks them | `server/rules.ts`, applications route |
| Grant requires an approved application with no grant | `server/routes/grants.ts`, `Grant.applicationId @unique` |
| Registration requires an active grant; one per term | registrations route + unique pair |
| Document download is owner-or-admin; staff access audited | documents route |
| Announcement audience comes from the session, not the query | announcements route |

---

## Front-end conventions

- Title Case for headings, buttons, nav and labels; sentence case for
  descriptions, hints, placeholders and validation.
- One primary action per page; everything else outline/ghost.
- `Section` over card walls; `PageHeader` owns the single `h1`.
- Prefer `(?)` help hints to permanent explanatory paragraphs.
- Loading states are page-shaped skeletons, not a centred spinner.
- Check light and dark, 390 and 1280 px, keyboard-only.
- Do not introduce a new accent colour or icon package.
- Design rules and the review checklist: `docs/design/DESIGN.md`.

---

## Server conventions

- Register routes in `server/routes/`; handlers receive
  `{ req, res, params, query, user }`.
- Throw `HttpError(status, message)` for expected failures. Unknown errors are
  logged and become a generic 500.
- Use `requireUser`, `requireRole`, `requireOwnerOrAdmin`; never trust a
  client-supplied owner id.
- Clamp pagination; return `{ items, total, page, pageSize, totalPages }`.
- Use `prisma.$transaction` when two writes must succeed together.
- Keep money in centavos; keep list fields JSON strings at the DB boundary.
- Audit consequential acts through `recordAudit`; it is fire-and-forget by
  design.

---

## Verification before “done”

1. `npm test` — 83 tests must pass.
2. `npx tsc -b` — clean.
3. `npm run lint` — clean.
4. `npm run build` — clean; 23 pages.
5. For workflow changes: `npm run rehearse` with the API and production preview.
6. For layout changes: `npm run check:responsive`, or a manual 390/1280 pass.

If something cannot run, say what is blocked and why. Do not claim a check that
did not run. CI runs the same gates; `main` requires a PR, one approval, resolved
conversations and a green `verify`.

---

## Docs map

| Document | Read it for |
|---|---|
| `docs/spec/SPEC.md` | Product scope, routes, data, rules, status |
| `docs/architecture/ARCHITECTURE.md` | System shape, flows, auth, build |
| `docs/architecture/API.md` | Endpoint groups, status codes, uploads |
| `docs/architecture/DECISIONS.md` | Why the stack and the invariants look like this |
| `docs/design/DESIGN.md` | Tokens, components, patterns, accessibility |
| `docs/deployment/DEPLOY.md` | Environment and deployment |
| `docs/security/SECURITY-REVIEW.md` | Findings and pre-deployment checklist |

---

## Skills

Project skills are in `.opencode/skills/`: API design, security audit,
performance, launch, git workflow and verification. Global skills already cover
design (`impeccable`), review, TDD, debugging and humanizing prose. Keep the
project set small; every skill costs a line of context per turn.
