# Scholar: A Web-Based Scholarship Information and Student Grant Management System for the Province of Pampanga

**System Documentation for Defense**

---

## Abstract

Scholar is a web-based scholarship information and student grant management
system for the province of Pampanga. It consolidates scholarship and grant
listings from provincial, municipal, national, educational and private providers
into a single searchable directory, and gives students one place to keep their
profile and supporting documents, submit applications, file their semester
registration, and monitor the outcome of both.

The system separates the student-facing portal from an administrative
workstation used by scholarship personnel. That separation is enforced on the
server, not in the browser: every request is authorised per user, and a student
can only reach records they own.

The central design commitment is that **an approved application is not a released
grant**. Approval records a decision about a submission; funds move only when an
administrator separately confirms a grant record with an amount and a term. The
data model, the status machine and the administrator interface are all built so
that this distinction cannot be lost.

The system is implemented as a React single-page application over a Node HTTP
API and a relational database, with fourteen data entities, sixty-seven API
routes and thirty-one client routes. It was verified through route sweeps across
three viewport sizes, HTTP-level tests of every authentication and upload rule,
and a decoded check of the generated QR codes.

---

## 1. Introduction

### 1.1 Background

Scholarships and student grants are a principal means by which students in the
Philippines fund their education. In Pampanga, assistance is offered by the
provincial government, by municipal and city governments, by national agencies,
by schools and universities, and by private organisations. The programmes differ
in eligibility, documentary requirements, benefits and application procedure, and
the information about them is distributed across offices, notice boards,
websites and word of mouth.

For students, the practical difficulty is not a shortage of programmes but the
absence of a single, reliable place to find them and to know what each one
requires. For the scholarship office, the difficulty is the reverse: records of
applications, registrations and released grants are maintained in separate
files, and answering a simple question — who has been granted what, and when —
requires assembling information from several of them.

### 1.2 Statement of the Problem

The study addresses the following problems:

1. Students repeatedly submit or update the same information when registering
   each semester.
2. Scholarship and grant information is scattered across sources, making it
   difficult to access and to keep current.
3. Students are often unaware of available programmes and of the requirements
   attached to them.
4. Scholarship personnel experience difficulty organising, searching and
   monitoring student grant records.
5. Manual handling of scholarship information and registrations consumes time
   and is prone to inconsistency.

### 1.3 Objectives

**General objective.** To develop a web-based scholarship information and student
grant management system that centralises scholarship information and streamlines
the management of student grant records and semester registrations.

**Specific objectives.** The system aims to:

1. Provide students with a centralised platform for accessing available
   scholarships and grants.
2. Display scholarship qualifications, requirements, benefits and application
   information in an organised manner.
3. Allow student grantees to register and update their information each semester.
4. Enable students to monitor the status of their scholarships or grants.
5. Provide scholarship personnel with an organised system for managing student
   records, scholarship information and registrations.

### 1.4 Significance of the Study

**To students.** One directory, one profile, one place to track every
application and every confirmed grant. Information entered once is reused, which
removes the repeated submission the study identifies as problem one.

**To scholarship personnel.** A single administrative workstation covering
listings, students, applications, registrations, grants, documents and reports,
with search and filtering on each.

**To the institution.** A defensible record of decisions. Every confirmation of a
grant is an explicit administrative act rather than an inference from a
spreadsheet column.

### 1.5 Scope and Delimitation

The system covers scholarship **information** and the **management of student
grant records**. It does not disburse funds; it records that funds were released,
by whom, and for which term.

The original proposal was written for Pampanga State University. The implemented
scope is the **whole province of Pampanga**, so the directory is provider-agnostic
and students are matched by municipality, education level and school rather than
by campus.

Delimitations:

- The directory ships with **illustrative placeholder listings**. Provider names
  and programmes must be replaced with verified records before public use.
- Email is delivered through a **development transport** that prints messages to
  the server log. A production deployment substitutes a real email service.
