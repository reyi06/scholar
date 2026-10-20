import type { ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from '../context/AuthProvider.tsx'
import { ThemeProvider } from '../context/ThemeProvider.tsx'
import { ToastProvider } from '../context/ToastProvider.tsx'

/**
 * Application-wide providers, in one place.
 *
 * The order is deliberate: the theme is applied before anything renders (so no
 * flash of the wrong palette), the router supplies navigation to everything
 * below it, the session is resolved before any page asks who is signed in, and
 * toasts sit innermost so any page can raise one.
 *
 * Kept separate from `main.tsx` so the entry point stays a mount call and the
 * composition can be reused — for example by a test harness that wants the same
 * providers without a browser entry point.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
