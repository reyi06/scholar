import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { savedApi } from '../lib/api.ts'
import { useAuth } from '../context/authContext.ts'
import { useToast } from '../context/toastContext.ts'
import type { Scholarship } from '../types/index.ts'

/**
 * Bookmark handling shared by the directory, the scholarship detail page, the
 * saved list and the student dashboard.
 *
 * Signed-out visitors are sent to the login screen instead of being shown a
 * control that silently does nothing. Only students can bookmark: the concept
 * does not apply to administrator accounts.
 */
export function useSavedScholarships() {
  const { user, isStudent } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [loaded, setLoaded] = useState<string[]>([])
  const active = Boolean(user) && isStudent

  useEffect(() => {
    if (!user || !isStudent) return undefined
    let cancelled = false
    savedApi
      .ids(user.id)
      .then((result) => {
        if (!cancelled) setLoaded(result)
      })
      .catch(() => {
        // A failed load simply means no bookmarks are shown for now.
      })
    return () => {
      cancelled = true
    }
  }, [user, isStudent])

  // Derived during render: a signed-out or non-student session has no bookmarks.
  // Memoised so the callbacks below keep a stable dependency.
  const savedIds = useMemo(() => (active ? loaded : []), [active, loaded])

  const isSaved = useCallback(
    (scholarshipId: string) => savedIds.includes(scholarshipId),
    [savedIds],
  )

  const toggle = useCallback(
    async (scholarship: Scholarship) => {
      if (!user) {
        toast.info('Sign in to save scholarships', 'Create a student account or sign in to keep a shortlist.')
        navigate('/login')
        return
      }
      if (!isStudent) {
        toast.warning('Not available for this account', 'Bookmarks are a student feature.')
        return
      }
      try {
        const nowSaved = await savedApi.toggle(user.id, scholarship.id)
        setLoaded((current) =>
          nowSaved ? [...current, scholarship.id] : current.filter((id) => id !== scholarship.id),
        )
        toast.success(
          nowSaved ? 'Saved to your shortlist' : 'Removed from your shortlist',
          nowSaved ? scholarship.name : undefined,
        )
      } catch (cause: unknown) {
        toast.error(
          'Could not update your shortlist',
          cause instanceof Error ? cause.message : 'Please try again.',
        )
      }
    },
    [user, isStudent, navigate, toast],
  )

  return { savedIds, isSaved, toggle }
}
