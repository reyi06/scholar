/**
 * announcements — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId } from '../ids.ts'
import { toAnnouncement } from '../mappers.ts'

/* ================================================================== */
/* Announcements                                                       */
/* ================================================================== */

route('GET', '/api/announcements', async ({ res, query, user }) => {
  const audience = query.get('audience')
  const category = query.get('category')
  const where: Record<string, unknown> = {}

  if (audience === 'students') where.audience = { in: ['all', 'students'] }
  else if (audience === 'admins') where.audience = { in: ['all', 'admins'] }
  else if (!user) where.audience = 'all'

  if (category && category !== 'all') where.category = category

  const rows = await prisma.announcement.findMany({
    where: where as never,
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  })

  send(res, 200, rows.map(toAnnouncement))
})

const ANNOUNCEMENT_CATEGORY_VALUES = ['advisory', 'deadline', 'result', 'general']

route('POST', '/api/announcements', async ({ req, res, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const title = String(body.title ?? '').trim()
  const text = String(body.body ?? '').trim()

  if (title.length < 5) throw new HttpError(400, 'Give the announcement a longer title.')
  if (text.length < 10) throw new HttpError(400, 'Give the announcement a longer body.')

  const category = String(body.category ?? 'general')
  if (!ANNOUNCEMENT_CATEGORY_VALUES.includes(category)) {
    throw new HttpError(400, 'Choose a valid announcement category.')
  }

  const created = await prisma.announcement.create({
    data: {
      id: createId('ann'),
      title,
      body: text,
      category,
      audience: String(body.audience ?? 'all'),
      pinned: Boolean(body.pinned),
      publishedAt: new Date(),
      author: `${admin.firstName} ${admin.lastName}`,
    },
  })

  send(res, 201, toAnnouncement(created))
})

route('PATCH', '/api/announcements/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That announcement no longer exists.')

  const title = body.title === undefined ? existing.title : String(body.title).trim()
  const text = body.body === undefined ? existing.body : String(body.body).trim()
  if (title.length < 5) throw new HttpError(400, 'Give the announcement a longer title.')
  if (text.length < 10) throw new HttpError(400, 'Give the announcement a longer body.')

  const category = body.category === undefined ? existing.category : String(body.category)
  if (!ANNOUNCEMENT_CATEGORY_VALUES.includes(category)) {
    throw new HttpError(400, 'Choose a valid announcement category.')
  }

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      title,
      body: text,
      category,
      audience: body.audience ? String(body.audience) : existing.audience,
      pinned: body.pinned === undefined ? existing.pinned : Boolean(body.pinned),
    },
  })

  send(res, 200, toAnnouncement(updated))
})

route('DELETE', '/api/announcements/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That announcement no longer exists.')
  await prisma.announcement.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})
