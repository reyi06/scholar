import { Badge } from './ui/index.ts'
import type { BadgeTone } from './ui/index.ts'

/**
 * The application lifecycle, drawn from HTML and CSS rather than SVG text:
 * labels stay selectable, readable on a phone, and available to assistive
 * technology.
 */

interface Stage {
  label: string
  body: string
  tone: BadgeTone
  /** Draw emphasis on the step where money actually moves. */
  decisive?: boolean
}

const STAGES: Stage[] = [
  {
    label: 'Submitted',
    tone: 'info',
    body: 'The application is recorded and given a reference number. From here on you can follow it.',
  },
  {
    label: 'Under Review',
    tone: 'brand',
    body: 'An administrator reads it and checks the requirements against the listing.',
  },
  {
    label: 'Needs Information',
    tone: 'warning',
    body: 'Something is missing. A note says what, and it appears as your next step until it is resolved.',
  },
  {
    label: 'Approved',
    tone: 'success',
    body: 'The review passed. This is a decision about the application, not a payment.',
  },
  {
    label: 'Declined',
    tone: 'danger',
    body: 'With the reason recorded on the timeline, so you know what to change next time.',
  },
  {
    label: 'Grant Record Confirmed',
    tone: 'gold',
    decisive: true,
    body: 'The provider releases the grant. The office records the amount and term here, and the grant then appears under My grants. This platform keeps the record; it does not pay out.',
  },
]

export function LifecycleDiagram() {
  return (
    <ol className="relative space-y-5 border-l border-slate-200 pl-7 dark:border-ink-800">
      {STAGES.map((stage) => (
        <li key={stage.label} className="relative">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[2.19rem] size-2.5 rounded-full ring-4 ring-canvas dark:ring-ink-950 ${
              stage.decisive ? 'bg-gold-500' : 'bg-slate-300 dark:bg-ink-600'
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{stage.label}</h3>
            <Badge tone={stage.tone}>{stage.decisive ? 'Recorded grant' : 'Review stage'}</Badge>
          </div>
          <p className="mt-1 max-w-[62ch] text-sm text-slate-600 dark:text-slate-300">{stage.body}</p>
        </li>
      ))}
    </ol>
  )
}
