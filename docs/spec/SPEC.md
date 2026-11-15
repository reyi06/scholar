# Specification

Scholarship information and student grant management for the Province of
Pampanga, Philippines. This is the product and scope summary; implementation
detail is in `docs/architecture/ARCHITECTURE.md`.

Status: 14 November 2026.

---

## 1. Product

| | |
|---|---|
| Purpose | Publish scholarship listings and track applications, requirements, semester registration and confirmed grants |
| Users | Students, scholarship administrators, public visitors |
| Surfaces | Public directory, student area, administrator area |
| Demo data | Fifteen researched Pampanga listings, demo accounts, sample applications and grants |

### In scope

- Search and filter listings; save a shortlist; share a listing by QR code.
- Register, sign in, verify an address, reset a password, optional Google sign-in.
- Apply to an internal listing, save a draft, track a status timeline.
- Upload, classify and reuse student documents.
- Administrator review, registration verification, grant confirmation, reports,
  announcements, documents, activity trail and settings.
- Semester registration for students with an active grant.

### Out of scope

- Real provider integrations or automatic deadline feeds.
- Payments or disbursement rails.
- A public API for third parties.
- Native mobile apps.
- Filipino or Kapampangan translation.

**Listing status and deadlines must be reconfirmed with the provider.** They are
researched from published programme information, not guaranteed, and most
Pampanga programmes run a rolling intake rather than a dated window.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| UI | React 19.2, React Router 8.4 |
| Build | Vite 8.3, TypeScript 6.0 |
| Styling | Tailwind CSS 4.3 |
| API | Node `http`, no framework |
| Data | PostgreSQL 17, Prisma 7.10 with `@prisma/adapter-pg` |
| Tests | Vitest 5, jsdom, Testing Library |
| Lint | oxlint |
| CI | GitHub Actions `verify` |

Runtime dependencies: React, React DOM, React Router, Prisma client, the
PostgreSQL adapter, `pg` and `qrcode-generator` (the share dialog). Everything
else, including the router, multipart parser, CSV export, icons, dialogs, forms
and PNG encoder, is in this repository.

---

## 3. Routes

**36 routes plus a not-found page.**

| Area | Count | Routes |
|---|---:|---|
| Public | 12 | `/`, `/scholarships`, `/scholarships/:id`, `/about`, `/faqs`, `/announcements`, `/support`, `/privacy`, `/welcome`, `/login`, `/register`, `/forgot-password` |
| Student | 9 | dashboard, profile, saved, applications, application detail, semester registration, grants, documents, notifications |
| Administrator | 14 | dashboard, scholarships, new/edit scholarship, students, applications, registrations, grants, documents, activity, announcements, support, reports, settings |
| Fallback | 1 | `*` → not found |

Every page is lazy-loaded under one `Suspense` boundary. Student and admin
routes are guarded by role and by an authenticated session.

---

## 4. Data

**17 models.** See `prisma/schema.prisma` and `docs/architecture/ARCHITECTURE.md`.

| Group | Models |
|---|---|
| Identity | `User`, `Session`, `StudentProfile`, `EmailVerification` |
| Catalogue | `Scholarship`, `SavedScholarship` |
| Process | `Application`, `ApplicationTimelineEntry`, `SemesterRegistration`, `Grant` |
| Supporting | `StudentDocument`, `Announcement`, `Notification`, `AuditEntry`, `PlatformSettings` |

Key rules are database constraints where possible:

- one application per student and listing;
- one grant per application;
- one semester registration per student and term;
- unique public reference numbers.

Money is stored as integer centavos. List fields are JSON text and mapped at the
server boundary.

---

## 5. API

**73 endpoints** in 16 route modules. A grouped map, conventions, status codes
and upload rules are in `docs/architecture/API.md`.

The API is same-origin, JSON, session-cookie based, and uses explicit
authorisation guards. There is no CORS, no CSRF token, no raw SQL and no
server-side rendering.

---

## 6. Business rules

1. A grant requires an explicit confirmation by an administrator, from an
   approved application with no existing grant. Approval alone never creates a
   grant.
2. An application requires a complete profile, an open internal listing, a
   deadline that has not passed, and the platform's applications switch on.
3. A student has one application per listing; a draft is updated in place.
4. Decisions follow an explicit transition map; a grant locks the decision.
5. Semester registration requires an **active** grant and is one per term.
6. A student reaches only their own applications, documents, grants and
   registrations. Administrators are checked by role.
7. Verified documents and registrations are locked; changes require an
   administrator.
8. Announcement audience is derived from the session, never the query string.
9. Login and registration are throttled; one-time codes are hashed and
   attempt-limited.
10. Every consequential act is audited, including grant changes and staff
    document access.

---

## 7. Non-functional requirements

| Area | Target |
|---|---|
| Accessibility | WCAG 2.2 AA; keyboard, focus, 24 px targets, reduced motion |
| Responsive | 390, 768 and 1280 px; no horizontal page overflow |
| Themes | Light and dark; class-based, before first paint |
| Performance | API interactions measured in single-digit milliseconds locally; page work kept off long tasks |
| Security | scrypt passwords, HttpOnly sessions, server-side authorisation, CSP, no raw SQL |
| Privacy | Privacy notice and consent, data export, erasure request, staff access audited |
| Reliability | 81 unit/component tests, 11-step rehearsal, CI on every PR |

---

## 8. Verification

| Check | Result |
|---|---|
| Unit/component tests | 93 tests, 13 files |
| Type-check | `tsc -b` clean |
| Lint | `oxlint` clean |
| Build | 23 pages prerendered (15 published listings) |
| Rehearsal | 11/11 steps |
| Dependency audit | 0 known advisories |
| CI | `verify` green; `main` protected |

---

## 9. Known gaps

- Demo accounts are created by the seed with credentials published in this
  repository. The sign-in panel that filled them in is hidden outside
  development, but the accounts themselves still exist. Rotate or remove them
  before treating a deployment as anything other than a demonstration.
- Listing status and deadlines age quickly; several programmes are already marked
  closed and must be reconfirmed each intake.
- Email goes out through Resend when it is configured, but a sending domain is
  not verified, so the testing sender only reaches the address that owns the
  Resend account. Every other recipient is refused and the API reports that no
  code was sent. The console transport sends nowhere at all.
- Google sign-in is hidden without an OAuth client id.
- Browser-storage mode remains as a build-time option; it is not the deployment
  path.
- Throttles are in memory, so they assume one API process.
- Audit writes are fire-and-forget.
- The Docker deployment is a demonstration release: it keeps the seeded demo
  accounts, and the tunnel hostname changes when the tunnel restarts.
- List fields stored as JSON text are not queryable in SQL.

The pre-deployment checklist is in `docs/security/SECURITY-REVIEW.md`.
