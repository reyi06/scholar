# Architecture decisions

Short records of choices that are easy to undo by accident. Each entry says what
was chosen, why, and what it costs.

---

## D1. PostgreSQL, not SQLite

**Decision:** PostgreSQL 17 is the database; Prisma 7 uses
`@prisma/adapter-pg`.

**Why:** the system has concurrent users, money, relational integrity and a
real deployment target (Supabase is PostgreSQL). SQLite was useful for the first
prototype but is the wrong default for a multi-user office system.

**Cost:** local development needs a running PostgreSQL service; the demo
launcher must bundle one.

---

## D2. SPA plus JSON API, not server rendering

**Decision:** React renders in the browser. The build writes per-route HTML
metadata, but not page content.

**Why:** the app is authenticated, interactive and stateful; a single API owns
authorisation. A separate static site is simpler to host and keeps the browser
away from the database.

**Cost:** first paint needs the JS bundle; SEO is limited to metadata and the
public pages. There is no progressive enhancement.

---

## D3. Same-origin API, no CORS

**Decision:** the browser calls `/api` on its own origin. Vite proxies in
development; the host or a reverse proxy does it in production.

**Why:** the session cookie is `HttpOnly` and first-party. No CORS
configuration, no cross-site cookie rules, no token in JavaScript.

**Cost:** the site and API must be deployed together, or behind one domain.

---

## D4. Sessions in PostgreSQL, not JWTs

**Decision:** a random UUID in a `Session` row, sent as an `HttpOnly` cookie.

**Why:** revocation is one delete; logout is real; the browser holds only an
opaque id. A JWT would need a revocation list to match that.

**Cost:** one session lookup per request. Expired rows are deleted on read.

---

## D5. No web framework

**Decision:** Node's `http` with a small router, no Express, Fastify or Hono.

**Why:** the API is a fixed set of routes; the framework would add a dependency
and a layer without removing work. Routing, responses and errors are explicit.

**Cost:** multipart parsing, cookies and routing are owned code. They are small
and tested indirectly, but they are not battle-tested middleware.

---

## D6. Hand-rolled design system

**Decision:** 29 primitives in `src/components/ui/`, Tailwind v4 tokens in
`src/styles/index.css`. No shadcn, Radix, Material UI or Bootstrap.

**Why:** the visual language is specific (maroon/gold, flat surfaces, one
accent). A component library would be fought rather than used.

**Cost:** accessibility behaviour in dialogs, tabs and tables is our
responsibility; it must be tested with the keyboard.

---

## D7. Money as integer centavos

**Decision:** `Grant.amountCentavos Int`; the API accepts and returns pesos.

**Why:** floating-point money accumulates error the moment it is summed, and a
report that disagrees with its rows by a centavo destroys trust.

**Cost:** every boundary converts. There is one conversion point, not many.

---

## D8. Approval is not a grant

**Decision:** an administrator decision changes the application status only. A
grant is created by an explicit confirmation, from an approved application, with
`Grant.applicationId @unique`.

**Why:** the decision is a review; the grant is the financial act. Keeping them
separate gives the office a clear record of who released money and when.

**Cost:** two screens and two steps. That is the point.

---

## D9. Documents belong to the student

**Decision:** `StudentDocument.studentId` is the owner; `applicationId` is
optional.

**Why:** the same certificate of enrolment is evidence for every listing the
student applies to. Re-uploading it per application would create duplicates and
inconsistent evidence.

**Cost:** deleting a student cascades rows; the file on disk must be removed by
the route/prune job. Stored names are generated (`<id>.<ext>`), never the
uploaded name.

---

## D10. Two data implementations, selected at build time

**Decision:** `src/lib/api.ts` is the seam. `VITE_API_BASE_URL` selects the HTTP
implementation; unset selects browser storage.

**Why:** the interface was built before the backend existed, and the
browser-storage mode remains useful for a static demo.

**Cost:** two behaviours to keep aligned. The production build uses HTTP; the
browser-storage path is not the deployment path.

---

## D11. Public repository contains technical docs only

**Decision:** group planning, member task lists, the capstone paper and internal
agent notes live outside the public repo.

**Why:** the repository is the website. Personal and course-management material
does not belong in a public codebase, and mixing it makes the history harder to
share.

**Cost:** those documents need a separate private location. The public tree
still contains the technical spec, architecture, design, deployment and security
review.

---

## D12. Protected `main` and required CI

**Decision:** `main` requires a pull request, one approval, resolved
conversations and a green `verify` check; force pushes and deletions are blocked.

**Why:** ten collaborators and a public repository make direct pushes a
coordination hazard. The check proves tests, types, lint, migrations, seed and
build before merge.

**Cost:** every change needs a branch and a reviewer. The owner can bypass in an
emergency; collaborators cannot.
