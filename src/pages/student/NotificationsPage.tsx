import type { ReactNode } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from '../../components/ui'
import { useAuth } from '../../context/authContext.ts'
import { useToast } from '../../context/toastContext.ts'
import { useAsync, useAsyncAction } from '../../hooks/useAsync.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { notificationsApi } from '../../lib/api.ts'
import { formatDateTime, formatRelative } from '../../lib/format.ts'

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
        title="You are not signed in"
        description="Sign in to view your notifications."
        action={<LinkButton to="/login">Sign in</LinkButton>}
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

  let body: ReactNode
  if (state.loading) {
    body = <LoadingState label="Loading your notifications…" />
  } else if (state.error) {
    body = <ErrorState message={state.error} onRetry={state.reload} />
  } else if (notifications.length === 0) {
    body = (
      <EmptyState
        title="No notifications yet"
        description="Updates about your applications, registrations and grants appear here when you sign in."
        action={<LinkButton to="/student/dashboard">Back to dashboard</LinkButton>}
      />
    )
  } else {
    body = (
      <ul className="space-y-3">
        {notifications.map((notification) => (
          <li key={notification.id}>
            <Card className={notification.read ? '' : 'border-brand-300 dark:border-brand-700'}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </h2>
                    {notification.read ? null : (
                      <Badge tone="brand" dot>
                        Unread
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{notification.body}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(notification.createdAt)} · {formatRelative(notification.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {notification.link ? (
                    <LinkButton to={notification.link} variant="outline" size="sm">
                      Open
                    </LinkButton>
                  ) : null}
                  {notification.read ? null : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleMarkRead(notification.id)}
                      loading={markOne.loading}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6">
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
      <Alert tone="info" title="In-app notifications only">
        GrantConnect does not send email or SMS. Notifications appear here inside the app, and they are
        not a substitute for official correspondence from a scholarship provider.
      </Alert>
      {markAll.error || markOne.error ? (
        <Alert tone="danger">{markAll.error ?? markOne.error}</Alert>
      ) : null}
      {body}
    </div>
  )
}
