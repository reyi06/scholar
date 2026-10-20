/**
 * maintenance — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'

/* ================================================================== */
/* Maintenance                                                         */
/* ================================================================== */

route('POST', '/api/reset', async ({ user }) => {
  requireRole(user, 'admin')
  // Delegated to the seed script so there is one definition of the shipped data.
  throw new HttpError(501, 'Restore the shipped records with "npm run db:seed".')
})

/**
 * Lightweight counts for the administrator settings screen.
 */
route('GET', '/api/stats', async ({ res, user }) => {
  requireRole(user, 'admin')
  const [scholarships, applications, students, grants] = await Promise.all([
    prisma.scholarship.count(),
    prisma.application.count(),
    prisma.user.count({ where: { role: 'student' } }),
    prisma.grant.count(),
  ])
  send(res, 200, { scholarships, applications, students, grants })
})
