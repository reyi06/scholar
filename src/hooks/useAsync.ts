import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** Re-run the effect, e.g. from a "Try again" button. */
  reload: () => void
}

export interface UseAsyncOptions<T> {
  /**
   * Called each time a load resolves, before the result reaches state.
   *
   * Use this to seed local form state from loaded data. Doing it here (rather
   * than in a separate `useEffect` that watches `data`) avoids an extra render
   * pass and keeps the synchronisation in one place.
   */
  onSuccess?: (data: T) => void
}

/**
 * Run an async data-access call and track loading / error / data.
 *
 * Every page uses this so that loading, empty and error states are handled the
 * same way everywhere. `deps` behaves like a `useEffect` dependency list.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: UseAsyncOptions<T> = {},
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // Keep the latest loader and options without making them dependencies, so
  // callers can pass inline arrows and objects without causing a reload loop.
  const loaderRef = useRef(loader)
  const optionsRef = useRef(options)
  useEffect(() => {
    loaderRef.current = loader
    optionsRef.current = options
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loaderRef
      .current()
      .then((result) => {
        if (cancelled) return
        optionsRef.current.onSuccess?.(result)
        setData(result)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'Something went wrong while loading data.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => {
    setNonce((value) => value + 1)
  }, [])

  return { data, loading, error, reload }
}

/**
 * Imperative async action helper for form submissions.
 * Returns `run`, plus `loading` and `error` state for the button and alert.
 */
export function useAsyncAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (...args: Args): Promise<Result | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await action(...args)
        return result
      } catch (cause: unknown) {
        setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
        return null
      } finally {
        setLoading(false)
      }
    },
    [action],
  )

  return { run, loading, error, setError }
}
