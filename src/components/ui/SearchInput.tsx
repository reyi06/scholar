import { controlClasses } from './formStyles.ts'

export interface SearchInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
  /** Hides the visible label but keeps it for screen readers. */
  hideLabel?: boolean
}

/**
 * Text search control with a magnifier icon and a clear button.
 * The clear button only appears when there is something to clear.
 */
export function SearchInput({
  id,
  value,
  onChange,
  label = 'Search',
  placeholder = 'Search…',
  className = '',
  hideLabel = false,
}: SearchInputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className={hideLabel ? 'sr-only' : 'text-sm font-medium text-slate-700 dark:text-slate-200'}
      >
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 1 0 3.4 9.83l3.14 3.13a1 1 0 0 0 1.42-1.42l-3.13-3.13A5.5 5.5 0 0 0 9 3.5ZM5.5 9a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <input
          id={id}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={controlClasses(false, 'pl-9 pr-9')}
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute inset-y-0 right-2 flex items-center rounded px-1.5 text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            aria-label={`Clear ${label.toLowerCase()}`}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  )
}
