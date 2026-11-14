# API

Base path: `/api`. Same origin as the site; the session is an `HttpOnly` cookie,
so requests use `credentials: 'include'` and there is no CORS layer.

The server is `server/index.ts` with route modules in `server/routes/`. There are
**70 endpoints**. Every handler returns JSON; errors are
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
| Grants | 7 | student read, admin write | `GET`, `GET :id`, `total-released`, `POST /confirm`, `POST`, `PATCH`, `DELETE` |
| Registrations | 5 | student / admin | `GET`, `GET :id`, `counts`, `POST`, `POST :id/status` |
| Documents | 6 | student / admin | `GET`, `records`, `POST`, `GET :id/file`, `PATCH :id`, `DELETE :id` |
| Announcements | 4 | public read, admin write | `GET`, `POST`, `PATCH :id`, `DELETE :id` |
| Notifications | 4 | signed-in | `GET`, `unread-count`, `read-all`, `POST :id/read` |
| Students | 5 | admin | `GET`, `count`, `GET :id`, `PATCH :id`, `DELETE :id` |
| Profile | 2 | student | `GET`, `PATCH` |
| Data rights | 2 | signed-in | `GET /me/export`, `POST /me/erasure-request` |
| Settings | 2 | public read, admin write | `GET`, `PATCH` |
| Reports | 1 | admin | `GET /reports` |
| Activity | 1 | admin | `GET /audit` |
| Maintenance | 2 | admin | `POST /reset` (501), `GET /stats` |

`GET /api/settings` and `GET /api/grants/total-released` are deliberately
public. `GET /api/scholarships/:id` hides drafts from non-administrators.

---

## Auth

| Method | Path | Notes |
|---|---|---|
| `GET` | `/auth/session` | Current user or `null`; never leaks a password hash |
| `POST` | `/auth/login` | Email + password; sets the cookie |
| `POST` | `/auth/logout` | Deletes the session row and clears the cookie |
| `POST` | `/auth/register` | Creates the user, profile and welcome notification in one transaction |
| `GET` | `/auth/google/config` | `{ configured, clientId }`; the button is hidden when unset |
| `POST` | `/auth/google` | Verifies a Google ID token; refuses to link a password account |
| `POST` | `/auth/google/complete` | Saves the profile details Google does not provide |
| `POST` | `/auth/otp/request` | Issues a code; the response is identical for known and unknown addresses |
| `POST` | `/auth/otp/verify` | Confirms the address or resets the password; a reset invalidates every session |

Password hashing is scrypt in `server/passwords.ts`. The Google verifier is
`server/googleAuth.ts` (RS256, JWKS, `aud`, `iss`, `exp`, `sub`).

---

## Applications

- `POST /applications` requires a complete profile, an `open` internal listing,
  a deadline that has not passed, and `applicationsOpen`.
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
- `GET /grants/total-released` returns an aggregate in pesos.

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
