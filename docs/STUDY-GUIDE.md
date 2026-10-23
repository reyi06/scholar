# Depth Over Breadth

A study guide for defending Scholar without memorising 33 screens.

The goal is not to know every file. It is to be able to take any feature and
answer five questions about it, in your own words, with a file and a line to
point at.

---

## 1. The five questions

For every feature, from login to grant confirmation:

1. **What does it promise?** One sentence, in the user's words.
2. **Where does the request go?** Screen → client API call → route → database.
3. **Who is allowed to do it?** Which guard runs, and what happens without it.
4. **What invariant does it protect?** The rule that must never be false.
5. **What happens when it fails?** Partial write, rollback, retry, audit gap.

If you can answer all five for five flows, you know the system. If you can only
demo it, you know the screens.

---

## 2. The request pipeline (one paragraph you should be able to say)

A browser request hits `server/index.ts` (`createServer`, line 45). The server
applies security headers, matches the path against the route table, and resolves
the session **once** from the `pgc_session` cookie
(`server/http/auth.ts:35`). It calls the handler with `{ req, res, params,
query, user }`. The handler checks the role and the row owner, validates input,
and talks to PostgreSQL through Prisma. Success is `send(res, status, body)`;
failure is `throw new HttpError(status, message)`. Unknown errors are logged and
become a generic 500, so internals never reach the client.

That is the whole architecture. Everything else is a variation.

---

## 3. The five flows

### A. Sign in and stay signed in

**Promise:** "The right person gets in, and the browser remembers them."

**Trace**

1. `src/pages/public/LoginPage.tsx` — `handleSubmit` (line 28) calls
   `authApi.login` (`src/lib/httpApi.ts:158`).
2. `POST /api/auth/login` — `server/routes/auth.ts:41`.
3. `loginThrottle(email, origin)` runs **before** the password is checked, so a
   locked-out caller learns nothing about the account.
4. `verifyPassword` (`server/passwords.ts:20`) uses scrypt + per-password salt +
   `timingSafeEqual`.
5. Success clears the counter and calls `startSession`
   (`server/http/auth.ts:50`), which writes a random UUID to `Session` and sets
   `HttpOnly; SameSite=Lax` cookie.
6. Every later request runs `currentUser`, which deletes expired sessions and
   returns the user. Logout deletes the row (`server/routes/auth.ts:212`).

**Invariant:** the browser never holds identity, only an opaque session id. The
server can revoke access by deleting one row.

**What removing the guard would do:** delete the session lookup and every
request becomes anonymous; the UI would look signed in because `AuthProvider`
still holds a user object until reload. That difference — UI state vs server
state — is exactly the bug class to watch for.

**Say this:** "Authentication is a database lookup per request, not a JWT. That
costs one query and buys immediate revocation."

**Questions to answer aloud**

- Why is the throttle checked before the password?
- Why does `AuthProvider.refresh()` not use `getCurrentUserSync()` in HTTP mode?
- What does `Secure` on the cookie have to do with the demo running on HTTP?

---

### B. Apply to a listing

**Promise:** "A student can apply once per listing, with a reference number they
can quote."

**Trace**

1. `ScholarshipDetailPage` → `applicationsApi.create`.
2. `POST /api/applications` — `server/routes/applications.ts:84`.
3. `requireRole(user, 'student')`; the listing must exist and be `open`.
4. A second application for the same student+listing is refused unless the
   existing one is still a draft.
5. `nextReference('APP', existingRefs)` (`server/ids.ts:15`) produces
   `SCH-APP-YYYY-NNNN`.
6. `prisma.application.create` writes the application, its first timeline entry
   and a notification in one Prisma call.

**Invariants:** one application per student per listing; reference numbers are
unique (`Application.referenceNo @unique`).

**Where it is weak — know this before a panel finds it**

- The server checks `status === 'open'` but **not the deadline**. The UI hides
  the form after the deadline, but the API does not. A crafted request can apply
  late.
- The server does not check `profileComplete`. The client route guard does.
- The uniqueness check is a `findFirst` followed by an insert. Two concurrent
  requests can both pass; the unique index on `(student, listing)` does not
  exist, only on `referenceNo`. So duplicates are possible under a race.

These are not reasons to panic. They are exactly the "what would you fix next"
answers a panel wants, and you should be the one to raise them.

**Questions**

- Which of these checks is a UX rule and which is a business rule?
- Why is the reference number computed from existing rows rather than a
  database sequence? What does the unique constraint buy you?
- If the notification insert fails, is the application still created? (Yes —
  there is no transaction. Know that.)

---

### C. An administrator decides

**Promise:** "A decision is recorded, explained, and the student is told."

**Trace**

1. Admin applications screen → `POST /api/applications/:id/status`
   (`server/routes/applications.ts:217`).
2. `requireRole(user, 'admin')`.
3. The status must be one of `under-review | needs-info | approved | rejected`
   (`DECISIONS`, line 167).
4. A note of at least five characters is required.
5. In one Prisma call: update status, review notes, reviewer, and append a
   timeline entry.
6. Then a notification, then `recordAudit({ action: 'application.decided' })`.

**Invariant:** approving changes status **only**. It must not create a grant.
The comment at the route says this explicitly; the next flow enforces it.

**What is missing:** there are no legal-transition rules. A rejected application
can be marked approved later. That is defensible as "a reviewer correcting a
mistake", but you must say so deliberately rather than discover it.

