/**
 * students — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { toProfile, toUser } from '../mappers.ts'

/* ================================================================== */
/* Students (administrator)                                            */
/* ================================================================== */

route('GET', '/api/students', async ({ res, query, user }) => {
  requireRole(user, 'admin')

  const search = (query.get('query') ?? '').trim()
  const municipality = query.get('municipality') ?? 'all'
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(query.get('pageSize') ?? 20)))

  const where: Record<string, unknown> = { role: 'student' }
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ]
  }
  if (municipality !== 'all') where.profile = { municipality }

  const [total, users] = await Promise.all([
    prisma.user.count({ where: where as never }),
    prisma.user.findMany({
      where: where as never,
      include: { profile: true },
      orderBy: { lastName: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const ids = users.map((row) => row.id)
  const [applicationCounts, grantCounts] = await Promise.all([
    prisma.application.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
    prisma.grant.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
  ])
  const appMap = new Map(applicationCounts.map((row) => [row.studentId, row._count._all]))
  const grantMap = new Map(grantCounts.map((row) => [row.studentId, row._count._all]))

  send(res, 200, {
    items: users.map((row) => ({
      user: toUser(row),
      profile: row.profile ? toProfile(row.profile) : null,
      applicationCount: appMap.get(row.id) ?? 0,
      grantCount: grantMap.get(row.id) ?? 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

route('GET', '/api/students/count', async ({ res, user }) => {
  requireRole(user, 'admin')
  send(res, 200, await prisma.user.count({ where: { role: 'student' } }))
})

route('GET', '/api/students/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const row = await prisma.user.findFirst({
    where: { id: params.id, role: 'student' },
    include: { profile: true },
  })
  if (!row) {
    send(res, 200, null)
    return
  }

  const [applicationCount, grantCount] = await Promise.all([
    prisma.application.count({ where: { studentId: row.id } }),
    prisma.grant.count({ where: { studentId: row.id } }),
  ])

  send(res, 200, {
    user: toUser(row),
    profile: row.profile ? toProfile(row.profile) : null,
    applicationCount,
    grantCount,
  })
})

route('PATCH', '/api/students/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.user.findFirst({ where: { id: params.id, role: 'student' } })
  if (!existing) throw new HttpError(404, 'That student record no longer exists.')

  const email = body.email === undefined ? existing.email : String(body.email).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
  const clash = await prisma.user.findFirst({ where: { email, NOT: { id: existing.id } } })
  if (clash) throw new HttpError(409, 'Another account already uses that email address.')

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      firstName: body.firstName ? String(body.firstName).trim() : existing.firstName,
      lastName: body.lastName ? String(body.lastName).trim() : existing.lastName,
      email,
    },
  })

  send(res, 200, toUser(updated))
})

route('DELETE', '/api/students/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.user.findFirst({ where: { id: params.id, role: 'student' } })
  if (!existing) throw new HttpError(404, 'That student record no longer exists.')
  // Related rows cascade via the schema's onDelete: Cascade.
  await prisma.user.delete({ where: { id: existing.id } })
  send(res, 200, { ok: true })
})
