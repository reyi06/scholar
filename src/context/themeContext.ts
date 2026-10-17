import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  isDark: boolean
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const THEME_STORAGE_KEY = 'pgc-theme'

export const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Read or change the colour theme.
 *
 * The chosen theme is applied as a `.dark` class on `<html>`, so `dark:`
 * variants respond to the user's choice rather than the OS setting. An inline
 * script in `index.html` applies the same class before first paint, which
 * avoids a flash of the wrong theme.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside a <ThemeProvider>.')
  }
  return context
}
