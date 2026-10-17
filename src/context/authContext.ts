import { createContext, useContext } from 'react'
import type { LoginInput, RegisterInput, User } from '../types/index.ts'

export interface AuthContextValue {
  /** The signed-in user, or null when signed out. */
  user: User | null
  /** True while the initial session read is in flight. */
  initialising: boolean
  isAuthenticated: boolean
  isStudent: boolean
  isAdmin: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => Promise<void>
  /** Re-read the user after a profile edit. */
  refresh: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Access the current session.
 *
 * These role checks drive navigation and UI only. They are NOT security: the
 * whole application runs in the browser, so anything gated here can be
 * bypassed. A real deployment must enforce authorisation on the server
 * (see the README "Security" section).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>.')
  }
  return context
}
