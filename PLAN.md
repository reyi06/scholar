# Improvement Plan — Scholar

A researched, prioritised plan for the next stage. It is deliberately split into
**what the standards require**, **what the code actually does today**, and **what
to do next**, so the reasoning is checkable rather than a list of opinions.

Written after the current build: 67 API routes, 21 prerendered pages, 27
application routes, 0 automated tests.

---

## 1. Research: what the relevant standards now say

### 1.1 Performance — Core Web Vitals

The thresholds are unchanged and are measured at the **75th percentile** of real
visits, separately on mobile and desktop:

| Metric | Good | Needs improvement | Poor |
|---|---|---|---|
| LCP | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| INP | ≤ 200 ms | 200–500 ms | > 500 ms |
| CLS | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Two things matter for this project specifically:

- **INP replaced FID in March 2024**, and it is the metric that has been getting
  *worse* across the web, not better. It measures every interaction, not just the
  first. A client-rendered React app with a large route graph is the exact shape
  that struggles with it.
- **A page passes only when all three are good.** One failing metric downgrades
  the whole URL group, so a shared layout defect penalises every page behind it.

Sources: [web.dev — defining CWV thresholds](https://web.dev/articles/defining-core-web-vitals-thresholds),
[2026 thresholds summary](https://www.corewebvitals.io/core-web-vitals).

### 1.2 Accessibility — WCAG 2.2 AA

WCAG 2.2 is backward compatible with 2.1 but adds nine success criteria and
removes 4.1.1 Parsing. Five of the additions bear directly on this application:

| Criterion | Level | What it asks | Relevance here |
|---|---|---|---|
| **2.4.11 Focus Not Obscured (Minimum)** | AA | Focused element must not be fully hidden by author content | Sticky listing sidebar; dialogs; the fixed `(?)` tooltip |
| **2.5.8 Target Size (Minimum)** | AA | Pointer targets ≥ 24 × 24 CSS px | The `(?)` is 16 px; icon-only buttons in toolbars |
| **3.2.6 Consistent Help** | A | Help mechanisms appear in the same relative order on every page | We have no persistent help affordance at all |
| **3.3.7 Redundant Entry** | A | Don't make people re-enter information already given in the same process | Multi-step registration; semester registration re-asks for school/course |
| **3.3.8 Accessible Authentication (Minimum)** | AA | No cognitive puzzle to authenticate; allow paste and password managers | OTP entry must stay paste-friendly; no CAPTCHA |

Sources: [W3C WAI — What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22),
[TetraLogical](https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2).

### 1.3 Privacy — the Data Privacy Act (RA 10173)

This is the area the current build is least prepared for, and the one most likely
to be probed by a panel in a Philippine school context.

- Student education records are **personal and sensitive personal information**
  under the DPA. Schools are **personal information controllers**, bound by
  transparency, legitimate purpose and proportionality.
- The NPC's 2025 advisory opinion reiterates that institutions must preserve
  confidentiality of learner records while still acting on the learner's own
  access requests, subject to identity verification.
- Data subjects hold **access, correction and erasure** rights, and a **privacy
  notice must be presented at the point of collection**.

What this application currently collects includes birth date, home address,
barangay, household income, GWA, guardian contacts, and uploaded identity
documents. That is a substantial sensitive-data footprint with **no privacy
notice, no stated retention period, no data-subject-request path, and no audit
trail** of who read a student's file.

Sources: [NPC Advisory Opinion 2025-0171](https://privacy.gov.ph/wp-content/uploads/2026/01/NPC-Advisory-Opinion-No.-2025-017_Redactedv2.pdf),
[RA 10173 applicability to schools](https://www.respicio.ph/commentaries/which-provisions-of-ra-10173-apply-to-educational-institutions-and-schools-in-the-philippines),
[UP student privacy notice (a good local model)](https://privacy.up.edu.ph/privacy-notices/ups-privacy-notice-for-students.html).

---

## 2. Where the build stands

Being fair to it before criticising it.

**Genuinely strong**

- Authorisation is enforced **server-side**, not in the route guards. Ownership
  checks, role checks and grant confirmation all run per request.
- The domain rule that matters most is modelled correctly: **approval is not a
  grant**, and the only path that releases funds is an explicit confirmation.
- Documents are stored as attachments with a filename derived from the content
  type, never the uploaded name; downloads are `Content-Disposition: attachment`.
- One-time codes use scrypt, a 10-minute expiry, five attempts, resend cooldown,
  an hourly ceiling, single use and per-purpose scoping — and each of those was
  verified over HTTP, not asserted.
- The UI does not claim what did not happen: with no mail transport, it says the
  code went to the server log.
- No horizontal overflow at 390/768/1280 across 78 page loads, verified by script.

**Weak or missing, from the audit**

| Gap | Evidence | Severity |
|---|---|---|
| **No error boundary** | 0 matches for `ErrorBoundary`/`componentDidCatch`; a thrown hook error blanks the whole app (observed) | High |
| **No privacy notice or consent at collection** | Registration collects income, birth date, address with no notice | High (legal) |
| **No audit trail of admin access to student records** | No audit model; documents opened by admins leave no trace | High |
| **Login is not throttled** | Only the OTP endpoint has an IP limiter (`checkAddressAllowance`); `/api/auth/login` has none | High |
| **No security headers** | No CSP, `X-Frame-Options`, `Referrer-Policy` or HSTS in the server | Medium |
| **Money stored as `Float`** | `Grant.amount Float` — rounding errors in sums and reports | Medium |
| **No tests** | 0 spec files; 67 routes verified by hand | Medium |
| **No data-subject request path** | No export-my-data or delete-my-account | Medium (legal) |
| **Session cookie lacks `Secure`** | `HttpOnly; SameSite=Lax` only — correct locally, wrong in production | Medium |
| **No consistent help mechanism** | WCAG 3.2.6 (A) currently unmet | Low–Medium |
| **Help targets are 16 px** | WCAG 2.5.8 asks for 24 × 24 | Low |

---

## 3. The plan

Four phases, ordered so that the things that can *hurt* come first and the things
that merely *delight* come last.

### Phase 0 — Correctness and trust (before anything else)

> **Status: complete.** Error boundary, privacy notice with consent, sign-in
> throttling, security headers with a tested CSP, and integer money are all
> implemented and verified. See the Verification log in `AGENTS.md`.

These are small and each one closes a real failure mode.

1. **Add an error boundary** around the route tree, with a recovery action rather
   than a blank screen. A judge clicking into an edge case should see "something
   went wrong, go back", not white.
   *Acceptance:* forcing a throw in a page renders a contained error, the shell
   survives, and a reload recovers.
2. **Privacy notice at the point of collection.** A short, plain-language notice
   on registration and on the document upload step: what is collected, why, who
   can see it, how long it is kept, and how to request access or correction.
   *Acceptance:* the notice is reachable from every collection point and names the
   data protection contact.
3. **Throttle login.** Mirror the OTP limiter: per-IP and per-account failed
   attempt counters with a short lockout, and the same generic error message
   (already correct).
   *Acceptance:* repeated wrong passwords stop returning 401 and start returning
   429 with a retry window.
4. **Security headers.** A small middleware adding CSP, `X-Frame-Options`,
   `Referrer-Policy`, `X-Content-Type-Options` and HSTS when served over HTTPS,
   plus `Secure` on the session cookie outside development.
   *Acceptance:* headers present on every API response; app still loads with the
   CSP applied (this is where the CSP needs testing, not guessing).
5. **Money as integer centavos.** Change `Grant.amount` to `Int` holding centavos,
   centralise formatting, and migrate the seeded values.
   *Acceptance:* totals in the grant list and reports equal the sum of their rows
   exactly, asserted in a test.

### Phase 1 — Accountability (what a scholarship office actually needs)

6. **Audit log.** Append-only rows for: admin viewing or downloading a student
   document, reviewing an application, confirming a grant, editing or deleting a
   listing, and role changes. Show it to administrators, not students.
   *Why:* a grant decision is an administrative act; "who released this and when"
   is the question an audit asks. It also directly serves DPA accountability.
7. **Data-subject requests.** "Download my records" (profile, applications,
   documents index, grants) and "Request deletion", with the latter routed to an
   administrator rather than silently deleting evidence of a decision.
8. **Retention policy, stated and enforced.** Documents for unsuccessful
   applications should not live forever. Define a period, state it in the notice,
   and provide a maintenance script.

### Phase 2 — Performance and accessibility hardening

9. **Measure INP before optimising it.** Add a lightweight reporter (or use the
   existing browser tooling) on the heaviest routes — directory with 14 cards,
   admin applications, reports — then fix what is actually slow. Likely wins:
   defer the QR library until the dialog opens, split the admin bundle further,
   and avoid re-rendering long lists on filter changes.
10. **WCAG 2.2 AA pass on the new surfaces.** Specifically: 24 px help targets,
    focus not obscured by the sticky sidebar, consistent help (a footer link to
    the FAQ plus the office contact on every page), and redundant entry removed
    from semester registration by pre-filling from the stored profile.
11. **Catch the low-hanging performance fruit**: `font-display: swap` and a
    preloaded font subset, explicit dimensions on every illustration, and
    `content-visibility` on long admin lists.

### Phase 3 — Product depth (only if the above is done)

12. **Saved searches with deadline alerts** — the single most useful thing for a
    student, and the natural sequel to the directory.
13. **Calendar export** for deadlines (`.ics` generation, no dependency needed).
14. **Compare shortlisted listings** side by side on deadlines and requirements.
15. **Offline document queue** in the service worker, for students on unreliable
    mobile data.

---

## 4. What I would do first, and why

If only five things get done before the defense:

1. **Error boundary** — cheapest insurance against the worst demo failure.
2. **Privacy notice** — the gap a panel is most likely to name, and the one that
   is genuinely a legal obligation rather than a nicety.
3. **Login throttling** — five lines of code that close an obvious hole.
4. **Security headers** — visible in a browser's network tab during the demo.
5. **Integer money** — because a report that disagrees with its own rows is the
   kind of detail that undoes an otherwise strong presentation.

Accessibility and INP work is valuable, but it is refinement of something that
already works; the five above are corrections of things that are wrong.

---

## 5. What not to do

The paper's own guidance is right, and it is worth restating because the pressure
at this stage is to add features.

- **No AI chatbot.** It would not answer anything the FAQ does not, and a wrong
  answer about eligibility is worse than no answer.
- **No animated counters or decorative motion.** The illustrations already carry
  the visual identity; more movement would undercut it.
- **No testimonials or statistics.** Both require inventing data, and this system
  has a documented rule against claiming what it cannot derive.
- **No second design language.** The restraint is the design.

---

## 6. Sequencing at a glance

| Phase | Contains | Rough effort | Blocking? |
|---|---|---|---|
| 0 | Error boundary, privacy notice, login throttle, headers, integer money | 1–2 days | Yes — before the defense |
| 1 | Audit log, data-subject requests, retention | 2–3 days | Recommended |
| 2 | INP measurement, WCAG 2.2 AA pass, performance polish | 2–4 days | After Phase 1 |
| 3 | Saved searches, calendar export, comparison, offline queue | 1 week+ | Optional |

The Supabase/PostgreSQL migration belongs inside Phase 2, because it is a
deployment concern rather than a correctness one — with the single exception of
`Grant.amount`, which Phase 0 changes anyway and which the migration should then
carry over rather than redo.
