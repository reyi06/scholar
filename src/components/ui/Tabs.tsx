export interface TabItem<T extends string> {
  id: T
  label: string
  /** Optional count shown as a pill beside the label. */
  count?: number
}

export interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
  label?: string
}

/**
 * Accessible tab strip. Implemented with buttons + `aria-pressed` rather than
 * full ARIA tabpanel semantics, because the panels live in separate routes
 * rather than inside this component.
 */
export function Tabs<T extends string>({ tabs, active, onChange, className = '', label = 'Views' }: TabsProps<T>) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-ink-800 ${className}`}
      role="group"
      aria-label={label}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
