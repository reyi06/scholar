import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { USING_REMOTE_API, authApi } from '../lib/api.ts'
import type { LoginInput, RegisterInput, User } from '../types/index.ts'
import { AuthContext, type AuthContextValue } from './authContext.ts'

/**
 * Holds the current session.
 *
 * Two modes, matching the data layer:
 *  - **Browser storage** resolves synchronously, so the first render already
 *    knows who is signed in.
 *  - **HTTP** keeps the session in an httpOnly cookie that JavaScript cannot
 *    read. It can only be resolved by asking the server, so `initialising` is
 *    true until that round trip finishes. Route guards must wait for it, or a
 *    signed-in user would be bounced to the login screen on every refresh.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authApi.getCurrentUserSync())
  const [initialising, setInitialising] = useState(USING_REMOTE_API)

  useEffect(() => {
    if (!USING_REMOTE_API) return undefined
    let cancelled = false

    authApi
      .getSession()
      .then((found) => {
        if (!cancelled) setUser(found)
      })
      .catch(() => {
        // An unreachable server is not a signed-in user. Treat it as signed out
        // and let the page's own error states explain the rest.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setInitialising(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

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
      initialising,
      isAuthenticated: user !== null,
      isStudent: user?.role === 'student',
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refresh,
    }),
    [user, initialising, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