- Google sign-in requires an OAuth client registered in Google Cloud. When it is
  absent the control is hidden rather than shown and broken.
- The system is not a payment system, a learning management system, or a document
  archive with long-term retention guarantees.

---

## 2. Definition of Terms

| Term | Meaning in this system |
|---|---|
| **Listing** | A published scholarship or grant programme, with its provider, eligibility, requirements, benefits, deadline and application mode. |
| **Application** | A student's request for a listing, submitted inside the platform. It moves through review and receives a decision. |
| **Application mode** | Whether a listing is applied for **internally** (tracked here) or **externally** (the provider runs its own process; the system only links to it). |
| **Semester registration** | A term-by-term record filed by a student who **already holds a confirmed grant**, so enrolment can be verified. It is not a new application. |
| **Grant** | A confirmed record that funds were released, with an amount, academic year, semester and the administrator who confirmed it. |
| **Confirmation** | The administrative act that creates a grant from an approved application or a verified registration. |
| **Classification** | The category a student document is filed under (enrolment, grades, indigency, identification, residency, good moral character, other). |
| **Provider** | The organisation offering a listing (provincial, municipal, national, educational, private). Not to be confused with an email service provider. |

---

## 3. System Analysis and Design

### 3.1 System Architecture

The system is composed of three separately deployable parts:

1. **A React single-page application** — every screen the student or administrator
   uses. It holds no data of its own in production and never communicates with the
   database directly.
2. **A Node HTTP API** — owns the database connection, authenticates every
   request, and decides every authorisation question. It exposes sixty-seven
   routes.
3. **A relational database** — fourteen entities, defined once in a Prisma schema
   that also serves as the data dictionary.

```
Browser (React SPA)
        │  HTTPS, session cookie
        ▼
Node HTTP API  ──►  Relational database
        │
        └──►  File store (uploaded documents)
```

This separation is deliberate and is the system's primary security boundary. A
route guard in the browser is navigation, not protection; the same rules are
enforced again on the server for every request.

### 3.2 Data Model

Fourteen entities, grouped by concern:

**Accounts and access**

| Entity | Purpose |
|---|---|
| `User` | Identity, role (`student` or `admin`), credential state, Google identifier, profile-completion and email-verification flags |
| `Session` | Server-side session record; the browser holds only an opaque identifier in an HttpOnly cookie |
| `StudentProfile` | The student's academic and personal details, one per user |

**Scholarship information**

| Entity | Purpose |
|---|---|
| `Scholarship` | A listing: provider, type, municipality, education levels, benefits, eligibility, requirements, deadline, application mode |
| `Announcement` | A notice, with category (advisory, deadline, result, general), audience and pin state |
| `Notification` | A per-user in-app message |
| `SavedScholarship` | A student's shortlist |

**Student records**

| Entity | Purpose |
|---|---|
| `Application` | A submission, with status, reference number, statement, checklist and reviewer notes |
| `ApplicationTimelineEntry` | An append-only record of each status change, with actor and note |
| `StudentDocument` | An uploaded file filed against the student profile, with classification and verification state |
| `SemesterRegistration` | A term record for an existing grantee |
| `Grant` | A confirmed release, linked to the application or registration that justified it |

**System**

| Entity | Purpose |
|---|---|
| `EmailVerification` | A one-time code, stored only as a hash, with expiry and attempt count |
| `PlatformSettings` | Academic year, semester, whether applications are open, contact address |

### 3.3 User Roles

| Role | Reach |
|---|---|
| **Visitor** | Directory, listing details, announcements, FAQ, about. No private record is fetched on any public route. |
| **Student** | Own profile, documents, applications, semester registration, grants and notifications. Never another student's records. |
| **Administrator** | All listings, students, applications, registrations, grants, documents, announcements and reports. |

Roles are stored on the user record and checked on the server for every
request. In addition, ownership is checked separately: holding the student role
does not grant access to another student's application.

