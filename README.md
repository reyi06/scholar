# My Website

A React + Vite + Tailwind CSS website starter.

## Stack

| Tool            | Version |
| --------------- | ------- |
| Node.js         | 24.21.0 |
| npm             | 11.19.0 |
| React           | 19.3    |
| Vite            | 8.3     |
| Tailwind CSS    | 4.3     |
| TypeScript      | 6.0     |
| oxlint          | 1.81    |

## Getting started

```bash
npm install    # install dependencies
npm run dev    # start the dev server at http://localhost:5173
```

## Scripts

| Command           | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Dev server with hot module replacement        |
| `npm run build`   | Type-check, then build to `dist/`             |
| `npm run preview` | Serve the production build locally            |
| `npm run lint`    | Lint with oxlint                              |

## How Tailwind is set up

This project uses **Tailwind CSS v4**, which needs no `tailwind.config.js`
and no PostCSS config. The whole setup is:

1. `@tailwindcss/vite` is registered as a Vite plugin in `vite.config.ts`.
2. `src/index.css` starts with `@import 'tailwindcss';`.

Write utility classes directly in your JSX:

```tsx
<h1 className="text-4xl font-bold text-brand-600">Hello</h1>
```

### Customizing the theme

Tailwind v4 reads design tokens from CSS. Add them inside the `@theme` block
in `src/index.css` and they turn into utilities automatically:

```css
@theme {
  --color-brand-500: oklch(0.62 0.2 275); /* -> bg-brand-500, text-brand-500 */
  --font-sans: 'Inter', system-ui, sans-serif; /* -> font-sans */
}
```

### Dark mode

`dark:` variants follow the OS setting by default. To switch to a
class-based toggle instead, add this to `src/index.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Then toggle `document.documentElement.classList.toggle('dark')`.

## Project structure

```
my-website/
├── index.html          # HTML entry point
├── vite.config.ts      # Vite + React + Tailwind plugins
├── tsconfig*.json      # TypeScript config
├── public/             # Static files served as-is
└── src/
    ├── main.tsx        # React entry point
    ├── App.tsx         # Root component
    └── index.css       # Tailwind import + theme tokens
```
