# Scholar — Defense Brief

**Pampanga State University · A Web-Based Scholarship Information and Student
Grant Management System**

This note maps the paper's stated problems and objectives to what the system
actually does, and says where to find each piece. It is written to be read
alongside the running application, not instead of it.

---

## 1. Scope

The paper was written for Pampanga State University. **The implemented scope is
the whole province of Pampanga**, so the system is provider-agnostic: listings
come from provincial, municipal, national, educational and private providers,
and a student is matched by municipality, education level and school rather than
by campus.

Nothing about the problems or objectives changes with that shift. The only
difference is that "the scholarship office" now means the provincial
scholarship office rather than a single university's affairs unit.

> **Naming.** The system is called **Scholar**. The paper's working name
> (PamSU GrantConnect) is superseded; the reference numbers use an `SCH-` prefix
> (`SCH-APP-2026-0001`).

---

## 2. Problems → what the system does

| # | Problem in the paper | How the system addresses it | Where to see it |
|---|---|---|---|
| 1 | Students repeatedly submit or update their information during semester registration | A student's details are captured **once at sign-up** and reused. Semester registration pre-fills from the stored profile; documents are filed against the profile, so one certificate of enrolment serves every listing that asks for it | `/register` (two steps), `/student/profile`, `/student/semester-registration`, `/student/documents` |
| 2 | Scholarship and grant information is scattered across sources | One searchable directory with filters for type, municipality, education level and deadline, plus a single detail template so every listing carries the same fields | `/scholarships`, `/scholarships/:id` |
| 3 | Students are unaware of opportunities and their requirements | Requirements, eligibility and benefits are first-class sections rather than prose; announcements and advisories surface deadlines on the home page | `/` (advisories), `/scholarships/:id` |
| 4 | Personnel struggle to organise, search and monitor records | A separate administrator area where students, listings, applications, registrations, grants and documents are each a list with search and filtering | `/admin/*` |
| 5 | Manual handling of scholarship information and registrations takes time | The workflow is modelled end to end — statuses, timeline entries, review notes, grant confirmation, CSV report export — instead of being tracked in spreadsheets | `/admin/applications`, `/admin/registrations`, `/admin/grants`, `/admin/reports` |

---

## 3. Specific objectives → features

| # | Specific objective | Satisfying feature | Where to demonstrate |
|---|---|---|---|
| 1 | Provide a centralized platform for accessing available scholarships and grants | Public directory with full-text search, filters, sorting and pagination; saved shortlist; announcements | `/scholarships` — search "IT", filter to *Municipal / City*, sort by deadline |
| 2 | Display qualifications, requirements, benefits and application information in an organized manner | A single detail layout with Summary, Benefits, Eligibility, Requirements, How to Apply, and an At a Glance panel | `/scholarships/sch_008` — every section is present and consistently ordered |
| 3 | Allow student grantees to register and update their information each semester | Semester registration, available **only to students holding a confirmed grant**, with a review-before-submit step | Sign in as a grantee → `/student/semester-registration` |
| 4 | Enable students to monitor the status of their scholarships or grants | Application list with statuses, per-application timeline and reviewer notes; a grants page; in-app notifications | `/student/applications`, `/student/applications/:id`, `/student/grants`, `/student/notifications` |
| 5 | Provide personnel with an organized system for managing student records, scholarship information and registrations | Seven administrator surfaces: students, scholarships, applications, registrations, grants, documents, reports | `/admin` — the sidebar lists them in workflow order |

---

## 4. Proposed functionalities → present or not

A quick instrument for the panel: *every line in the paper's Proposed
Functionalities section, and its status.*

### For students

| Proposed functionality | Status | Notes |
|---|---|---|
| Student Profile Management | **Implemented** | Read-only by default with an explicit edit mode; details are prerequisites at sign-up, not an afterthought |
| Scholarship Information Portal | **Implemented** | Directory + detail, including externally handled applications |
| Semester Registration | **Implemented** | Gated on holding a confirmed grant, per the paper's definition of a grantee |
| Grant Status Monitoring | **Implemented** | Applications, timelines, confirmed grants |
| Announcements and Notifications | **Implemented** | Home advisories, notification bell, per-user notifications |

### For scholarship personnel / administrators

| Proposed functionality | Status | Notes |
|---|---|---|
| Student Records Management | **Implemented** | Search, filter by municipality, view, edit, delete |
| Scholarship Management | **Implemented** | Create, edit, publish, unpublish, delete |
| Registration Management | **Implemented** | Review, verify, reject with a reason |
| Grant Monitoring | **Implemented** | Confirmed grants, totals released, CSV export |
| Reports Generation | **Implemented** | Applications by status/listing/month, registrations, grants by municipality; each table exports to CSV |

### Added beyond the paper

These were not proposed, and each is defensible as a direct consequence of the
objectives rather than scope creep:

- **Document upload and classification** — objective 2 says requirements must be
  *displayed*; this closes the loop by letting evidence be *submitted* against
  the profile, reviewable by the office.
