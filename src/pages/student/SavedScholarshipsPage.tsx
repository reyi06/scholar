import type { ReactNode } from 'react'
import { ScholarshipCard } from '../../components/ScholarshipCard.tsx'
import { EmptyState, ErrorState, LinkButton, LoadingState, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { useSavedScholarships } from '../../hooks/useSavedScholarships.ts'
import { savedApi } from '../../lib/api.ts'
import type { Scholarship } from '../../types/index.ts'

export function SavedScholarshipsPage() {
  useDocumentTitle('Saved scholarships')
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const { isSaved, toggle } = useSavedScholarships()

  const saved = useAsync(() => savedApi.listForStudent(userId), [userId])

  if (!user) {
    return (
      <EmptyState
        title="You are not signed in"
        description="Sign in with a student account to view your saved scholarships."
        action={<LinkButton to="/login">Sign in</LinkButton>}
      />
    )
  }

  async function handleToggle(scholarship: Scholarship) {
    await toggle(scholarship)
    saved.reload()
  }

  const items = saved.data ?? []

  let body: ReactNode
  if (saved.loading) {
    body = <LoadingState label="Loading your shortlist…" />
  } else if (saved.error) {
    body = <ErrorState message={saved.error} onRetry={saved.reload} />
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="No saved scholarships yet"
        description="Save a scholarship with the ☆ button in the directory to build a shortlist you can return to. Saving a scholarship does not submit an application."
        action={<LinkButton to="/scholarships">Browse scholarships</LinkButton>}
      />
    )
  } else {
    body = (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((scholarship) => (
          <ScholarshipCard
            key={scholarship.id}
            scholarship={scholarship}
            saved={isSaved(scholarship.id)}
            onToggleSave={handleToggle}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saved scholarships"
        description={
          items.length > 0
            ? `${items.length} scholarship${items.length === 1 ? '' : 's'} on your shortlist.`
            : 'Your shortlist of scholarships to come back to.'
        }
        actions={
          <LinkButton to="/scholarships" variant="outline">
            Browse scholarships
          </LinkButton>
        }
      />
      {body}
    </div>
  )
}
