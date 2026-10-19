import { useNavigate } from 'react-router'
import { notificationsApi } from '../../lib/api.ts'
import { formatRelative } from '../../lib/format.ts'
import { useAuth } from '../../context/authContext.ts'
import { useAsync } from '../../hooks/useAsync.ts'
import { Badge, Icon } from '../ui/index.ts'
import { Dropdown } from './Dropdown.tsx'
import type { Notification } from '../../types/index.ts'

/**
 * Header bell with an unread count and a recent-notifications panel.
 *
 * Notifications are produced by the demo data layer in response to actions
 * such as an application changing status. No email is sent — the panel states
 * that plainly instead of implying otherwise (business rule 10).
 */
export function NotificationBell({ notificationsPath }: { notificationsPath?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: unread, reload: reloadCount } = useAsync(
    () => (user ? notificationsApi.unreadCount(user.id) : Promise.resolve(0)),
    [user?.id],
  )

  const { data: list, reload: reloadList } = useAsync(
    () => (user ? notificationsApi.listForUser(user.id) : Promise.resolve([])),
    [user?.id],
  )

  if (!user) return null

  const recent: Notification[] = (list ?? []).slice(0, 5)

  const refresh = () => {
    reloadCount()
    reloadList()
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead(user.id)
    refresh()
  }

  const openNotification = async (notification: Notification) => {
    await notificationsApi.markRead(notification.id)
    refresh()
    if (notification.link) navigate(notification.link)
    else if (notificationsPath) navigate(notificationsPath)
  }

  const unreadCount = unread ?? 0
  const hasUnread = unreadCount > 0
  // Shown in the badge, and reused in the accessible name so the two agree.
  const unreadDisplay = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <Dropdown
      label={hasUnread ? `Notifications, ${unreadDisplay} unread` : 'Notifications'}
      align="right"
      trigger={
        <span className="relative flex size-10 items-center justify-center text-slate-600 dark:text-slate-300">
          <Icon name="bell" className="size-5" />
          {hasUnread ? (
            <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
              {unreadDisplay}
            </span>
          ) : null}
        </span>
      }
      header={
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
          {hasUnread ? <Badge tone="danger">{unread} new</Badge> : <Badge tone="neutral">All read</Badge>}
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasUnread}
            className="text-left text-xs font-medium text-brand-700 transition hover:text-brand-800 disabled:text-slate-400 dark:text-brand-300"
          >
            Mark all as read
          </button>
          {notificationsPath ? (
            <button
              type="button"
              onClick={() => navigate(notificationsPath)}
              className="text-left text-xs font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300"
            >
              View all notifications
            </button>
          ) : null}
        </div>
      }
    >
      {recent.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          You have no notifications yet.
        </p>
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-ink-800">
          {recent.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => openNotification(notification)}
                className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-ink-800 ${
                  notification.read ? '' : 'bg-brand-50/60 dark:bg-brand-950/30'
                }`}
              >
                <span className="flex items-center gap-2">
                  {notification.read ? null : (
                    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-brand-700" />
                  )}
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {notification.title}
                  </span>
                </span>
                <span className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {notification.body}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatRelative(notification.createdAt)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  )
}
