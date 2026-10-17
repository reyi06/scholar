import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../lib/api.ts'
import type { LoginInput, RegisterInput, User } from '../types/index.ts'
import { AuthContext, type AuthContextValue } from './authContext.ts'

/**
 * Holds the demo session in React state, seeded synchronously from the data
 * layer so the first render already knows whether a user is signed in.
 *
 * DEMO MODE: the session is a localStorage flag, not a token, and the
 * credentials live in the browser. See `src/lib/api.ts` for the full caveat.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authApi.getCurrentUserSync())

  const refresh = useCallback(() => {
    setUser(authApi.getCurrentUserSync())
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const signedIn = await authApi.login(input)
    setUser(signedIn)
    return signedIn
  }, [])

  const register = useCallback(async (input: RegisterInput) => {
    const created = await authApi.register(input)
    setUser(created)
    return created
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initialising: false,
      isAuthenticated: user !== null,
      isStudent: user?.role === 'student',
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }),
    [user, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
