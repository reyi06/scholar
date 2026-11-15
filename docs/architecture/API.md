# API

Base path: `/api`. Same origin as the site; the session is an `HttpOnly` cookie,
so requests use `credentials: 'include'` and there is no CORS layer.

The server is `server/index.ts` with route modules in `server/routes/`. There are
**69 endpoints**. Every handler returns JSON; errors are
`{ "error": "message" }`.

---

## Conventions

| | |
|---|---|
| Content type | `application/json` (uploads use `multipart/form-data`) |
| Session | `pgc_session` cookie, `HttpOnly`, `SameSite=Lax`, 30 days |
| Auth guards | `requireUser`, `requireRole('admin')`, `requireOwnerOrAdmin` |
| Caching | `Cache-Control: no-store` on API responses |
| Pagination | `page` (1-based), `pageSize` clamped to 1–100 |
| List shape | `{ items, total, page, pageSize, totalPages }` |
| Money | API values are pesos; the database stores integer centavos |
| IDs | Prefixed, e.g. `usr_…`, `sch_…`, `app_…`, `grt_…` |

### Status codes

| Code | Meaning |
|---|---|
| 200 / 201 | OK / created |
| 400 | Validation or malformed body |
| 401 | No valid session |
| 403 | Wrong role, or not the owner |
| 404 | Missing record or route |
| 409 | Business conflict (duplicate, wrong status, closed listing) |
| 413 | Body or upload too large |
| 429 | Throttled; `Retry-After` is set on login |
| 500 | Unexpected error; details are logged, not returned |

### Throttles

- Login: 5 failures per account, 20 per address, 15-minute window.
- Registration: 10 attempts per address per hour.
- One-time codes: per-address request allowance and a per-code attempt cap.

The counters are in memory, so they assume one API process.

---

## Endpoint groups

| Group | Count | Access | Main paths |
|---|---:|---|---|
| Health | 1 | public | `GET /health` |
| Auth | 9 | mixed | `session`, `login`, `logout`, `register`, `google`, `otp/request`, `otp/verify` |
| Scholarships | 7 | public read, admin write | `GET /scholarships`, `GET /scholarships/:id`, `POST`, `PATCH`, `DELETE` |
| Saved | 3 | student | `GET /saved`, `GET /saved/ids`, `POST /saved/:id/toggle` |
| Applications | 9 | student / admin | `GET`, `POST`, `PATCH :id`, `POST :id/status`, `POST :id/withdraw`, `DELETE :id`, `awaiting-grant`, `counts` |
| Grants | 6 | student read, admin write | `GET`, `GET :id`, `POST /confirm`, `POST`, `PATCH`, `DELETE` |
| Registrations | 5 | student / admin | `GET`, `GET :id`, `counts`, `POST`, `POST :id/status` |
| Documents | 6 | student / admin | `GET`, `records`, `POST`, `GET :id/file`, `PATCH :id`, `DELETE :id` |
| Announcements | 4 | public read, admin write | `GET`, `POST`, `PATCH :id`, `DELETE :id` |
| Support | 4 | signed-in, admin for status | `GET /support/tickets`, `POST /support/tickets`, `POST :id/messages`, `PATCH :id` |
| Notifications | 4 | signed-in | `GET`, `unread-count`, `read-all`, `POST :id/read` |
| Students | 5 | admin | `GET`, `count`, `GET :id`, `PATCH :id`, `DELETE :id` |
| Profile | 2 | student | `GET`, `PATCH` |
| Data rights | 2 | signed-in | `GET /me/export`, `POST /me/erasure-request` |
| Settings | 2 | public read, admin write | `GET`, `PATCH` |
| Reports | 1 | admin | `GET /reports` |
| Activity | 1 | admin | `GET /audit` |
| Maintenance | 2 | admin | `POST /reset` (501), `GET /stats` |

`GET /api/settings` is deliberately
public. `GET /api/scholarships/:id` hides drafts from non-administrators.

**Deadlines are optional.** Most Pampanga programmes run a rolling intake, so
`POST` and `PATCH` accept an empty `deadline` and the stored value is `""`. An
empty deadline is never "past": `isPastDeadline` is false for it, the directory
sorts it with the other non-urgent listings, and the interface renders it as
"Rolling intake" rather than a date. A non-empty value must still be a real
`YYYY-MM-DD` date.

---

## Auth

