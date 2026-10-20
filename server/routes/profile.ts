/**
 * profile — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole, requireUser } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { toProfile } from '../mappers.ts'

/* ================================================================== */
/* Student profile                                                     */
/* ================================================================== */

route('GET', '/api/profile', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.studentProfile.findUnique({ where: { userId: signedIn.id } })
  send(res, 200, row ? toProfile(row) : null)
})

route('PATCH', '/api/profile', async ({ req, res, user }) => {
  const signedIn = requireRole(user, 'student')
  const body = await readJson(req)

  const text = (key: string): string | undefined =>
    typeof body[key] === 'string' ? (body[key] as string).trim() : undefined
  const number = (key: string): number | null | undefined => {
    if (body[key] === null) return null
    if (body[key] === undefined) return undefined
    const parsed = Number(body[key])
    return Number.isNaN(parsed) ? undefined : parsed
  }

  const patch = {
    studentNumber: text('studentNumber'),
    phone: text('phone'),
    municipality: text('municipality'),
    barangay: text('barangay'),
    address: text('address'),
    birthDate: text('birthDate'),
    educationLevel: text('educationLevel'),
    school: text('school'),
    course: text('course'),
    yearLevel: text('yearLevel'),
    gwa: number('gwa'),
    householdIncome: number('householdIncome'),
    guardianName: text('guardianName'),
    guardianContact: text('guardianContact'),
  }

  // Drop undefined so Prisma leaves those columns alone.
  const data = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined))

  const row = await prisma.studentProfile.upsert({
    where: { userId: signedIn.id },
    create: { userId: signedIn.id, ...data },
    update: { ...data, updatedAt: new Date() },
  })

  send(res, 200, toProfile(row))
})
