# AGENTS.md

Guidance for AI agents (and humans) working in this repository.
Keep the **Change log** and **Verification log** sections at the bottom up to
date as you work — they are the running record of what has been done here.

---

## 1. What this is

A starter website built with **React + Vite + Tailwind CSS + TypeScript**.
It was scaffolded from the official Vite `react-ts` template and then cleaned
up: the Vite demo page was replaced with a minimal Tailwind-styled landing
page so the toolchain can be verified end to end.

The project is currently a blank canvas — there is no routing, no data layer,
no component library, and no styling system beyond Tailwind's defaults.
Do not assume any of those exist.

---

## 2. Quick start

```bash
npm install        # install dependencies
npm run dev        # dev server -> http://localhost:5173
npm run build      # type-check (tsc -b) then build to dist/
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

There is **no test runner configured**. If tests are needed, one must be added.

---

## 3. Stack

Versions below are the *resolved/installed* versions, captured 2026-10-17.

| Tool                     | package.json range | Installed |
| ------------------------ | ------------------ | --------- |
| Node.js                  | —                  | 24.21.0   |
| npm                      | —                  | 11.19.0   |
| react                    | `^19.2.8`          | 19.3.1    |
| react-dom                | `^19.2.8`          | 19.3.1    |
| vite                     | `^8.3.0`           | 8.3.4     |
| @vitejs/plugin-react     | `^6.1.1`           | 6.1.2     |
| tailwindcss              | `^4.3.3`           | 4.3.3     |
| @tailwindcss/vite        | `^4.3.3`           | 4.3.3     |
| typescript               | `~6.0.2`           | 6.0.3     |
| oxlint                   | `^1.81.0`          | 1.88.0    |
| @types/node              | `^24.13.3`         | 24.19.2   |
| @types/react             | `^19.2.18`         | 19.3.0    |
| @types/react-dom         | `^19.2.7`          | 19.3.0    |

Package manager: **npm** (a `package-lock.json` is committed — do not switch
package managers without regenerating it deliberately).

Note the template ships **oxlint**, not ESLint, and there is no Prettier or
`.editorconfig`. Match the existing formatting (2-space indent, single quotes,
no semicolons) which is what the scaffold and all current source files use.

---

## 4. Directory structure

```
my-website/
├── index.html              # Vite HTML entry; contains <div id="root">
├── package.json            # scripts + dependency ranges
├── package-lock.json       # npm lockfile (committed)
├── vite.config.ts          # Vite plugins: react(), tailwindcss()
├── tsconfig.json           # solution file -> references the two below
├── tsconfig.app.json       # app code (src/**) compiler options
├── tsconfig.node.json      # build tooling (vite.config.ts) options
├── .oxlintrc.json          # oxlint config
├── .gitignore              # ignores node_modules, dist, *.local, editor dirs
├── .gitattributes          # forces LF line endings in the repo
├── README.md               # human-facing setup docs
├── AGENTS.md               # this file
├── public/
│   └── favicon.svg         # served at /favicon.svg (referenced by index.html)
└── src/
    ├── main.tsx            # React entry; mounts <App /> into #root
    ├── App.tsx             # root component (default export)
    └── index.css           # Tailwind import + @theme design tokens
```

Deleted on 2026-10-17 (were Vite demo-only, unreferenced):
`src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`,
`src/assets/vite.svg`, `public/icons.svg`, and the now-empty `src/assets/`.

Add new source files under `src/`. Anything served verbatim (images, fonts,
robots.txt) goes in `public/`.

---

## 5. Conventions

### Components
- One component per file, **named after the file** (`Hero.tsx` -> `Hero`).
- `App.tsx` uses a **default export** because `src/main.tsx` imports it as
  `import App from './App.tsx'`. Keep that contract if you touch either file.
- Prefer function components and React hooks. No class components.
- Co-locate a component's test/stylesheet next to it if the project later
  gains those; there is no established `components/` folder yet.

### TypeScript
`tsconfig.app.json` is strict in ways that will bite you:
- `noUnusedLocals` and `noUnusedParameters` — unused variables **fail the
  build**, not just warn.
- `verbatimModuleSyntax` — type-only imports **must** use `import type`.
- `erasableSyntaxOnly` — no enums or parameter properties; use plain
  objects/const objects instead.
- `allowImportingTsExtensions` — the scaffold imports with explicit `.tsx`
  extensions (e.g. `./App.tsx`). Follow that style.

### Linting
`npm run lint` runs oxlint with the `react`, `typescript`, and `oxc` plugins.
Notable rules: `react/rules-of-hooks` is an error;
`react/only-export-components` is a warning with `allowConstantExport` — so
exporting a constant alongside a component is fine, but exporting arbitrary
non-component helpers from a component file is not. Keep lint at zero
warnings when you finish a task.

### Tailwind CSS v4 — important
This is **Tailwind v4, not v3**. Consequences:
- There is **no `tailwind.config.js` and no PostCSS config**, and you should
  not add one. The plugin does the work.
- Config lives in CSS. Design tokens go in the `@theme { }` block in
  `src/index.css`; each token automatically generates matching utilities.
- `src/index.css` starts with `@import 'tailwindcss';`. Keep that the first
  line.
- Custom utilities/prose belong in `src/index.css`, not scattered per-file
  CSS. `App.css` was deleted deliberately — prefer utilities in JSX.
- Opacity/colour tokens in the current theme use `oklch()`.
- Do not copy v3 examples from the internet (`@tailwind base;`,
  `content: [...]`, `theme.extend`, `npx tailwindcss init`). They do not apply.

Current custom tokens (`src/index.css`): `--font-sans` and a `brand` colour
scale (`--color-brand-50/100/300/500/600/700`), so classes like
`bg-brand-600`, `text-brand-300`, `border-brand-500` exist.

### Dark mode
`dark:` variants follow the **OS/`prefers-color-scheme` setting** by default.
There is no theme toggle and no `.dark` class. To make it a manual,
class-based toggle, add to `src/index.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

