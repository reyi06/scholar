import { StatusBadge } from '../../components/StatusBadge.tsx'
import {
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { grantsApi, scholarshipsApi } from '../../lib/api.ts'
import { formatCurrency, formatDate } from '../../lib/format.ts'

/**
 * Confirmed grant records.
 *
 * The total released leads as a single line rather than a tile, followed by the
 * records themselves. A grant only exists after an administrator confirms it,
 * which the page states once, briefly.
 */
export function MyGrantsPage() {
  useDocumentTitle('My Grants')
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const state = useAsync(async () => {
    if (!userId) return { grants: [], names: new Map<string, string>() }
    const [grants, scholarships] = await Promise.all([
      grantsApi.listForStudent(userId),
      scholarshipsApi.listAll(),
    ])
    return {
      grants,
      names: new Map(scholarships.map((scholarship) => [scholarship.id, scholarship.name])),
    }
  }, [userId])

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in with a student account to view your grants."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const grants = state.data?.grants ?? []
  const names = state.data?.names ?? new Map<string, string>()
  const totalReleased = grants.reduce((sum, grant) => sum + grant.amount, 0)

  return (
    <div className="space-y-10">
      <PageHeader
        title="My Grants"
        description="Confirmed grant records and the amounts released to you."
      />

      {state.loading ? (
        <LoadingState label="Loading your grants…" />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Total released{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(totalReleased)}
              </span>
              {grants.length > 0
                ? ` across ${grants.length} confirmed ${grants.length === 1 ? 'grant' : 'grants'}`
                : ''}
              .
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A grant record appears here only after an administrator confirms it.
            </p>
          </div>

          {grants.length === 0 ? (
            <EmptyState
              title="No Confirmed Grants Yet"
              description="An approved application on its own is not a grant. Once an administrator confirms a grant record, it will appear here."
              action={<LinkButton to="/student/applications">View My Applications</LinkButton>}
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Reference</TH>
                  <TH>Scholarship</TH>
                  <TH>Term</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                  <TH>Released</TH>
                </TR>
              </THead>
              <TBody>
                {grants.map((grant) => (
                  <TR key={grant.id}>
                    <TD className="font-medium text-slate-900 dark:text-slate-100">{grant.referenceNo}</TD>
                    <TD>{names.get(grant.scholarshipId) ?? 'Listing unavailable'}</TD>
                    <TD>
                      {grant.academicYear} · {grant.semester}
                    </TD>
                    <TD className="text-right tabular-nums">{formatCurrency(grant.amount)}</TD>
                    <TD>
                      <StatusBadge kind="grant" status={grant.status} />
                    </TD>
                    <TD>{formatDate(grant.releasedAt)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}