- **Email verification by one-time code** — a scholarship office needs to know it
  can reach an applicant.
- **Google sign-in** — lowers the cost of the account objective 1 depends on.
- **Sharing by link and QR code** — a listing has to leave the system to reach a
  student; the province's own offices can print or send it.
- **Dark mode, offline shell, prerendered pages** — access from low-end phones
  and slow connections, which is the actual condition of the target users.

---

## 5. Design decisions worth defending

These are the choices a panel is most likely to probe. Each is enforced in code
rather than in copy.

**Approving an application does not release funds.** An approval is a decision
about an application; a grant record is created by a separate confirmation that
records the amount and term. The system cannot express the common spreadsheet
error where "approved" implies "paid".
→ `POST /api/grants/confirm` is the only path that creates a grant, and
`awaitingGrantConfirmation()` exists to surface the gap.

**Internal and externally handled applications are distinguishable.** Some
providers run their own process. Those listings surface the provider's link and
never accept an application in-platform, so the system does not imply it is
tracking something it is not.
→ `Scholarship.applicationMode`.

**Verification is a signal, not a gate.** Confirming an email is encouraged and
shown, but a deployment without mail configured must still work. This is why
verification does not block applying.

**The interface never claims something that did not happen.** With no mail
service configured, the verification screen says the code was printed to the
server log, because that is what happened. Downloads are always attachments,
because an uploaded file is untrusted content.
→ `delivery: 'log' | 'email' | 'none'` is returned by the API and rendered
verbatim.

**Authorisation is enforced on the server.** The browser's route guards are
navigation, not security. Ownership checks, role checks and grant confirmation
all run in `server/index.ts`, so a signed-in student cannot read another
student's application even with developer tools.

**No fabricated statistics.** The system does not invent "12,000 students
served". Placeholder listings are clearly placeholder data in the repository and
documented in the README; nothing in the interface asserts a number the system
cannot derive.

---

## 6. Suggested demonstration order (about eight minutes)

A sequence that shows the paper's objectives in the order they appear, rather
than walking the menus.

1. **Public directory** — search and filter; note that requirements and
   eligibility are structured, not prose. *(Objectives 1, 2)*
2. **Listing detail** — show an internally handled listing next to an externally
   handled one, and the Share dialog with its QR code. *(Objective 2)*
3. **Sign-up** — two steps: account, then the student details that eligibility
   depends on. *(Problem 1)*
4. **Profile** — edit mode, plus the email verification prompt. Explain that the
   code went to the server log and why. *(Problem 1; added feature)*
5. **Documents** — upload a certificate; it is classified automatically and
   filed on the profile, then reused. *(Problem 1)*
6. **Apply** — submit an application; show the status and timeline. *(Objective 4)*
7. **Administrator side** — review the application, then show that **approving
   created no grant**, and confirm the grant explicitly. *(Objective 5; the
   headline business rule)*
8. **Semester registration** — now available, because a confirmed grant exists.
   *(Objective 3)*
9. **Reports** — show the generated tables and export one to CSV.
   *(Objective 5)*

If time is short, steps 6–8 carry the argument: the separation between an
application, an approval and a confirmed grant is the system's central claim.

---

## 7. Limitations to state plainly

Stating these first is stronger than being asked.

- **The listings are placeholder data.** Provider names and programmes are
  illustrative and must be replaced with verified records before use. This is
  documented in `README.md` and enforced as a release rule in `AGENTS.md`.
- **Email is a development transport.** Codes are printed to the server log. The
  delivery layer is a seam; wiring a real email service means implementing one
  function and setting `MAIL_TRANSPORT`.
- **Google sign-in needs a Google Cloud OAuth client.** Without one the button is
  hidden rather than broken.
- **The database is SQLite locally.** The schema is written to move to PostgreSQL
  (Supabase) without changing the application layer; that migration is pending
  the connection string.
- **Email verification is not a second factor.** It confirms reachability, not
  identity. Two-factor authentication is out of scope.
- **Administrator accounts are created outside the interface** — there is
  deliberately no self-service route to an administrator role.

---

## 8. Where the objectives live in the code

For a technical question, or to prove a feature is real rather than mocked:

| Concern | File |
|---|---|
| Domain model (single source of truth) | `src/types/index.ts` |
| Data access seam (local storage ⇄ HTTP) | `src/lib/api.ts`, `src/lib/httpApi.ts` |
| Business rules and authorisation | `server/index.ts` |
| Database schema | `prisma/schema.prisma` |
| Approval vs grant confirmation | `server/index.ts` → `/api/grants/confirm` |
| Document classification (shared by client and server) | `src/lib/documents.ts` |
| One-time codes | `server/otp.ts` |
| Google ID-token verification | `server/googleAuth.ts` |
| Mail transport seam | `server/mailer.ts` |
| QR sharing | `src/components/ShareScholarship.tsx` |
| Design system | `src/components/ui/` |
| Prerendering, sitemap, PWA | `scripts/prerender.ts` |
