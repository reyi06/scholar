import { useTheme } from '../context/themeContext.ts'
import { Icon } from './ui/index.ts'

/**
 * Light/dark switch. The label describes the action rather than the state, so
 * it reads correctly in a screen reader either way.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`flex size-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-white ${className}`}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="size-4" />
    </button>
  )
}