…then toggle the class on `document.documentElement`. Doing this **disables**
the automatic OS-based behaviour, so it is a deliberate behaviour change, not
a pure addition.

---

## 6. Machine / environment notes

- Node lives in a managed toolchain dir, not a global install:
  `C:\Users\reyes\toolchains\node\node-v24.21.0-win-x64\`.
  `npm` resolves via `npm.ps1`, so `Start-Process npm` fails on Windows —
  invoke npm through the shell or use `npm.cmd`.
- **pnpm, yarn, and bun are not installed.** `corepack` is available
  (`0.36.0`) if a different package manager is genuinely required. This
  project is set up for npm.
- `git` 2.55.0 is installed. There is **no global `user.name`/`user.email`**,
  so this repo carries its own identity:
  `user.name=reyestimothy252`, `user.email=reyestimothy252@gmail.com`
  (repo-local only). A new clone or repo will need the same treatment.
- Working directory for all commands in this project:
  `C:\Users\reyes\Desktop\my-website`.
- Source files use **LF** line endings and `.gitattributes` enforces this
  (`* text=auto eol=lf`). Keep editors configured to write LF; do not commit
  CRLF files.

---

## 7. Verification log

Newest first. Record the command and its observed result.

### 2026-10-17 — git repository initialised
- `git init -b main` with repo-local identity, then the initial commit
  ("Initial commit: React + Vite + Tailwind CSS starter").
- 16 files committed, 2576 insertions. `git status` reports a clean working
  tree on branch `main`.
- Confirmed `node_modules/` and `dist/` are excluded by `.gitignore` — they
  are not in the commit.

### 2026-10-17 — initial toolchain verification (all passing)
- `npm run lint` (oxlint 1.88.0) — clean, no output, no warnings.
- `npm run build` — success. `tsc -b` type-checked clean; Vite 8.3.4 built
  16 modules in 166 ms:
  - `dist/index.html` 0.46 kB
  - `dist/assets/index-*.css` 13.07 kB (gzip 3.46 kB)
  - `dist/assets/index-*.js` 221.15 kB (gzip 69.26 kB)
- Tailwind output inspection on the built CSS confirmed the custom theme and
  dark variant are compiled: `--color-brand-500`, `bg-brand-600`,
  `hover:bg-brand-700`, `prefers-color-scheme`, `min-h-svh`, `@layer` all
  present.
- `npm run dev` — Vite ready in 291 ms on `http://localhost:5173/`.
  - `GET /` -> HTTP 200, correct `<title>My Website</title>` and
    `<div id="root">`.
  - `GET /src/App.tsx` -> HTTP 200 (8.9 kB transformed module), proving the
    React + Tailwind dev pipeline transforms source correctly.

### 2026-10-17 — dependency install
- `npm install` then `npm install -D tailwindcss @tailwindcss/vite`:
  45 packages audited, **0 vulnerabilities**, 27 direct+transitive on the
  initial scaffold install.

---

## 8. Change log

Newest first. One entry per meaningful change.

### 2026-10-17 — project scaffolded and Tailwind wired up
- Scaffolded with `npm create vite@latest my-website -- --template react-ts`
  into `C:\Users\reyes\Desktop\my-website`.
- Installed dependencies with npm.
- Added `tailwindcss@4.3.3` and `@tailwindcss/vite@4.3.3` as devDependencies.
- `vite.config.ts`: registered `tailwindcss()` alongside `react()`.
- `src/index.css`: replaced the Vite demo stylesheet with
  `@import 'tailwindcss';`, a `@theme` block (Inter `--font-sans`, `brand`
  colour scale in oklch), and a base layer setting page background/text
  colours with dark-mode variants.
- `src/App.tsx`: replaced the Vite demo component with a small
  Tailwind-styled landing page (heading, stack links, counter button) that
  exercises layout, responsive prefixes, custom `brand` colours, hover,
  focus-visible, and `dark:` variants.
- `index.html`: `<title>` changed from `my-website` to `My Website`.
- `README.md`: rewritten for this project (stack, scripts, Tailwind v4
  explanation, theme/dark-mode instructions, structure).
- Removed Vite demo-only files (see "Directory structure" for the list).
- Added `.gitattributes` (`* text=auto eol=lf`) to stop Windows CRLF churn.
- Initialised the git repository on branch `main` and created the initial
  commit ("Initial commit: React + Vite + Tailwind CSS starter") using a
  repo-local identity.

---

## 9. Open items / next steps

1. Decide on routing (React Router / TanStack Router) if the site will have
   more than one page.
2. Decide on a testing setup (Vitest + React Testing Library is the natural
   fit for Vite) — nothing is installed.
3. Consider adding a Prettier config if formatting should be enforced beyond
   oxlint; the scaffold ships none.
4. Add real content/branding to replace the "My Website" placeholder title,
   `public/favicon.svg`, and the landing page copy.
5. `public/favicon.svg` is still the Vite/Vite-adjacent default icon.
6. Consider adding a remote (`git remote add origin ...`) and pushing — the
   repo currently exists only locally.
7. If the project is shared with other machines, note that the git identity
   is repo-local only and would need setting again elsewhere.
