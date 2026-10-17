import { useState } from 'react'
import { Link } from 'react-router'
import { DEMO_MODE } from '../lib/api.ts'

/**
 * Standing notice that this deployment is a frontend-only demonstration.
 *
 * It exists so the interface never implies that authentication, email,
 * document upload or persistence are real (business rule 10). Dismissing it
 * only hides it for the current page view — it is not remembered, because
 * pretending the disclosure is "off" would be misleading.
 */
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (!DEMO_MODE || dismissed) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/60">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white"
        >
          !
        </span>
        <p className="flex-1 text-xs text-amber-900 sm:text-sm dark:text-amber-100">
          <strong className="font-semibold">Demonstration prototype.</strong> All listings, students and
          grant records are sample data. There is no backend: sign-in, notifications and any data you
          enter are stored only in this browser and are not secure or permanent.{' '}
          <Link to="/about" className="font-medium underline underline-offset-2">
            What works and what does not
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss demonstration notice"
          className="shrink-0 rounded p-1 text-xs text-amber-800 transition hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
