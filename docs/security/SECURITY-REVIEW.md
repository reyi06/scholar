# Security Review

Date: 26 October 2026
Scope: the whole repository, plus live probes against the development API and
database. No PHP is involved anywhere in this system.

## A note on "the PHP update"

There is no PHP in Scholar. The stack is TypeScript on Node 24, React in the
browser, PostgreSQL 17 underneath. There is no `composer.json`, no `.php` file,
and no PHP runtime in the demo. The only "PHP" strings in the codebase are the
Philippine peso currency code and a comment in the upload rules about rejecting
`.php` files.

A PHP security release therefore has no effect on this project. If another
project of yours uses PHP, it needs its own review.

## Method

1. Dependency audit (`npm audit`, production and full).
2. Route-by-route review of every handler for an authentication guard, a role
   guard and an ownership check.
3. Live probes against the running API for the suspicious cases.
4. Review of uploads, sessions, OTP, Google token verification, CSV export and
   response headers.
5. Search for raw SQL, HTML sinks (`dangerouslySetInnerHTML`, `innerHTML`),
   `eval`, and command execution.

## Fixed in this review

| # | Finding | Severity | Where |
|---|---|---|---|
| 1 | Announcement audience chosen by query string | High | `server/routes/announcements.ts` |
| 2 | Draft scholarships readable by id while unauthenticated | Medium | `server/routes/scholarships.ts` |
| 3 | Any signed-in user could mark another user's notification read | Medium | `server/routes/notifications.ts` |
| 4 | JSON request bodies had no size limit | Medium (DoS) | `server/http/responses.ts` |
| 5 | CSV formula injection in administrator exports | Medium | `src/lib/csv.ts` |
| 6 | `externalUrl` accepted any scheme, including `javascript:` | Low | `server/routes/scholarships.ts` |
| 7 | A malformed cookie percent-escape produced a 500 | Low | `server/http/responses.ts` |
| 8 | `fast-uri` advisory through Prisma's dev tooling | Low | `package-lock.json` |

### 1. Announcement audience leak — High

Before: `GET /api/announcements?audience=admins` returned the staff notice
`ann_004` to an anonymous caller. The audience was taken from the query string.
The same applied to `?audience=students`.

After: the audience is derived from the session. Anonymous visitors see `all`,
students see `all + students`, administrators see everything. The query
parameter is ignored.

Live check: anonymous `?audience=admins` now returns 3 announcements, none of
them admin-only.

### 2. Draft scholarship leak — Medium

The directory hid drafts, but `GET /api/scholarships/:id` returned any row by
id. Ids are short and guessable (`sch_015`), so an unpublished listing —
including contact details — was readable.

After: a draft returns `null` unless the caller is an administrator. Verified
with `sch_015`: anonymous `null`, admin sees the title.

### 3. Notification IDOR — Medium

`POST /api/notifications/:id/read` updated by id alone. A student could mark
the administrator's notification as read. Verified before the fix: `ntf_006`
belonging to `usr_admin_1` changed to `read = true` from Maria's session.

After: `updateMany({ where: { id, userId: signedIn.id } })`. The endpoint still
answers `200` so it does not disclose whether an id exists. The cross-user
write no longer changes the row; the owner's own notification still does.

### 4. Unbounded JSON body — Medium

`readJson` buffered the entire request before parsing. A single caller could
make the process hold an arbitrarily large body.

After: a 1,000,000-byte cap returns `413 That request is too large.` Verified
with a 1.1 MB login body.

Note: uploads already had their own 5 MB cap; this covers every JSON route.

### 5. CSV formula injection — Medium

Exports are opened in Excel. A student name or scholarship title beginning
with `=`, `+`, `-`, `@`, a tab or a carriage return can execute as a formula.

After: such cells are prefixed with an apostrophe. Covered by
`tests/csv.test.ts`.

### 6–7. Hardening

`externalUrl` is now parsed and limited to `http`/`https`, because the value is
placed directly in an `href`. Cookies with malformed escapes are ignored rather
than turning a bad request into a 500.

### 8. Dependency

`npm audit` reported one moderate advisory in `fast-uri`, reached through
`prisma → @prisma/dev → ajv`. It is development tooling, not application
runtime, but it was fixed with `npm audit fix`. `npm audit` now reports zero.

## Follow-up fixes — 5 November 2026

The route-level items B–E were closed after the review:

| Area | Change |
|---|---|
| Apply gates | `POST /api/applications` and draft submission now check the deadline, `profileComplete`, `applicationMode === 'internal'` and `applicationsOpen`. |
| One application | A second POST reuses and updates the existing draft instead of inserting another. `@@unique([studentId, scholarshipId])` is enforced by a migration. |
| Registrations | Only an **active** grant qualifies; `@@unique([studentId, academicYear, semester])` is enforced; reference collisions are retried. |
| Grants | Manual creation now requires an approved application without a grant. Confirm and manual creation share one transactional helper. PATCH validates amount/status; PATCH and DELETE are audited. |
| Decisions | Explicit transition maps for applications and registrations; a granted application or verified registration is locked. |
| Transactions | Registration, application, decision, grant, semester registration and erasure notifications are wrapped in `prisma.$transaction`. |
| Validation | Announcement audience and length; scholarship status, deadline, mode and type; grant amount and status. |
| Abuse | Registration is limited to 10 attempts per address per hour; erasure requests to one per 24 hours. |
| Tests | 10 new rule tests; the suite is 81 tests over 11 files. |

