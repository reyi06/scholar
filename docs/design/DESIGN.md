# Design

The interface is a public-service product, not a marketing site. It should read
as calm, trustworthy and provincial: maroon and gold, white space, plain
language, and no decoration that does not carry information.

---

## 1. Principles

1. **One accent.** Maroon is the action and identity colour. Gold is a marker,
   never a surface or body-text colour.
2. **Flat surfaces.** Borders and spacing group content. A resting shadow is
   reserved for things that actually float.
3. **Text over tiles.** Metrics are labels and numbers, not rows of coloured
   cards.
4. **One primary action per page.** Everything else is outline or ghost.
5. **Progressive disclosure.** Explain behind `(?)`, not in a paragraph above
   the form.
6. **Every word earns its place.** Remove introductory prose, repeated labels
   and cheerleading.
7. **Accessible by default.** Keyboard, focus, contrast and 24 px targets are
   part of the component, not a later pass.

---

## 2. Tokens

Tokens live in `src/styles/index.css` under Tailwind v4's `@theme`. Adding
`--color-x` creates `bg-x`, `text-x` and `border-x`.

| Token | Use |
|---|---|
| `canvas` | Page background; a very slightly warm near-white |
| `brand-50…950` | Maroon ramp; `brand-700` for primary fills and links, `brand-800` for accent text |
| `gold-100…800` | Featured/pinned markers and the masthead rule only; `gold-800` when text sits on light gold |
| `ink-600…950` | Dark-mode surfaces; `950` canvas, `900` surface, `800` border |
| `slate-*` | Light-mode text and borders |
| `shadow-float` | Dialogs and dropdowns only |

Text:

- body: `text-slate-600 dark:text-slate-300`
- headings: `text-slate-900 dark:text-slate-100`
- meta: `text-slate-500 dark:text-slate-400`
- on maroon: white

Do not introduce another hue. Status colours come from `src/lib/tones.ts` and
are the only exception (success, warning, danger, info), used in badges and
alerts.

---

## 3. Typography

- Family: `Inter`, then the system UI stack. No webfont is downloaded, so the
  page makes no third-party font request.
- Scale: page title 24 px (`sm:text-2xl`), section title 16 px, body 14 px,
  meta 12 px.
- Headings and labels: **Title Case**.
- Descriptions, hints, placeholders, validation and loading states: **sentence
  case**.
- Eyebrow labels: uppercase with wide tracking, used sparingly.
- Numerals in tables and money: `tabular-nums`.

---

## 4. Layout, spacing and shape

- Content container: `max-w-6xl` for public pages, `max-w-5xl` for reading.
- Page padding: `px-5 sm:px-8`; vertical rhythm `space-y-10` between major
  sections.
- Surfaces: `rounded-lg border border-slate-200 bg-white dark:border-ink-800
  dark:bg-ink-900`.
- Cards: 20 px padding (`p-5`); tables: 16 px horizontal cell padding.
- Section titles sit above a hairline; `Section` is preferred to `Card` for
  grouping.
- Form controls: 40 px high, 8 px radius, visible label, help text below only
  when it earns the space.
- Touch targets: at least 24 × 24 px (WCAG 2.2), 40 px for primary controls.

---

## 5. Components

`src/components/ui/` is a hand-rolled design system. There is no shadcn, Radix,
Material UI or Bootstrap. Extend these primitives; do not add a second Button or
Card beside them.

**Primitives (26):** Accordion, Alert, Badge, Button, Card, Checkbox,
ConfirmDialog, DefinitionList, Dialog, EmptyState, Field, HelpHint, Icon, Input,
PageHeader, Pagination, SearchInput, Section, Select, Skeleton, Spinner,
StatCard, States, Table, Tabs, Textarea, plus the shared button and form styles.

**Rules:**

- `Button` variants: `primary` (one per page), `outline`, `ghost`, `danger`.
- `Card` only for a genuinely distinct panel or a form; not for every block.
- `Section` for titled groups separated by a hairline.
- `PageHeader` owns the single `h1`, optional breadcrumbs and one primary action.
- `HelpHint` is the `(?)`; long explanations belong there, not in prose.
- `Dialog` traps focus, closes on Escape and restores focus to the trigger.
- `Table` scrolls horizontally with `min-w-[44rem]`; never squeeze columns on a
  phone.
- `Icon` is inline SVG. No icon package.

---

## 6. Page patterns

**Public listing page.** `PageHeader`, filters in one row (search, type,
municipality, level, deadline), result count and sort, then cards in a 1/2-column
grid. The primary action is on the listing detail, not the directory.

**Listing detail.** Main column: title, provider, deadline, description,
benefits, eligibility, requirements, instructions. Side column: amount/term and
the apply/share actions. External listings send the student to the provider's
site and say so.

**Student dashboard.** Next step first, then a compact status band, then recent
updates. No welcome paragraph.

