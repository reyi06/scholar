/**
 * applications — extracted from server/index.ts.
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
import { stringifyArray, stringifyObject, toApplication } from '../mappers.ts'

/* ================================================================== */
/* Applications                                                        */
/* ================================================================== */

route('GET', '/api/applications', async ({ res, query, user }) => {
  const signedIn = requireUser(user)
  const isAdmin = signedIn.role === 'admin'
  const status = query.get('status') ?? 'all'
  const scholarshipId = query.get('scholarshipId') ?? 'all'

  const where: Record<string, unknown> = {}
  // A student is scoped to their own records; an administrator may filter by
  // student but is not scoped by default.
  if (!isAdmin) where.studentId = signedIn.id
  else if (query.get('studentId')) where.studentId = query.get('studentId')
  if (status !== 'all') where.status = status
  if (scholarshipId !== 'all') where.scholarshipId = scholarshipId

  const appSearch = (query.get('query') ?? '').trim()
  if (appSearch) {
    where.OR = [
      { referenceNo: { contains: appSearch } },
      { motivation: { contains: appSearch } },
      { student: { OR: [{ firstName: { contains: appSearch } }, { lastName: { contains: appSearch } }] } },
      { scholarship: { name: { contains: appSearch } } },
    ]
  }

  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(100, Math.max(1, Number(query.get('pageSize') ?? 10)))

  const [total, rows] = await Promise.all([
    prisma.application.count({ where: where as never }),
    prisma.application.findMany({
      where: where as never,
      include: { timeline: { orderBy: { at: 'asc' } } },
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  send(res, 200, {
    items: rows.map(toApplication),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

route('GET', '/api/applications/:id', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.application.findUnique({
    where: { id: params.id },
    include: { timeline: { orderBy: { at: 'asc' } } },
  })

  if (!row) {
    send(res, 200, null)
    return
  }

  // Ownership is enforced here rather than in the browser.
  requireOwnerOrAdmin(signedIn, row.studentId)
  send(res, 200, toApplication(row))
})

route('POST', '/api/applications', async ({ req, res, user }) => {
  const student = requireRole(user, 'student')
  const body = await readJson(req)
  const scholarshipId = String(body.scholarshipId ?? '')
  const asDraft = Boolean(body.asDraft)

  const scholarship = await prisma.scholarship.findUnique({ where: { id: scholarshipId } })
  if (!scholarship) throw new HttpError(404, 'That scholarship listing no longer exists.')
  if (scholarship.status !== 'open') throw new HttpError(409, 'This listing is not accepting applications.')

  const existing = await prisma.application.findFirst({
    where: { studentId: student.id, scholarshipId },
  })
  if (existing && existing.status !== 'draft') {
    throw new HttpError(409, 'You already have an application for this scholarship.')
  }

  const existingRefs = (await prisma.application.findMany({ select: { referenceNo: true } })).map(
    (row) => row.referenceNo,
  )

  const now = new Date()
  const created = await prisma.application.create({
    data: {
      id: createId('app'),
      referenceNo: nextReference('APP', existingRefs),
      scholarshipId,
      studentId: student.id,
      status: asDraft ? 'draft' : 'submitted',
      submittedAt: now,
      updatedAt: now,
      motivation: String(body.motivation ?? ''),
      responses: stringifyObject(body.responses ?? []),
      documentNames: stringifyArray(Array.isArray(body.documentNames) ? (body.documentNames as string[]) : []),
      timeline: asDraft
        ? undefined
        : {
            create: [
              {
                id: createId('tle'),
                status: 'submitted',
                at: now,
                note: 'Application submitted through the portal.',
              },
            ],
          },
    },
    include: { timeline: true },
  })

  if (!asDraft) {
    await prisma.notification.create({
      data: {
        id: createId('ntf'),
        userId: student.id,
        title: 'Application submitted',
        body: `Your application ${created.referenceNo} was recorded as submitted.`,
        createdAt: new Date(),
        link: `/student/applications/${created.id}`,
      },
    })
  }

  send(res, 201, toApplication(created))
})

/* ================================================================== */
/* Saved — ids only                                                    */
/* ================================================================== */

route('GET', '/api/saved/ids', async ({ res, user }) => {
  const student = requireRole(user, 'student')
  const rows = await prisma.savedScholarship.findMany({
    where: { studentId: student.id },
    select: { scholarshipId: true },
  })
  send(res, 200, rows.map((row) => row.scholarshipId))
})

/* ================================================================== */
/* Applications — mutations and derived views                          */
/* ================================================================== */

const DECISIONS = ['under-review', 'needs-info', 'approved', 'rejected'] as const

route('PATCH', '/api/applications/:id', async ({ req, res, params, user }) => {
  const student = requireRole(user, 'student')
  const existing = await prisma.application.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That application no longer exists.')
  requireOwnerOrAdmin(student, existing.studentId)
  if (existing.status !== 'draft') throw new HttpError(409, 'Only draft applications can be edited.')

  const body = await readJson(req)
  const asDraft = Boolean(body.asDraft)
  const now = new Date()

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: {
      motivation: typeof body.motivation === 'string' ? body.motivation : existing.motivation,
      responses: body.responses ? stringifyObject(body.responses) : existing.responses,
      documentNames: Array.isArray(body.documentNames)
        ? stringifyArray(body.documentNames as string[])
        : existing.documentNames,
      status: asDraft ? 'draft' : 'submitted',
      submittedAt: asDraft ? existing.submittedAt : now,
      updatedAt: now,
      ...(asDraft
        ? {}
        : {
            timeline: {
              create: [
                {
                  id: createId('tle'),
                  status: 'submitted',
                  at: now,
                  note: 'Application submitted through the portal.',
                },
              ],
            },
          }),
    },
    include: { timeline: { orderBy: { at: 'asc' } } },
  })

  send(res, 200, toApplication(updated))
})

/**
 * Administrator decision.
 * Records the review outcome only — approving here deliberately does NOT create
 * a grant. That happens solely through POST /api/grants/confirm.
 */
route('POST', '/api/applications/:id/status', async ({ req, res, params, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const status = String(body.status ?? '')

  if (!DECISIONS.includes(status as (typeof DECISIONS)[number])) {
    throw new HttpError(400, 'That is not a valid decision.')
  }
  const note = String(body.note ?? '').trim()
  if (note.length < 5) throw new HttpError(400, 'Add a short note explaining the decision.')

  const existing = await prisma.application.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That application no longer exists.')

  const actor = `${admin.firstName} ${admin.lastName}`
  const now = new Date()
  const label = status.replace(/-/g, ' ')

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: {
      status,
      reviewNotes: note,
      reviewedBy: actor,
      updatedAt: now,
      timeline: { create: [{ id: createId('tle'), status, at: now, note, actor }] },
    },
    include: { timeline: { orderBy: { at: 'asc' } } },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: existing.studentId,
      title: `Application ${label}`,
      body: `Your application ${existing.referenceNo} is now marked as ${label}.`,
      createdAt: now,
      link: `/student/applications/${existing.id}`,
    },
  })

  await recordAudit({
    actor: admin,
    action: 'application.decided',
    entityType: 'application',
    entityId: existing.id,
    summary: `Marked ${existing.referenceNo} as ${label}`,
    detail: { from: existing.status, to: status, studentId: existing.studentId, note },
  })

  send(res, 200, toApplication(updated))
})

route('POST', '/api/applications/:id/withdraw', async ({ res, params, user }) => {
  const student = requireRole(user, 'student')
  const existing = await prisma.application.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That application no longer exists.')
  if (existing.studentId !== student.id) {
    throw new HttpError(403, 'You can only withdraw your own application.')
  }
  if (existing.status !== 'draft' && existing.status !== 'submitted') {
    throw new HttpError(409, 'Only draft or submitted applications can be withdrawn.')
  }

  const now = new Date()
  const updated = await prisma.application.update({
    where: { id: params.id },
    data: {
      status: 'rejected',
      updatedAt: now,
      reviewNotes: 'Withdrawn by the applicant.',
      timeline: {
        create: [
          {
            id: createId('tle'),
            status: 'rejected',
            at: now,
            note: 'Withdrawn by the applicant.',
            actor: 'Applicant',
          },
        ],
      },
    },
    include: { timeline: { orderBy: { at: 'asc' } } },
  })

  send(res, 200, toApplication(updated))
})

route('DELETE', '/api/applications/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.application.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That application no longer exists.')
  await prisma.application.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})

/** Approved applications that have no confirmed grant yet. */
route('GET', '/api/applications/awaiting-grant', async ({ res, user }) => {
  requireRole(user, 'admin')
  const rows = await prisma.application.findMany({
    where: { status: 'approved', grant: null },
    include: { timeline: { orderBy: { at: 'asc' } } },
    orderBy: { submittedAt: 'desc' },
  })
  send(res, 200, rows.map(toApplication))
})

route('GET', '/api/applications/counts', async ({ res, user }) => {
  requireRole(user, 'admin')
  const grouped = await prisma.application.groupBy({ by: ['status'], _count: { _all: true } })
  const counts: Record<string, number> = {
    draft: 0,
    submitted: 0,
    'under-review': 0,
    'needs-info': 0,
    approved: 0,
    rejected: 0,
  }
  for (const row of grouped) {
    counts[row.status] = row._count._all
  }
  send(res, 200, counts)
})
