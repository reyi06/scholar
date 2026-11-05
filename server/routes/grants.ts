/**
 * grants — extracted from server/index.ts.
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
import { toGrant } from '../mappers.ts'
import { isUniqueViolation } from '../rules.ts'
import type { User } from '../../src/types/index.ts'

const GRANT_STATUSES = ['active', 'completed', 'suspended'] as const

/**
 * Create a grant record from an application that is already approved.
 *
 * Both the explicit confirmation route and the administrator's manual form go
 * through here, so neither can create a grant that is not attached to an
 * approved application. The grant and its notification are one transaction.
 */
async function createGrantRecord(input: {
  admin: User
  application: { id: string; studentId: string; scholarshipId: string }
  amount: number
  academicYear: string
  semester: string
  remarks: string | null
  status?: string
  releasedAt?: Date
}) {
  const { admin, application, amount, academicYear, semester, remarks } = input
  const now = new Date()

  let created: Awaited<ReturnType<typeof prisma.grant.create>> | null = null

  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const existingRefs = (await prisma.grant.findMany({ select: { referenceNo: true } })).map(
      (row) => row.referenceNo,
    )

    try {
      created = await prisma.$transaction(async (tx) => {
        const row = await tx.grant.create({
          data: {
            id: createId('grt'),
            referenceNo: nextReference('GRT', existingRefs),
            studentId: application.studentId,
            scholarshipId: application.scholarshipId,
            applicationId: application.id,
            academicYear,
            semester,
            amountCentavos: Math.round(amount * 100),
            status: input.status ?? 'active',
            releasedAt: input.releasedAt ?? now,
            confirmedBy: `${admin.firstName} ${admin.lastName}`,
            remarks,
          },
        })

        await tx.notification.create({
          data: {
            id: createId('ntf'),
            userId: application.studentId,
            title: 'Grant record confirmed',
            body: `A grant of ${amount.toLocaleString('en-PH')} was confirmed for ${semester}, AY ${academicYear}.`,
            createdAt: now,
            link: '/student/grants',
          },
        })

        return row
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error

      // A reference-number collision is retried with a fresh sequence. A
      // collision on applicationId is a genuine second confirmation.
      if (isUniqueViolation(error, 'referenceNo')) {
        if (attempt === 2) {
          throw new HttpError(409, 'Could not allocate a reference number. Please try again.')
        }
        continue
      }
      throw new HttpError(409, 'A grant record has already been confirmed for this application.')
    }
  }

  if (!created) throw new HttpError(409, 'Could not create the grant record. Please try again.')

  await recordAudit({
    actor: admin,
    action: 'grant.confirmed',
    entityType: 'grant',
    entityId: created.id,
    summary: `Confirmed ${created.referenceNo} for ${amount.toLocaleString('en-PH')} (${semester}, AY ${academicYear})`,
    detail: {
      amount,
      applicationId: application.id,
      studentId: application.studentId,
      scholarshipId: application.scholarshipId,
    },
  })

  return created
}

/* ================================================================== */
/* Confirmed grants                                                    */
/* ================================================================== */

route('GET', '/api/grants', async ({ res, query, user }) => {
  const signedIn = requireUser(user)
  const isAdmin = signedIn.role === 'admin'

  const where: Record<string, unknown> = {}
  if (!isAdmin) where.studentId = signedIn.id
  for (const key of ['status', 'academicYear', 'semester'] as const) {
    const value = query.get(key)
    if (value && value !== 'all') where[key] = value
  }

  const grantSearch = (query.get('query') ?? '').trim()
  if (grantSearch) {
    where.OR = [
      { referenceNo: { contains: grantSearch } },
      { student: { OR: [{ firstName: { contains: grantSearch } }, { lastName: { contains: grantSearch } }] } },
      { scholarship: { name: { contains: grantSearch } } },
    ]
  }

  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 50)))

  const [total, rows] = await Promise.all([
    prisma.grant.count({ where: where as never }),
    prisma.grant.findMany({
      where: where as never,
      orderBy: { releasedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  send(res, 200, {
    items: rows.map(toGrant),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

route('GET', '/api/grants/total-released', async ({ res }) => {
  // Summed as integers, divided once: adding peso floats is how a total drifts
  // from the rows that produced it.
  const result = await prisma.grant.aggregate({ _sum: { amountCentavos: true } })
  send(res, 200, (result._sum.amountCentavos ?? 0) / 100)
})

route('GET', '/api/grants/:id', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.grant.findUnique({ where: { id: params.id } })
  if (!row) {
    send(res, 200, null)
    return
  }
  requireOwnerOrAdmin(signedIn, row.studentId)
  send(res, 200, toGrant(row))
})

/**
 * The only path that turns an approved application into a confirmed grant.
 */
route('POST', '/api/grants/confirm', async ({ req, res, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const applicationId = String(body.applicationId ?? '')
  const amount = Number(body.amount)
  const academicYear = String(body.academicYear ?? '').trim()
  const semester = String(body.semester ?? '').trim()
  const remarks =
    typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null

  if (!applicationId) throw new HttpError(400, 'Choose an application to confirm.')
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Enter the amount to release.')
  if (!academicYear || !semester) throw new HttpError(400, 'Choose the academic year and semester.')
  if (remarks && remarks.length > 2000) throw new HttpError(400, 'Keep the remarks under 2,000 characters.')

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application) throw new HttpError(404, 'That application no longer exists.')
  if (application.status !== 'approved') {
    throw new HttpError(409, 'Only approved applications can be confirmed as grants.')
  }

  const already = await prisma.grant.findUnique({ where: { applicationId } })
  if (already) throw new HttpError(409, 'A grant record has already been confirmed for this application.')

  const created = await createGrantRecord({
    admin,
    application,
    amount,
    academicYear,
    semester,
    remarks,
  })

  send(res, 201, toGrant(created))
})

route('POST', '/api/grants', async ({ req, res, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)

  const studentId = String(body.studentId ?? '')
  const scholarshipId = String(body.scholarshipId ?? '')
  const amount = Number(body.amount)
  const academicYear = String(body.academicYear ?? '').trim()
  const semester = String(body.semester ?? '').trim()
  const status = String(body.status ?? 'active')
  const releasedAt = body.releasedAt ? new Date(String(body.releasedAt)) : new Date()
  const remarks =
    typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null

  if (!studentId || !scholarshipId) throw new HttpError(400, 'Choose a student and a scholarship.')
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Enter the amount to release.')
  if (!academicYear || !semester) throw new HttpError(400, 'Choose the academic year and semester.')
  if (!GRANT_STATUSES.includes(status as (typeof GRANT_STATUSES)[number])) {
    throw new HttpError(400, 'Choose a valid grant status.')
  }
  if (Number.isNaN(releasedAt.getTime())) throw new HttpError(400, 'Enter a valid release date.')
  if (remarks && remarks.length > 2000) throw new HttpError(400, 'Keep the remarks under 2,000 characters.')

  // A manual record is still a grant. It must point at an approved application
  // that does not already have one, exactly like the confirmation route.
  const application = await prisma.application.findFirst({
    where: { studentId, scholarshipId, status: 'approved', grant: null },
    orderBy: { submittedAt: 'desc' },
  })
  if (!application) {
    throw new HttpError(
      409,
      'A grant can only be recorded for an approved application that does not already have one.',
    )
  }

  const created = await createGrantRecord({
    admin,
    application,
    amount,
    academicYear,
    semester,
    remarks,
    status,
    releasedAt,
  })

  send(res, 201, toGrant(created))
})

route('PATCH', '/api/grants/:id', async ({ req, res, params, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.grant.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That grant record no longer exists.')

  const amountCentavos =
    body.amount === undefined ? existing.amountCentavos : Math.round(Number(body.amount) * 100)
  if (!Number.isFinite(amountCentavos) || amountCentavos <= 0) {
    throw new HttpError(400, 'Enter a valid amount.')
  }

  const status = body.status ? String(body.status) : existing.status
  if (!GRANT_STATUSES.includes(status as (typeof GRANT_STATUSES)[number])) {
    throw new HttpError(400, 'Choose a valid grant status.')
  }

  const academicYear = body.academicYear ? String(body.academicYear).trim() : existing.academicYear
  const semester = body.semester ? String(body.semester).trim() : existing.semester
  if (!academicYear || !semester) throw new HttpError(400, 'Choose the academic year and semester.')

  const remarks =
    body.remarks === undefined ? existing.remarks : String(body.remarks).trim() || null
  if (remarks && remarks.length > 2000) throw new HttpError(400, 'Keep the remarks under 2,000 characters.')

  const updated = await prisma.grant.update({
    where: { id: params.id },
    data: { amountCentavos, academicYear, semester, status, remarks },
  })

  await recordAudit({
    actor: admin,
    action: 'grant.updated',
    entityType: 'grant',
    entityId: existing.id,
    summary: `Updated grant ${existing.referenceNo}`,
    detail: {
      before: {
        amountCentavos: existing.amountCentavos,
        academicYear: existing.academicYear,
        semester: existing.semester,
        status: existing.status,
      },
      after: { amountCentavos, academicYear, semester, status },
    },
  })

  send(res, 200, toGrant(updated))
})

route('DELETE', '/api/grants/:id', async ({ res, params, user }) => {
  const admin = requireRole(user, 'admin')
  const existing = await prisma.grant.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That grant record no longer exists.')

  await recordAudit({
    actor: admin,
    action: 'grant.deleted',
    entityType: 'grant',
    entityId: existing.id,
    summary: `Deleted grant ${existing.referenceNo}`,
    detail: {
      studentId: existing.studentId,
      scholarshipId: existing.scholarshipId,
      amountCentavos: existing.amountCentavos,
      status: existing.status,
    },
  })

  await prisma.grant.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})