**Questions**

- Why is the timeline a separate table instead of a status field?
- What is the difference between `reviewNotes` and the audit `detail`?
- What happens if the audit write fails? (It is fire-and-forget by design: the
  action succeeds, and the gap is logged loudly.)

---

### D. Confirm a grant

**Promise:** "Money leaves only through one explicit, attributable act."

**Trace**

1. Admin grants screen → `POST /api/grants/confirm`
   (`server/routes/grants.ts:83`).
2. `requireRole(user, 'admin')`.
3. Application must have status `approved`, else 409.
4. No existing grant for that application, else 409.
   `Grant.applicationId @unique` is the database backstop.
5. `amountCentavos: Math.round(amount * 100)`.
6. Create the grant; notify the student; write `grant.confirmed` to the audit.

**Invariant:** approval ≠ grant; one grant per application; money is an integer.

**What to point at in the schema:** `amountCentavos Int` with its comment, and
`applicationId String? @unique`.

**Failure mode:** the grant, notification and audit are three separate writes.
A crash between them can leave a grant with no notification or no audit entry.
The unique constraint still prevents a double grant, which is the part that
matters financially.

**Questions**

- Why store centavos rather than a decimal?
- What stops a double confirmation under two simultaneous clicks?
- Why is the audit entry written after the grant rather than before? What would
  you change?

---

### E. Upload and retrieve a document

**Promise:** "A file is stored against the student, safe to name, safe to fetch."

**Trace**

1. `DocumentsPage` builds `FormData`; `POST /api/documents`
   (`server/routes/documents.ts:76`).
2. `readMultipart` (`server/uploads.ts:84`) buffers the body under
   `MAX_DOCUMENT_BYTES + 16 KB`.
3. `validateDocumentFile` re-checks type and size on the server.
4. Classification: the requested value if it is in the allowed list, otherwise
   `classifyDocument(fileName, mimeType)` — the same function the browser used
   (`src/lib/documents.ts:81`).
5. `storedNameFor(id, mimeType)` → `<doc-id>.<ext>`. The uploaded filename is
   **never** used in a path.
6. Bytes are written, then the row. If the row fails, `deleteUpload` removes the
   orphan.
7. Download: `GET /api/documents/:id/file`
   (`server/routes/documents.ts:141`), owner-or-admin check, safe-name check,
   then the file. Viewing is audited.

**Invariant:** a document belongs to a student, and an attacker-controlled name
never reaches the filesystem.

**Gap to know:** the MIME type is declared by the client, not sniffed from the
bytes. `nosniff` on responses limits the consequence, but a file claiming
`application/pdf` gets a `.pdf` name. Say that plainly.

**Questions**

- Why check the file twice, in the browser and on the server?
- Why is the stored name derived from the id rather than the original name?
- What breaks if the row insert fails after the bytes are written?

---

## 4. Labs (do these, don't just read them)

Use the development stack: `npm run server` and `npm run dev`. The database is
`scholar` on `localhost:5432` (`postgres` / `postgres`). Restore any file you
edit with `git checkout -- <file>`.

1. **Authorization.** With a student session, request `GET /api/students`.
   Expect 403. Find `requireRole`. Remove it, restart the API, request again.
   Observe the data leak. Restore. *Lesson: a guard is one line and its absence
   is invisible from the UI.*
2. **Invariant.** Confirm the same approved application twice. The second call
   must return 409. Then inspect `Grant.applicationId @unique`. *Lesson: the
   code check and the constraint protect the same rule at different layers.*
3. **Money.** After a confirmation, run
   `select "amountCentavos" from "Grant" order by "releasedAt" desc limit 1;`
   Compare it with the peso amount in the UI. *Lesson: conversion at the
   boundary.*
4. **Session revocation.** Copy a session id from the `Session` table, delete
   the row, then click anything in the UI. Expect 401. *Lesson: server state is
   the authority; the browser object is a cache.*
5. **Deadline gap.** Set a listing's deadline to `2020-01-01` in psql, then
   submit an application to it with the student session. It currently succeeds.
   Write the missing server check, add a test, and verify it returns 409.
   *Lesson: UI rules are not invariants.*
6. **Upload rejection.** `curl -F "file=@notes.txt;type=text/plain"` to
   `/api/documents` with a student cookie. Expect 400 before anything reaches
   disk. *Lesson: validate at the trust boundary.*

---

## 5. A two-hour plan

| Time | Do |
|---|---|
| 0–20 | Read flow A; close the file; explain it aloud from memory |
| 20–40 | Flow B; then do lab 5 and write the missing check |
| 40–60 | Flow C; explain the "approval is not a grant" rule in 30 seconds |
| 60–80 | Flow D; do labs 3 and 2 |
| 80–95 | Flow E; lab 6 |
| 95–110 | Lab 1 (authorization) and lab 4 (session) |
| 110–120 | Answer the five questions for a flow chosen at random |

If you can do that, you are not demonstrating breadth. You are defending
decisions.

---

## 6. Do not memorise

- Exact file counts, endpoint counts, or model counts.
- Every status string.
- UI details.

Do memorise: the five invariants, the request pipeline, the two or three known
gaps, and the reason each constraint exists.

The strongest sentence in a defence is not "it has 70 endpoints". It is
"approval is not a grant; here is the route that enforces it, the unique index
behind it, and the rehearsal step that proves it."
