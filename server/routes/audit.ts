/**
 * audit — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { toAuditEntry } from '../mappers.ts'

/* ================================================================== */
/* Audit trail                                                         */
/* ================================================================== */

route('GET', '/api/audit', async ({ res, query, user }) => {
  requireRole(user, 'admin')

  const action = (query.get('action') ?? '').trim()
  const actorId = (query.get('actorId') ?? '').trim()
  const entityId = (query.get('entityId') ?? '').trim()
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 25)))

  const where: Record<string, unknown> = {}
  if (action) where.action = { startsWith: action }
  if (actorId) where.actorId = actorId
  if (entityId) where.entityId = entityId

  const [total, rows] = await Promise.all([
    prisma.auditEntry.count({ where: where as never }),
    prisma.auditEntry.findMany({
      where: where as never,
      orderBy: { at: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  send(res, 200, {
    items: rows.map(toAuditEntry),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

/* ------------------------------------------------------------------ */