| Method | Path | Notes |
|---|---|---|
| `GET` | `/auth/session` | Current user or `null`; never leaks a password hash |
| `POST` | `/auth/login` | Email + password; sets the cookie |
| `POST` | `/auth/logout` | Deletes the session row and clears the cookie |
| `POST` | `/auth/register` | Creates the user, profile and welcome notification in one transaction, then sends the first verification code |
| `GET` | `/auth/google/config` | `{ configured, clientId }`; the button is hidden when unset |
| `POST` | `/auth/google` | Verifies a Google ID token; refuses to link a password account |
| `POST` | `/auth/google/complete` | Saves the profile details Google does not provide |
| `POST` | `/auth/otp/request` | Issues a code; the response is identical for known and unknown addresses. Body: `email`, `purpose`, `channel` (`email` or `sms`) |
| `POST` | `/auth/otp/verify` | Confirms the address or resets the password; a reset invalidates every session |

Password hashing is scrypt in `server/passwords.ts`. The Google verifier is
`server/googleAuth.ts` (RS256, JWKS, `aud`, `iss`, `exp`, `sub`).

One-time codes go through `server/otp.ts`, which stores only a scrypt hash and
enforces the cooldown, the hourly ceiling and the attempt cap. Delivery is a
seam: `server/mailer.ts` for email, `server/sms.ts` for text. Both default to a
console transport that prints the message, and both throw when a deployment
names a transport that is not wired up, so a missing provider is a loud fault
rather than a code that silently never arrives. For `channel: "sms"` the
destination is the mobile number on the student profile, normalised to E.164 by
`normalisePhone`; an account without one gets the same uniform response and no
message, which is why the reply reports `channel` and `delivery` rather than
promising a text.

---

## Applications

- `POST /applications` requires a verified email, a complete profile, an `open`
  internal listing, a deadline that has not passed, and `applicationsOpen`.
- A draft is updated in place; `@@unique([studentId, scholarshipId])` prevents a
  second one.
- `POST /applications/:id/status` is admin-only, requires a note, and follows an
  explicit transition map. A grant locks the decision.
- `GET /applications/:id` returns `null` for a missing id but `403` for someone
  else's record; ownership is checked server-side.
- `awaiting-grant` and `counts` are admin-only.

---

## Grants

- `POST /grants/confirm` requires an **approved** application with no existing
  grant. Grant + notification are one transaction; `Grant.applicationId` is
  unique.
- `POST /grants` is the administrator's manual form and also requires an
  approved application without a grant. It uses the same helper.
- `PATCH /grants/:id` validates amount and status; `PATCH` and `DELETE` are
  audited.
- `GET /grants` is pinned to the student for students; admins can filter.
- There is deliberately **no aggregate total endpoint**. A "total released" figure
  is bookkeeping, not something the site should publish, and it is not shown on
  the student or administrator screens either.

---

## Registrations

Only a student with an **active** grant may register. One registration per
`(student, academicYear, semester)`. A verified registration is locked; a
rejected one may be corrected. Administrators decide with
`POST /registrations/:id/status`.

---

## Documents

`POST /documents` is `multipart/form-data` with one file and text fields:

| Field | Notes |
|---|---|
| `file` | PDF, JPEG or PNG; 1 byte–5 MB |
| `title` | Optional; a suggested title is derived from the file name |
| `classification` | Optional; falls back to the shared classifier |
| `applicationId` | Optional; must belong to the student |

Files are stored as `<document-id>.<ext>`; the uploaded name is never used in a
path. `GET /documents/:id/file` is owner-or-admin, returns an attachment with
`nosniff`, and is audited for staff access.

---

## Support

| Method | Path | Notes |
|---|---|---|
| `GET` | `/support/tickets` | Own tickets for a student, all tickets for an admin; `?status=` filters |
| `POST` | `/support/tickets` | `category`, `subject`, `body`; the first message is the body |
| `POST` | `/support/tickets/:id/messages` | Owner or admin; refuses a closed ticket with 409 |
| `PATCH` | `/support/tickets/:id` | Admin only; `status` is `open`, `answered` or `closed` |

A ticket belongs to the account that opened it, because the answer arrives in
the app: there is no mail transport, so an anonymous ticket would collect a
reply nobody could read. The list query is built from the session, never from a
client-supplied id. A staff reply moves the ticket to `answered`, a student
follow-up moves it back to `open`, so the status always says whose turn it is.

---

## Reports and activity

`GET /reports` returns counts, status breakdowns, municipality/type breakdowns
and released amounts for the administrator report screen. `GET /audit` returns
paginated `AuditEntry` rows; `action` supports a prefix filter.

---

## Things that are intentionally missing

- No CORS: the API is same-origin by design.
- No CSRF token: `SameSite=Lax` plus JSON-only state-changing routes is the
  current defence.
- No OAuth authorization-code exchange: Google sign-in uses the ID-token flow.
- No email provider: `MAIL_TRANSPORT=console` prints codes to the server log.
- No file streaming: one upload is buffered under the 5 MB cap.