### 3.4 Process Flows

**3.4.1 Application lifecycle.** An application moves through a fixed set of
states: *draft* → *submitted* → *under review* → one of *approved*, *needs
information* or *rejected*. A *needs information* decision returns the
application to the student's attention with a note. Every transition is written
to the timeline with the acting administrator and the reason.

**3.4.2 Approval to grant.** Approval ends the review. It does **not** create a
grant. The application then appears on an administrator's "awaiting grant
confirmation" list, where a separate action records the amount, academic year and
semester and creates the grant. Only that action releases funds, and only then
does the grant appear under the student's *My Grants*.

**3.4.3 Document handling.** A student selects a file; the system suggests a
classification from the file name and content type; the student may correct it;
the server validates the type and size, stores the bytes under an identifier
derived from the content type, and records the metadata. An administrator may
verify the document or return it with a note. A verified document cannot be
deleted by the student, because it is the evidence a decision rested on.

**3.4.4 Semester registration.** Available only to a student holding a confirmed
grant. The student confirms their school, course, year level, units and average
for the term; an administrator verifies or rejects the record with a reason.

**3.4.5 Registration and profile completion.** Sign-up is a two-step process:
credentials, then the student details that eligibility depends on. An account
created through Google has no such details at first, so it is marked incomplete
and routed to a completion step before any other student page opens.

---

## 4. Features and Functions

### 4.1 Public Features

| Feature | Function |
|---|---|
| **Scholarship directory** | Search and filter by type, municipality, education level, deadline and sort order, with pagination and an explicit empty state. |
| **Listing detail** | Summary, benefits, eligibility, requirements, application instructions and a side panel stating whether the application is handled here or by the provider. |
| **Announcement channel** | Notices from the office, categorised as advisory, deadline, result or general, pinned first, filterable by category. |
| **Share and QR** | Any listing can be shared as a link or a scannable QR code, generated in the browser so the URL is not disclosed to a third party. |
| **About and FAQ** | What the platform is, how applications are handled, the record types, provider categories, privacy of records, and answers to common questions. |
| **Accounts** | Student registration, sign-in, password reset by one-time code, and optional Google sign-in. |

### 4.2 Student Features

| Feature | Function |
|---|---|
| **Profile management** | View and update academic and personal details; read-only by default with an explicit edit mode. |
| **Email verification** | Confirm the address with a six-digit code, so the office can reach the student about an application. |
| **Document library** | Upload, classify and remove supporting documents; see verification status and any note from the office. |
| **Applications** | Submit an application with a statement against a listing's checklist; save a draft; withdraw; follow each status change on a timeline. |
| **Semester registration** | File the term record required to keep a grant, with a review step before submission. |
| **My grants** | Confirmed grants with amount, term and release date, and a total released. |
| **Saved scholarships** | A shortlist carried across sessions. |
| **Notifications** | In-app messages, with an unread count in the header. |

### 4.3 Administrator Features

| Feature | Function |
|---|---|
| **Dashboard** | The review queue, pending registrations, grants awaiting confirmation and recent activity. |
| **Scholarships** | Create, edit, publish, unpublish and delete listings; set provider, eligibility, requirements and deadline. |
| **Students** | Search and filter student records by municipality; view, edit and remove. |
| **Applications** | Filter by status and listing; open an application; approve, request information or decline with a mandatory note. |
| **Registrations** | Verify or reject semester registrations, with a reason on rejection. |
| **Grant records** | Confirm grants from approved applications; record amount, term and remarks; see totals released. |
| **Documents** | Review the document queue by status; reclassify, verify, or return a document with a note. |
| **Announcements** | Publish notices with category, audience and pin state; edit and delete. |
| **Reports** | Applications by status, listing and month; registrations by status; grants by municipality; each exportable to CSV. |
| **Settings** | Academic year, semester, whether applications are open, the maintenance message and the contact address. |