## Still open — needs a product decision

These are real, but fixing them changes behaviour or deployment, so they are
listed rather than changed unilaterally.

### A. Demo credentials are shipped in the client bundle — High before deployment

`src/lib/testAccounts.ts` contains `maria…/student123` and
`admin…/admin123`, and `LoginPage` renders buttons that fill them in. It is
labelled demo-only, correctly, but nothing prevents a production build from
shipping it.

Before any real deployment: gate the buttons on a build flag
(`VITE_DEMO_MODE`), stop seeding those accounts, and rebuild. The demo copy
should keep them; a deployment must not.

### B–E. Closed

See the follow-up table above. The remaining open items are A, F and G.

### F. Local exposure — Medium in the demo context

- The API calls `server.listen(PORT)` with no host, so it binds every
  interface. The demo website is bound to `127.0.0.1`, but port 8788 is
  reachable from the local network. Bind the API to loopback for the demo, or
  keep it behind the firewall prompt.
- The demo PostgreSQL uses `trust` authentication on port 55432, localhost
  only. Any local process can connect as the `postgres` superuser. Acceptable
  on a personal laptop, not on a shared machine.

### G. Smaller items

- Login and registration throttling are in memory: correct for one process,
  ineffective across instances. The per-address login counter is not cleared by
  a successful login, so a shared NAT can be locked out by unrelated failures.
- Registration is now throttled, but `409` still reveals whether an email is
  registered. That is a deliberate UX trade-off; changing it needs an email
  flow that does not exist yet.
- No CSRF token; the defence is `SameSite=Lax` plus JSON-only bodies. Adequate
  for same-origin use, not defence in depth.
- Upload MIME types are declared by the client. Stored names, `nosniff` and
  `Content-Disposition: attachment` contain the consequence, but magic-byte
  sniffing would be stronger.
- `recordAudit` remains fire-and-forget by design: an audit write must not fail
  a legitimate action, but a trail can have silent gaps. Grant, decision and
  deletion entries now exist.
- `GET /api/settings` and `GET /api/grants/total-released` are public. They
  expose the current term, contact address and an aggregate total. Confirm that
  is intended.

## What is solid

- **No SQL injection path.** All database access goes through Prisma; there is
  no raw SQL and no string-built query.
- **No HTML injection sink.** No `dangerouslySetInnerHTML`, no `innerHTML`;
  React escapes rendered data.
- **Uploads.** Generated stored names, path-traversal guard, size cap, type
  allow-list, owner/admin checks, `attachment` + `nosniff`, audit on staff
  access, orphan cleanup when the row insert fails.
- **Sessions.** HttpOnly, `SameSite=Lax`, `Secure` under TLS, server-side
  revocation, expiry checked on read, password reset deletes every session.
- **Passwords.** scrypt with a per-password salt and a timing-safe compare.
- **Google sign-in.** RS256 pinned, signature checked against Google's JWKS,
  `aud`, `iss` and `exp` validated, accounts keyed on `sub`, no silent linking
  to a password account.
- **One-time codes.** Random, stored hashed, short TTL, attempt cap, per-address
  request allowance, identical responses for known and unknown addresses.
- **Authorization.** Every sensitive route reviewed: students are pinned to
  their own rows, administrators are checked by role, documents are
  owner-or-admin.
- **Headers.** CSP, nosniff, frame denial, referrer policy and HSTS under TLS
  on the static site; the API sets its own hardening headers.
- **Secrets.** `.env` is ignored and untracked; no key or token is committed.
- **Pagination.** Every list clamps its page size (50–100).

## Not tested

No penetration test, no fuzzing, no concurrency stress test, no browser
matrix beyond Chrome, and no review of the hosting platform. This is a code and
configuration review, not a certification.

## Pre-deployment checklist

1. Remove or gate the test credentials; do not seed demo accounts.
2. Point `SITE_URL` at the real domain, terminate TLS, set
   `COOKIE_SECURE=true` or `NODE_ENV=production`.
3. Set `TRUST_PROXY=true` only behind a proxy that overwrites
   `X-Forwarded-For`.
4. Give PostgreSQL a real password and a private network; no `trust`.
5. Bind the API to loopback, or firewall it from everything but the proxy.
6. Decide whether registration should keep the explicit "email already exists"
   response, or move to an email-based flow.
7. Add a magic-byte upload check if untrusted files will be accepted at scale.
8. Run the rehearsal and the study-guide labs against the deployed build.
