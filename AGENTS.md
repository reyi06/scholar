# Scholar

A web-based scholarship information and student grant management system for the
province of Pampanga, Philippines. React + Vite + TypeScript + Tailwind on the front,
a dependency-free Node API and PostgreSQL behind it.

## Architecture that matters

The browser **never** touches the database. All data access goes through
`src/lib/api.ts`, which:

- talks HTTP to `server/` when `VITE_API_BASE_URL` is set, and
- falls back to browser storage when it is not.

Keep both modes working. Adding a fetch that bypasses `api.ts`, or a Prisma call that
leaks into the client bundle, breaks the security boundary documented in
`docs/security/SECURITY-REVIEW.md`.

## Commands

```bash
npm run dev                # vite dev server
npm run build              # tsc -b && vite build && prerender (needs .env for the last step)
npm run lint               # oxlint
npm run test               # vitest run  (11 existing test files)
npm run test:watch         # vitest
npm run db:migrate         # prisma migrate dev
npm run db:seed            # seed
npm run db:reset           # drop + recreate + seed
npm run prerender          # regenerate static pages
npm run check:responsive   # screenshot-driven responsive check
```

Run lint, tests and build before declaring any task done. `npm run build` runs the
prerender step, which needs `.env` — if it fails for a missing env var, say so rather
than deleting the step.

## UI components — do not add shadcn

`src/components/ui/` holds **29 hand-rolled components** (`Button`, `Card`, `Dialog`,
`Accordion`, `Alert`, `Checkbox`, `ConfirmDialog`, …) with shared styles in
`buttonStyles.ts` and `formStyles.ts`. This is a deliberate in-house design system.

Do not install shadcn/ui, Radix or another component library here, and do not add a
second Button or Card beside the existing ones. Extend what is there.

## Layout

- `src/pages/` — screens
- `src/components/` — shared UI; `ui/` for the primitives above
- `src/context/` — React context providers
- `src/hooks/` — hooks
- `src/lib/api.ts` — the only data-access entry point
- `src/data/` — static seed content
- `src/types/` — shared types
- `server/` — Node API, no framework
- `prisma/` — schema and migrations
- `scripts/` — build, prerender, responsive check, db reset
- `tests/` — vitest suites

## Rules

- Never commit `.env`, `uploads/` contents or generated `tmp/` screenshots.
- Scholarship listings currently shipped are **placeholder records**. Do not present
  them as real data, and do not remove the README warning about it.
- Query scoping and authorisation belong in `server/` and the Prisma layer, never in
  the React component.
- Keep the API dependency-free unless asked otherwise — it is a stated constraint, not
  an oversight.