## 5. Technical Implementation

### 5.1 Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Interface | React 19, React Router 8 | Component model and client-side routing; both are stable and widely documented |
| Build | Vite 8, TypeScript 6 | Fast development server; static type checking across client, server and scripts |
| Styling | Tailwind CSS 4 | Design tokens defined once in CSS; no separate stylesheet per page |
| API | Node `http`, TypeScript | No framework dependency; the routing, sessions and authorisation are explicit and inspectable |
| Persistence | Prisma 7 with SQLite; PostgreSQL as deployment target | Typed schema shared by client types, server and seed data |
| QR encoding | `qrcode-generator` | A standardised algorithm whose output cannot be verified by reading it |
| Verification | `playwright-core` driving the installed Chrome | Real viewport sizes without downloading a browser |

Runtime dependencies are limited to React, React DOM, React Router and the QR
encoder. Icons, dialogs, tables, CSV export, validation, multipart upload
parsing, JWT verification and one-time codes are implemented in the repository.

### 5.2 Data Access Layer

Every screen reads and writes through a single module, `src/lib/api.ts`. It
exposes grouped APIs — authentication, scholarships, saved listings,
applications, registrations, grants, documents, announcements, notifications,
students, settings and reports — each returning promises.

The module selects its implementation at load time. When `VITE_API_BASE_URL` is
set, requests go to the HTTP API; otherwise a browser-storage implementation
serves the same interface. No page knows which is active, which is what makes the
backend a replaceable layer rather than a rewrite.

### 5.3 Authentication and Sessions

Passwords are hashed with **scrypt** from `node:crypto`, with a per-user salt and
a constant-time comparison. Plain-text credentials are never stored, and no
endpoint serves a password.

A successful sign-in creates a row in `Session` and sets an **HttpOnly,
SameSite=Lax** cookie containing only the session identifier. JavaScript cannot
read it. Logout deletes the row and expires the cookie. Accounts created through
Google store an empty password hash and cannot be entered with a password at all.

Session lookup runs on every request; an expired session is deleted on sight
rather than trusted until it is next used.

### 5.4 Authorisation

Three helpers are applied per route:

- `requireUser` — a session must exist.
- `requireRole` — the role must match.
- `requireOwnerOrAdmin` — the record's owner must be the caller, unless the
  caller is an administrator.

List queries are scoped in the database rather than filtered afterwards, so a
student's request cannot widen its own result set. As a consequence, a student
reading another student's application receives the same neutral response as one
reading a record that does not exist, and no reference number is leaked.

### 5.5 Security Controls

| Control | Implementation |
|---|---|
| **Credential storage** | scrypt hashing; parameters and salt stored with the digest |
| **Session transport** | HttpOnly cookie; no token in JavaScript-readable storage |
| **Account enumeration** | One message for an unknown address and a wrong password; the reset flow answers identically either way |
| **Upload validation** | Allowed types (PDF, JPEG, PNG), a 5 MB ceiling, and validation on both client and server |
| **Stored file naming** | Derived from the content type and document identifier, never from the uploaded name |
| **Uploaded content** | Always served with `Content-Disposition: attachment`, so an uploaded file cannot execute in the application's origin |
| **One-time codes** | scrypt hash only; ten-minute expiry; five attempts; resend cooldown; hourly ceiling; single use; per-purpose scope |
| **Throttling** | Per-account and per-address counters on sign-in and on code requests |
| **Destructive actions** | Confirmed in the interface; a verified document cannot be removed by the student |
| **Error messaging** | Specific to the user's situation, but never revealing whether another account exists |

### 5.6 Accessibility

The interface follows the conventions that produce a clean accessibility audit:

- one `<h1>` per page, supplied by the page header component;
- every form control has a label, an `id`, and errors announced with `role="alert"` and tied by `aria-describedby`;
- a visible focus ring on every interactive element;
- dialogs trap Tab, close on Escape, lock background scrolling and restore focus;
- the tooltip affordance responds to hover, focus and tap, and its text remains in the accessibility tree when collapsed;
- colour is never the only signal — statuses carry text as well as tone;
- motion respects `prefers-reduced-motion`;
- dark mode is a full theme, not an inversion, and both themes meet contrast thresholds.

### 5.7 Performance and Delivery

- **Route-level code splitting.** Every page is loaded lazily, so the public site
  does not ship the administrative code. The shared entry bundle is approximately
  329 kB (96 kB gzipped).
- **Prerendering.** Twenty-one pages are written as static HTML at build time —
  fourteen published listings plus the home, directory, announcements, about,
  FAQ, registration and sign-in pages — each with its own title, description,
  canonical URL and Open Graph metadata.
- **Crawler artefacts.** `sitemap.xml` and `robots.txt` are generated from the
  same data, so a newly published listing is discoverable without a code change.
- **Progressive web app.** A manifest and service worker precache the application
  shell and hashed assets, serving the cached shell on navigation failure. API
  responses are deliberately never cached.
- **Static layout.** Illustrations are inline SVG with explicit dimensions, so
  they contribute no layout shift.

### 5.8 Search and Filtering

Scholarships are filtered on the server through a single query builder that
handles free text, type, municipality, education level, deadline proximity,
featured state, publication state and sort order. Applications, registrations and
grants each have their own search and status filters. Default sort places open
listings with future deadlines above closed ones, because leading a "soonest
deadline" list with expired records is actively misleading.

---

## 6. Business Rules Enforced in Code

| # | Rule | Where it is enforced |
|---|---|---|
| 1 | Placeholder listings must be replaced with verified provider data before publishing | Repository documentation and release checklist |
| 2 | Internally and externally handled applications stay distinguishable | `Scholarship.applicationMode`; copy on both application screens |
| 3 | An external listing shows the provider's link and never accepts an in-platform application | Listing detail; application creation refuses external listings |
| 4 | **An application never becomes a grant automatically** | Grant confirmation is the only creation path; an "awaiting confirmation" list surfaces the gap |
| 5 | Semester registration is for existing grantees, tracked separately | The page refuses unless a confirmed grant exists |
| 6 | Only administrators manage listings, reviews and grant records | Role checks on every administrative route |
| 7 | Students may read or modify only their own private records | Ownership check on each record route |
| 8 | Private records are never reachable from public routes | No private data is fetched on any public page |
| 9 | Empty states and validation messages are real, never simulated success | Shared empty/error components; toasts only after an observed effect |
| 10 | Nothing is claimed that is not implemented | The verification screen reports where the code actually went; no email is implied when none was sent |

---

## 7. Verification and Testing

The project has **no automated unit-test suite**; verification is scripted and
browser-driven. What follows is what was run and observed.

### 7.1 Static Checks

`npx tsc -b` type-checks the client, the server and the build scripts. `oxlint`
reports no findings. `npm run build` completes and prerenders twenty-one pages.

### 7.2 Route Sweep

Thirty-one routes were loaded in three passes — signed out, as a student and as
an administrator — with console output captured. Every route rendered its
expected heading, with no uncaught errors, no `undefined`, `NaN` or
`[object Object]` in rendered text, and no redirect where one was not expected.

### 7.3 Responsive Verification

`npm run check:responsive` drives Chrome at 390, 768 and 1280 pixels and reports
horizontal overflow and missing headings per route. The final run covered
**seventy-eight page loads**, all clean. The tool found two genuine defects on its
first run — tooltips anchored at the left edge widened the document on a phone —
which were fixed and re-verified.

### 7.4 Authentication and Record Access over HTTP

Each rule was exercised directly against the running API with a cookie jar:

| Check | Observed |
|---|---|
| Wrong password | `401` |
| Unknown address | `401`, identical body to a wrong password |
| Google-only account with an empty password | `401` |
| Empty or malformed one-time code | `400`, with the same message for both |
| Correct one-time code | `200`, address marked verified |
| Replaying a used code | `400` |
| Five wrong attempts, then the correct code | `400` — the challenge is exhausted |
| A verification code presented for a password reset | `400` — purposes are scoped |
| Password reset | `200`; the old password then `401`, the new one `200`, and prior sessions deleted |
| Student reading another student's record | `403` |
| Student reading a verified document by path | Refused; downloads are owner-checked by identifier |
| Signed out accessing a private document | `401` |

### 7.5 Document Handling

Uploads were exercised with real multipart requests: a valid PDF was accepted
and classified from its name; a text file was refused with a type message; the
download returned the same byte count it received; and an administrator could
verify a document while a student could not. Five wrong passwords on an account
produced a lockout once throttling was added.

### 7.6 QR Codes

The rendered QR matrix was extracted from the DOM, rasterised, and decoded:

```
decoded: 'http://localhost:5173/scholarships/sch_008'
```

This matters because a screenshot cannot distinguish a working QR code from a
plausible-looking broken one.

### 7.7 Accessibility

An automated audit of the public pages, the student dashboard and the
administrative pages previously reported full marks for accessibility, best
practices and search metadata. The checks that produced that result are the
conventions listed in section 5.6; they are maintained as the interface changes,
and the responsive tooling catches layout regressions before they reach a user.

---

## 8. Limitations

These are stated plainly because they are the questions a panel is most likely
to ask.

1. **The listings are illustrative.** Provider names and programmes are
   placeholder records. Real deployments require verified provider data.
2. **Email is a development transport.** Codes are printed to the server log. The
   delivery layer is a seam; a production deployment implements one function and
   sets a transport name.
3. **Google sign-in requires external configuration.** Without an OAuth client
   the control is hidden, which is safe but means the feature is not visible.
4. **The local database is SQLite.** The schema targets PostgreSQL for
   deployment; the migration is pending a connection string.
5. **No automated test suite.** Rules are verified by scripted HTTP tests and
   browser sweeps rather than by a test runner.
6. **Email verification is not a second factor.** It confirms reachability, not
   identity.
7. **Administrator accounts are provisioned outside the interface.** There is
   deliberately no self-service path to the administrator role.
8. **No audit log yet.** Administrative access to student documents is
   authorised but not recorded, which is a gap for a production deployment.

---

## 9. Future Work

Ordered by value rather than novelty:

1. **Audit logging** of administrative access to student records.
2. **Data-subject requests** — export of a student's own records, and a deletion
   request routed to an administrator.
3. **A privacy notice at the point of collection**, with a stated retention
   period for documents of unsuccessful applications.
4. **Saved searches with deadline alerts**, the natural sequel to the directory.
5. **Calendar export** of deadlines.
6. **Comparison of shortlisted listings** on requirements and deadlines.
7. **Offline document queue**, for students on intermittent mobile data.
8. **PostgreSQL migration** and automated backups.

---

## 10. Conclusion

The system meets the general objective and each of the five specific objectives.
Scholarship information is consolidated into one searchable directory and
presented in a consistent structure; students maintain one profile and one
document library that are reused across applications and semesters; semester
registration is available precisely to those who hold a confirmed grant; status
is visible to the student at every stage; and scholarship personnel have a single
workstation for listings, records, reviews, grants and reports.

The design decision that most distinguishes the system is the separation of
**approval** from **confirmation**. In a manual process these are easily
conflated, and conflating them means money is released because a spreadsheet row
says "approved". Here the two are distinct states, distinct actions and distinct
records, and the interface shows the gap when an approved application has no
grant yet.

The system is a functional, verified implementation of the proposed scope. Its
remaining gaps are the gaps of deployment rather than of design: verified data,
a production email service, a managed database and an audit trail.

---

## Appendix A — Route Inventory

**Public (11)**

