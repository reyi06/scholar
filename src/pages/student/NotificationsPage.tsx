import { Link } from 'react-router'
import {
  Alert,
  Button,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingList,
  PageHeader,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { notificationsApi } from '../../lib/api.ts'
import { formatRelative } from '../../lib/format.ts'

/**
 * The student's notifications.
 *
 * A single chronological list. Unread rows carry a small maroon dot and open
 * their related record when one is linked; "Mark all as read" is the one
 * page-level action.
 */
export function NotificationsPage() {
  useDocumentTitle('Notifications')
  const { user } = useAuth()
  const toast = useToast()
  const userId = user?.id ?? ''

  const state = useAsync(() => notificationsApi.listForUser(userId), [userId])
  const markAll = useAsyncAction(() => notificationsApi.markAllRead(userId))
  const markOne = useAsyncAction((notificationId: string) =>
    notificationsApi.markRead(notificationId),
  )

  if (!user) {
    return (
      <EmptyState
        title="You Are Not Signed In"
        description="Sign in to view your notifications."
        action={<LinkButton to="/login">Sign In</LinkButton>}
      />
    )
  }

  const notifications = state.data ?? []
  const unreadCount = notifications.filter((notification) => !notification.read).length

  async function handleMarkAll() {
    const result = await markAll.run()
    if (result !== null) {
      toast.success('All notifications marked as read')
      state.reload()
    }
  }

  async function handleMarkRead(notificationId: string) {
    const result = await markOne.run(notificationId)
    if (result !== null) {
      state.reload()
    }
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up.'}
        actions={
          <Button
            variant="outline"
            onClick={() => void handleMarkAll()}
            loading={markAll.loading}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        }
      />

      {markAll.error || markOne.error ? (
        <Alert tone="danger">{markAll.error ?? markOne.error}</Alert>
      ) : null}

      {state.loading ? (
        <LoadingList />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No Notifications Yet"
          description="Updates about your applications, registrations and grants appear here."
          action={<LinkButton to="/student/dashboard">Back to Dashboard</LinkButton>}
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-ink-800">
          {notifications.map((notification) => {
            const row = (
              <>
                <div className="flex items-center gap-2">
                  {notification.read ? null : (
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-brand-700 dark:bg-brand-400"
                    />
                  )}
                  <p
                    className={`text-sm ${
                      notification.read
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'font-medium text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {notification.title}
                  </p>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatRelative(notification.createdAt)}
                </p>
              </>
            )

            return (
              <li key={notification.id}>
                {notification.link ? (
                  <Link
                    to={notification.link}
                    onClick={() => {
                      if (!notification.read) void handleMarkRead(notification.id)
                    }}
                    className="block rounded px-1 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-ink-800/60"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="px-1 py-4">{row}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