**Admin screens.** Work waiting first (applications, registrations, grants),
then the full table with filters and pagination. Destructive actions use
`ConfirmDialog` and state what will happen.

**Auth screens.** One column, one primary action, no marketing panel. Test
account buttons are demo-only and must be gated before deployment.

---

## 7. States

- **Loading:** page-shaped skeletons, not a centred spinner. `LoadingCards`,
  `LoadingList`, `LoadingTable`, `LoadingDetail`, `LoadingDashboard` and
  `LoadingPage` match the layout that replaces them. Skeleton blocks are
  `aria-hidden`; one `role="status"` announces loading.
- **Empty:** `EmptyState` with a plain reason and, where useful, one action.
- **Error:** `ErrorState` with a retry. Never leave a blank panel.
- **Success:** the page updates; a toast is for an action that leaves the
  screen, not for every save.
- **Disabled:** explain why through nearby text or a `(?)`, not a tooltip that
  only appears on hover.

---

## 8. Forms

- Labels are always visible; placeholders are examples, not labels.
- Required fields are stated once, not marked with a dozen asterisks.
- Validate on submit; do not scold while the user is still typing.
- Put the error next to the field and keep the message specific.
- Preserve entered values after a failed submit.
- Primary submit at the end; secondary "Save draft"/"Cancel" beside it.
- The server re-validates everything; client validation is convenience.

---

## 9. Tables

- Header cells are small, medium-weight and muted.
- Rows are separated by a hairline, not zebra stripes.
- Numeric columns are right-aligned and tabular.
- Status is a `Badge` with a tone, not raw text.
- Row actions are text buttons; destructive actions are confirmed.
- Empty and loading states keep the table's shape.
- On mobile, the table scrolls; do not collapse it into unreadable stacks.

---

## 10. Navigation

- Public: brand, Scholarships, Announcements, FAQs, About, theme toggle, auth.
- Student: dashboard, profile, saved, applications, semester registration,
  grants, documents, notifications.
- Admin: dashboard, scholarships, students, applications, registrations,
  grants, documents, activity, announcements, reports, settings.
- Current page is indicated by weight/colour and `aria-current`, not a new hue.
- Mobile navigation is a disclosure, not a permanent drawer covering content.
- The skip link is the first focusable element.

---

## 11. Dark mode

- Class-based: `.dark` on `<html>`, applied before first paint by an inline
  script and remembered in `localStorage`.
- Surfaces step lighter with elevation: canvas `ink-950`, surface `ink-900`,
  border `ink-800`.
- Never use pure white text; headings are `slate-100`.
- Every `text-slate-*`/`border-slate-*` needs a `dark:` counterpart.
- Charts, badges, focus rings and native controls must be checked in dark mode.
- The palette is charcoal, not near-black, so contrast is comfortable rather
  than harsh.

---

## 12. Accessibility

- WCAG 2.2 AA target.
- One `h1` per page; headings descend in order.
- Keyboard: every action reachable; focus visible; dialog focus trapped and
  restored; Escape closes overlays.
- Targets at least 24 × 24 px; primary controls 40 px.
- Images and icons that carry meaning have a label; decorative icons are
  `aria-hidden`.
- Status changes use `role="status"`, errors use `role="alert"`.
- `prefers-reduced-motion` disables animation and smooth scrolling.
- Do not rely on colour alone for status; use text as well.
- Check both themes and 390/768/1280 widths.

---

## 13. Motion

- Motion explains a change: dialog fade/scale, toast slide, skeleton pulse.
- No entrance animations on page content, no parallax, no bouncing.
- Keep durations short (150–200 ms) and respect reduced motion.
- Loading skeletons pulse; nothing else loops.

---

## 14. Content style

- Title Case for headings, buttons, navigation and field labels.
- Sentence case for descriptions, hints, placeholders, validation and status
  messages.
- Prefer "Sign in", "Create Account", "Save Changes" over "Submit", "Proceed",
  "Click Here".
- Say what happened and what to do next: "That code is not valid or has expired."
- No exclamation marks, no "Welcome to our wonderful...", no fake urgency.
- Use "scholarship", "listing", "provider", "application", "grant" consistently.
- Explain a rule behind `(?)`, not in a permanent paragraph.
- A listing is only as current as its last check. A rolling intake reads
  "Rolling intake"; never invent a date to fill the field.

---

## 15. Review checklist

- [ ] One primary action on the page.
- [ ] `Section` used instead of card walls; no nested cards.
- [ ] No new accent colour, no new icon pack, no component library.
- [ ] Loading, empty and error states present.
- [ ] Keyboard-only pass; focus visible; dialog restores focus.
- [ ] Dark mode checked, not assumed.
- [ ] 390 px and 1280 px checked; no horizontal overflow.
- [ ] Title Case vs sentence case correct.
- [ ] Explanations behind `(?)`, not in prose.
- [ ] Money right-aligned and tabular.
- [ ] Destructive action confirmed and described.