`/` · `/scholarships` · `/scholarships/:id` · `/announcements` · `/about` ·
`/faqs` · `/login` · `/register` · `/forgot-password` · `/welcome` · `*` (not
found)

**Student (8)**

`/student/dashboard` · `/student/profile` · `/student/saved` ·
`/student/applications` · `/student/applications/:id` · `/student/documents` ·
`/student/semester-registration` · `/student/grants` · `/student/notifications`

**Administrator (12)**

`/admin/dashboard` · `/admin/scholarships` · `/admin/scholarships/new` ·
`/admin/scholarships/:id/edit` · `/admin/students` · `/admin/applications` ·
`/admin/registrations` · `/admin/grants` · `/admin/documents` ·
`/admin/announcements` · `/admin/reports` · `/admin/settings`

---

## Appendix B — API Surface (67 routes, grouped)

| Group | Representative routes |
|---|---|
| Health and session | `GET /api/health`, `GET /api/auth/session` |
| Authentication | `POST /api/auth/login`, `/logout`, `/register` |
| Google sign-in | `GET /api/auth/google/config`, `POST /api/auth/google`, `/google/complete` |
| One-time codes | `POST /api/auth/otp/request`, `/otp/verify` |
| Scholarships | `GET /api/scholarships`, `/:id`, `/options`, `/counts-by-type`; `POST`, `PATCH`, `DELETE` |
| Saved listings | `GET /api/saved`, `/saved/ids`, `POST /api/saved/:id/toggle` |
| Applications | `GET /api/applications`, `/:id`, `/counts`, `/awaiting-grant`; `POST`, `PATCH`, `/status`, `/withdraw`, `DELETE` |
| Registrations | `GET /api/registrations`, `/:id`, `/counts`; `POST`, `/status` |
| Grants | `GET /api/grants`, `/:id`, `/total-released`; `POST /api/grants/confirm`, `PATCH`, `DELETE` |
| Documents | `GET /api/documents`, `/records`, `/:id/file`; `POST`, `PATCH`, `DELETE` |
| Announcements | `GET /api/announcements`; `POST`, `PATCH`, `DELETE` |
| Notifications | `GET /api/notifications`, `/unread-count`; `POST /:id/read`, `/read-all` |
| Students | `GET /api/students`, `/:id`, `/count`; `PATCH`, `DELETE` |
| Profile | `GET /api/profile`, `PATCH /api/profile` |
| Settings and reports | `GET/PATCH /api/settings`, `GET /api/reports`, `GET /api/stats` |

---

## Appendix C — Verification Commands

```bash
npx tsc -b              # type-check client, server and scripts
npm run lint            # static analysis
npm run build           # production build + 21 prerendered pages + sitemap
npm run server          # API on :8787
npm run dev             # interface on :5173

npm run check:responsive                  # public routes at 390/768/1280
npm run check:responsive -- --role=student
npm run check:responsive -- --role=admin
```

`check:responsive` writes full-page screenshots to `tmp/responsive/`.

---

## Appendix D — Repository Map

| Concern | Location |
|---|---|
| Domain types (single source of truth) | `src/types/index.ts` |
| Data access seam | `src/lib/api.ts`, `src/lib/httpApi.ts` |
| Design system | `src/components/ui/` |
| Route table and guards | `src/App.tsx`, `src/components/layout/` |
| API server, authorisation, business rules | `server/index.ts` |
| Schema | `prisma/schema.prisma` |
| Seed data | `src/data/sampleData.ts`, `prisma/seed.ts` |
| One-time codes | `server/otp.ts` |
| Sign-in throttling | `server/throttle.ts` |
| Google token verification | `server/googleAuth.ts` |
| Upload handling | `server/uploads.ts` |
| Mail transport | `server/mailer.ts` |
| Prerendering, sitemap, PWA | `scripts/prerender.ts` |
| Responsive verification | `scripts/check-responsive.ts` |

