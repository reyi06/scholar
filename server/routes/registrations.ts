/**
 * registrations — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { recordAudit } from '../audit.ts'
import { prisma } from '../db.ts'
import { requireOwnerOrAdmin, requireRole, requireUser } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId, nextReference } from '../ids.ts'
import { toRegistration } from '../mappers.ts'
import { isUniqueViolation, registrationDecisionAllowed } from '../rules.ts'

/* ================================================================== */
/* Semester registrations                                              */
/* ================================================================== */

route('GET', '/api/registrations', async ({ res, query, user }) => {
  const signedIn = requireUser(user)
  const isAdmin = signedIn.role === 'admin'

  const where: Record<string, unknown> = {}
  if (!isAdmin) where.studentId = signedIn.id
  for (const key of ['status', 'academicYear', 'semester'] as const) {
    const value = query.get(key)
    if (value && value !== 'all') where[key] = value
  }

  const regSearch = (query.get('query') ?? '').trim()
  if (regSearch) {
    where.OR = [
      { referenceNo: { contains: regSearch } },
      { school: { contains: regSearch } },
      { course: { contains: regSearch } },
      { student: { OR: [{ firstName: { contains: regSearch } }, { lastName: { contains: regSearch } }] } },
    ]
  }

  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 50)))

  const [total, rows] = await Promise.all([
    prisma.semesterRegistration.count({ where: where as never }),
    prisma.semesterRegistration.findMany({
      where: where as never,
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  send(res, 200, {
    items: rows.map(toRegistration),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

route('GET', '/api/registrations/counts', async ({ res, user }) => {
  requireRole(user, 'admin')
  const grouped = await prisma.semesterRegistration.groupBy({ by: ['status'], _count: { _all: true } })
  const counts: Record<string, number> = { pending: 0, verified: 0, rejected: 0 }
  for (const row of grouped) counts[row.status] = row._count._all
  send(res, 200, counts)
})

route('GET', '/api/registrations/:id', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.semesterRegistration.findUnique({ where: { id: params.id } })
  if (!row) {
    send(res, 200, null)
    return
  }
  requireOwnerOrAdmin(signedIn, row.studentId)
  send(res, 200, toRegistration(row))
})

route('POST', '/api/registrations', async ({ req, res, user }) => {
  const student = requireRole(user, 'student')
  const body = await readJson(req)

  const academicYear = String(body.academicYear ?? '').trim()
  const semester = String(body.semester ?? '').trim()
  const school = String(body.school ?? '').trim()
  const course = String(body.course ?? '').trim()
  const yearLevel = String(body.yearLevel ?? '').trim()
  const unitsEnrolled = Number(body.unitsEnrolled)
  const gwa = body.gwa === null || body.gwa === undefined || body.gwa === '' ? null : Number(body.gwa)

  if (!academicYear || !semester || !school || !course || !yearLevel) {
    throw new HttpError(400, 'Please complete every required field.')
  }
  if (!Number.isFinite(unitsEnrolled) || unitsEnrolled < 1 || unitsEnrolled > 40) {
    throw new HttpError(400, 'Units enrolled must be between 1 and 40.')
  }
  if (gwa !== null && (Number.isNaN(gwa) || gwa < 1 || gwa > 5)) {
    throw new HttpError(400, 'General weighted average must be between 1.00 and 5.00.')
  }

  // Registration keeps an existing grant active. A completed or suspended
  // grant is not something a new term can be registered against.
  const activeGrant = await prisma.grant.findFirst({
    where: { studentId: student.id, status: 'active' },
    select: { id: true },
  })
  if (!activeGrant) {
    throw new HttpError(403, 'Semester registration is only available to students with an active confirmed grant.')
  }

  const duplicate = await prisma.semesterRegistration.findFirst({
    where: { studentId: student.id, academicYear, semester },
  })
  if (duplicate) {
    throw new HttpError(409, `You already have a registration for ${semester}, AY ${academicYear}.`)
  }

  const now = new Date()

  let created: Awaited<ReturnType<typeof prisma.semesterRegistration.create>> | null = null

  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const existingRefs = (
      await prisma.semesterRegistration.findMany({ select: { referenceNo: true } })
    ).map((row) => row.referenceNo)

    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.semesterRegistration.create({
          data: {
            id: createId('reg'),
            referenceNo: nextReference('REG', existingRefs),
            studentId: student.id,
            academicYear,
            semester,
            school,
            course,
            yearLevel,
            unitsEnrolled,
            gwa,
            status: 'pending',
            submittedAt: now,
            updatedAt: now,
          },
        })

        await tx.notification.create({
          data: {
            id: createId('ntf'),
            userId: student.id,
            title: 'Semester registration submitted',
            body: `Registration ${row.referenceNo} is pending verification.`,
            createdAt: now,
            link: '/student/semester-registration',
          },
        })

        return row
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error

      if (isUniqueViolation(error, 'referenceNo')) {
        if (attempt === 2) {
          throw new HttpError(409, 'Could not allocate a reference number. Please try again.')
        }
        continue
      }

      throw new HttpError(409, `You already have a registration for ${semester}, AY ${academicYear}.`)
    }
  }

  if (!created) throw new HttpError(409, 'Could not create the registration. Please try again.')
  send(res, 201, toRegistration(created))
})

route('POST', '/api/registrations/:id/status', async ({ req, res, params, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const status = String(body.status ?? '')
  if (status !== 'verified' && status !== 'rejected') {
    throw new HttpError(400, 'That is not a valid decision.')
  }

  const remarks = typeof body.remarks === 'string' ? body.remarks.trim() : ''
  if (status === 'rejected' && remarks.length < 5) {
    throw new HttpError(400, 'Give a reason for rejecting the registration.')
  }

  const existing = await prisma.semesterRegistration.findUnique({
    where: { id: params.id },
    include: { grants: { select: { id: true } } },
  })
  if (!existing) throw new HttpError(404, 'That registration no longer exists.')
  if (existing.grants.length > 0) {
    throw new HttpError(
      409,
      'A grant depends on this registration. Its verification is part of the financial record and cannot be changed.',
    )
  }
  if (!registrationDecisionAllowed(existing.status, status)) {
    throw new HttpError(
      409,
      `A ${existing.status} registration cannot be marked ${status}.`,
    )
  }
  if (remarks.length > 2000) throw new HttpError(400, 'Keep the remarks under 2,000 characters.')

  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.semesterRegistration.update({
      where: { id: params.id },
      data: {
        status,
        remarks: remarks || existing.remarks,
        verifiedBy: `${admin.firstName} ${admin.lastName}`,
        updatedAt: now,
      },
    })

    await tx.notification.create({
      data: {
        id: createId('ntf'),
        userId: row.studentId,
        title: `Semester registration ${status}`,
        body: `Registration ${row.referenceNo} is now marked as ${status}.`,
        createdAt: now,
        link: '/student/semester-registration',
      },
    })

    return row
  })

  await recordAudit({
    actor: admin,
    action: 'registration.decided',
    entityType: 'registration',
    entityId: existing.id,
    summary: `Marked registration ${existing.referenceNo} as ${status}`,
    detail: { from: existing.status, to: status, studentId: existing.studentId, remarks: remarks || null },
  })

  send(res, 200, toRegistration(updated))
})
