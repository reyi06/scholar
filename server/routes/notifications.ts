/**
 * notifications — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireUser } from '../http/auth.ts'
import { send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { toNotification } from '../mappers.ts'

/* ================================================================== */
/* Notifications                                                       */
/* ================================================================== */

route('GET', '/api/notifications', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const rows = await prisma.notification.findMany({
    where: { OR: [{ userId: signedIn.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  send(res, 200, rows.map(toNotification))
})

route('GET', '/api/notifications/unread-count', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const count = await prisma.notification.count({
    where: { OR: [{ userId: signedIn.id }, { userId: null }], read: false },
  })
  send(res, 200, count)
})

route('POST', '/api/notifications/read-all', async ({ res, user }) => {
  const signedIn = requireUser(user)
  await prisma.notification.updateMany({
    where: { OR: [{ userId: signedIn.id }, { userId: null }] },
    data: { read: true },
  })
  send(res, 200, { ok: true })
})

route('POST', '/api/notifications/:id/read', async ({ res, params, user }) => {
  requireUser(user)
  await prisma.notification.update({ where: { id: params.id }, data: { read: true } }).catch(() => undefined)
  send(res, 200, { ok: true })
})
