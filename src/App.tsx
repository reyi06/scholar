import { useState } from 'react'

const stack = [
  { name: 'React 19', href: 'https://react.dev' },
  { name: 'Vite 8', href: 'https://vite.dev' },
  { name: 'Tailwind CSS 4', href: 'https://tailwindcss.com' },
  { name: 'TypeScript 6', href: 'https://www.typescriptlang.org' },
]

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-widest text-brand-600 uppercase dark:text-brand-300">
          Build tools ready
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
          My Website
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-400">
          Edit <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm dark:bg-slate-800">src/App.tsx</code> and
          save to test hot module replacement.
        </p>
      </div>

      <ul className="flex flex-wrap justify-center gap-2">
        {stack.map((item) => (
          <li key={item.name}>
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-700 dark:hover:text-brand-300"
            >
              {item.name}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setCount((value) => value + 1)}
        className="rounded-lg bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        Count is {count}
      </button>
    </main>
  )
}
