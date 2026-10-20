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

  if (!applicationId) throw new HttpError(400, 'Choose an application to confirm.')
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Enter the amount to release.')
  if (!academicYear || !semester) throw new HttpError(400, 'Choose the academic year and semester.')

  const application = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!application) throw new HttpError(404, 'That application no longer exists.')
  if (application.status !== 'approved') {
    throw new HttpError(409, 'Only approved applications can be confirmed as grants.')
  }

  const already = await prisma.grant.findUnique({ where: { applicationId } })
  if (already) throw new HttpError(409, 'A grant record has already been confirmed for this application.')

  const existingRefs = (await prisma.grant.findMany({ select: { referenceNo: true } })).map(
    (row) => row.referenceNo,
  )

  const now = new Date()
  const created = await prisma.grant.create({
    data: {
      id: createId('grt'),
      referenceNo: nextReference('GRT', existingRefs),
      studentId: application.studentId,
      scholarshipId: application.scholarshipId,
      applicationId,
      academicYear,
      semester,
      amountCentavos: Math.round(amount * 100),
      status: 'active',
      releasedAt: now,
      confirmedBy: `${admin.firstName} ${admin.lastName}`,
      remarks: typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null,
    },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: application.studentId,
      title: 'Grant record confirmed',
      body: `A grant of ${amount.toLocaleString('en-PH')} was confirmed for ${semester}, AY ${academicYear}.`,
      createdAt: now,
      link: '/student/grants',
    },
  })

  // The act that releases funds. This is the entry an audit is really for.
  await recordAudit({
    actor: admin,
    action: 'grant.confirmed',
    entityType: 'grant',
    entityId: created.id,
    summary: `Confirmed ${created.referenceNo} for ${amount.toLocaleString('en-PH')} (${semester}, AY ${academicYear})`,
    detail: {
      amount,
      applicationId,
      studentId: application.studentId,
      scholarshipId: application.scholarshipId,
    },
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

  if (!studentId || !scholarshipId) throw new HttpError(400, 'Choose a student and a scholarship.')
  if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, 'Enter the amount to release.')
  if (!academicYear || !semester) throw new HttpError(400, 'Choose the academic year and semester.')

  const existingRefs = (await prisma.grant.findMany({ select: { referenceNo: true } })).map(
    (row) => row.referenceNo,
  )

  const created = await prisma.grant.create({
    data: {
      id: createId('grt'),
      referenceNo: nextReference('GRT', existingRefs),
      studentId,
      scholarshipId,
      academicYear,
      semester,
      amountCentavos: Math.round(amount * 100),
      status: (String(body.status ?? 'active') as string),
      releasedAt: body.releasedAt ? new Date(String(body.releasedAt)) : new Date(),
      confirmedBy: `${admin.firstName} ${admin.lastName}`,
      remarks: typeof body.remarks === 'string' && body.remarks.trim() ? body.remarks.trim() : null,
    },
  })

  send(res, 201, toGrant(created))
})

route('PATCH', '/api/grants/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.grant.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That grant record no longer exists.')

  const updated = await prisma.grant.update({
    where: { id: params.id },
    data: {
      amountCentavos:
        body.amount === undefined
          ? existing.amountCentavos
          : Math.round(Number(body.amount) * 100),
      academicYear: body.academicYear ? String(body.academicYear) : existing.academicYear,
      semester: body.semester ? String(body.semester) : existing.semester,
      status: body.status ? String(body.status) : existing.status,
      remarks: body.remarks === undefined ? existing.remarks : String(body.remarks),
    },
  })

  send(res, 200, toGrant(updated))
})

route('DELETE', '/api/grants/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.grant.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That grant record no longer exists.')
  await prisma.grant.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})
