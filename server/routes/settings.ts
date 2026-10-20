/**
 * settings — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { toSettings } from '../mappers.ts'

/* ================================================================== */
/* Platform settings                                                   */
/* ================================================================== */

route('GET', '/api/settings', async ({ res }) => {
  const row = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
  if (!row) throw new HttpError(500, 'Platform settings have not been initialised.')
  send(res, 200, toSettings(row))
})

route('PATCH', '/api/settings', async ({ req, res, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
  if (!existing) throw new HttpError(500, 'Platform settings have not been initialised.')

  const contactEmail = body.contactEmail ? String(body.contactEmail).trim() : existing.contactEmail
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
    throw new HttpError(400, 'Enter a valid contact email address.')
  }

  const updated = await prisma.platformSettings.update({
    where: { id: 'singleton' },
    data: {
      currentAcademicYear: body.currentAcademicYear ? String(body.currentAcademicYear) : existing.currentAcademicYear,
      currentSemester: body.currentSemester ? String(body.currentSemester) : existing.currentSemester,
      applicationsOpen: body.applicationsOpen === undefined ? existing.applicationsOpen : Boolean(body.applicationsOpen),
      maintenanceMessage: body.maintenanceMessage === undefined ? existing.maintenanceMessage : String(body.maintenanceMessage),
      contactEmail,
    },
  })

  send(res, 200, toSettings(updated))
})
