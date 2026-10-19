import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import { EmptyState, ErrorState, LinkButton, LoadingState, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useSavedScholarships } from '../../hooks/useSavedScholarships.ts'
import { savedApi } from '../../lib/api.ts'
import type { Scholarship } from '../../types/index.ts'

/** The student's shortlist of bookmarked scholarships. */
export function SavedScholarshipsPage() {
  useDocumentTitle('Saved Scholarships')
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { isSaved, toggle } = useSavedScholarships()

  const saved = useAsync(() => savedApi.listForStudent(userId), [userId])

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to view your saved scholarships."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  async function handleToggle(scholarship: Scholarship) {
    await toggle(scholarship)
    saved.reload()
  }

  const items = saved.data ?? []

  return (
    <div className="space-y-10">
      <PageHeader
        title="Saved Scholarships"
        description="Your shortlist of scholarships to come back to. Saving a scholarship does not submit an application."
        actions={
          <LinkButton to="/scholarships" variant="outline">
            Browse Scholarships
          </LinkButton>
        }
      />

      {saved.loading ? (
        <LoadingState label="Loading your shortlist…" />
      ) : saved.error ? (
        <ErrorState message={saved.error} onRetry={saved.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No Saved Scholarships Yet"
          description="Save a scholarship from the directory to build a shortlist you can return to."
          action={<LinkButton to="/scholarships">Browse Scholarships</LinkButton>}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {items.length} saved scholarship{items.length === 1 ? '' : 's'}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
                saved={isSaved(scholarship.id)}
                onToggleSave={handleToggle}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
