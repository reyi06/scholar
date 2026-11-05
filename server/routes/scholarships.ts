/**
 * scholarships — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId } from '../ids.ts'
import { stringifyArray, stringifyObject, toScholarship } from '../mappers.ts'
import { isIsoDate } from '../rules.ts'

/* ================================================================== */
/* Scholarships                                                        */
/* ================================================================== */

function buildScholarshipWhere(query: URLSearchParams, includeDrafts: boolean) {
  const type = query.get('type') ?? 'all'
  const municipality = query.get('municipality') ?? 'all'
  const status = query.get('status') ?? 'all'
  const level = query.get('level') ?? 'all'
  const search = (query.get('query') ?? '').trim()

  const where: Record<string, unknown> = {}

  if (!includeDrafts) where.status = { not: 'draft' }
  if (includeDrafts && status !== 'all') where.status = status
  if (type !== 'all') where.type = type
  if (municipality !== 'all') where.municipality = municipality

  // NOTE: educationLevels is a JSON-encoded string on SQLite, so this is a
  // substring match on the serialised array. After migrating to Postgres it
  // becomes `{ has: level }` against a real text[] column.
  if (level !== 'all') where.educationLevels = { contains: `"${level}"` }

  if (query.get('featured') === 'true') where.featured = true

  const withinDays = Number(query.get('deadlineWithinDays') ?? '')
  if (Number.isFinite(withinDays) && withinDays > 0) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today.getTime() + withinDays * 86_400_000)
    where.deadline = {
      gte: today.toISOString().slice(0, 10),
      lte: limit.toISOString().slice(0, 10),
    }
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { provider: { contains: search } },
      { description: { contains: search } },
    ]
  }

  return where
}

route('GET', '/api/scholarships', async ({ res, query, user }) => {
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(50, Math.max(1, Number(query.get('pageSize') ?? 10)))
  const includeDrafts = user?.role === 'admin'

  const where = buildScholarshipWhere(query, Boolean(includeDrafts)) as never

  // Ordered in memory rather than by SQL: "soonest deadline first" has to put
  // closed listings last, which is a computed rank SQLite cannot express
  // without a raw query. Listing counts are small enough for this to be cheap.
  const all = await prisma.scholarship.findMany({ where, take: 1000 })
  const today = new Date().toISOString().slice(0, 10)
  const rank = (row: { status: string; deadline: string }): number =>
    row.status === 'open' && row.deadline >= today ? 0 : 1

  const sort = query.get('sort') ?? 'deadline'
  const ordered = [...all]
  if (sort === 'name') {
    ordered.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'newest') {
    ordered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } else {
    ordered.sort((a, b) => rank(a) - rank(b) || a.deadline.localeCompare(b.deadline))
  }

  const total = ordered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize

  send(res, 200, {
    items: ordered.slice(start, start + pageSize).map(toScholarship),
    total,
    page: safePage,
    pageSize,
    totalPages,
  })
})

route('GET', '/api/scholarships/options', async ({ res, user }) => {
  requireRole(user, 'admin')
  const rows = await prisma.scholarship.findMany({
    select: { id: true, name: true, provider: true },
    orderBy: { name: 'asc' },
  })
  send(res, 200, rows)
})

route('GET', '/api/scholarships/:id', async ({ res, params, user }) => {
  const row = await prisma.scholarship.findUnique({ where: { id: params.id } })
  // The list hides drafts, so the detail must too: ids are short and guessable,
  // and a draft may contain an unannounced programme or contact details.
  if (!row || (row.status === 'draft' && user?.role !== 'admin')) {
    send(res, 200, null)
    return
  }
  send(res, 200, toScholarship(row))
})

route('GET', '/api/scholarships/counts-by-type', async ({ res }) => {
  const grouped = await prisma.scholarship.groupBy({
    by: ['type'],
    where: { status: { not: 'draft' } },
    _count: { _all: true },
  })
  send(res, 200, grouped.map((row) => ({ type: row.type, count: row._count._all })))
})

/** Shape a request body into the columns of a Scholarship row. */
function scholarshipData(body: Record<string, unknown>) {
  const list = (key: string): string[] | undefined =>
    Array.isArray(body[key]) ? (body[key] as unknown[]).map(String) : undefined
  const text = (key: string): string | undefined =>
    typeof body[key] === 'string' ? (body[key] as string) : undefined

  const status = text('status')
  if (status !== undefined && !['open', 'closed', 'draft'].includes(status)) {
    throw new HttpError(400, 'Choose a valid listing status.')
  }

  const applicationMode = text('applicationMode')
  if (applicationMode !== undefined && !['internal', 'external'].includes(applicationMode)) {
    throw new HttpError(400, 'Choose a valid application mode.')
  }

  const type = text('type')
  if (
    type !== undefined &&
    !['provincial', 'municipal', 'national', 'educational', 'private'].includes(type)
  ) {
    throw new HttpError(400, 'Choose a valid scholarship type.')
  }

  const deadline = text('deadline')
  if (deadline !== undefined && deadline !== '' && !isIsoDate(deadline)) {
    throw new HttpError(400, 'The deadline must be a real date in YYYY-MM-DD form.')
  }

  // An administrator supplies this, but a `javascript:` URL in an href is still
  // executable. Only full http(s) addresses are accepted; the interface renders
  // the stored value directly.
  const externalUrl = (): string | null | undefined => {
    if (body.externalUrl === undefined) return undefined
    const value = text('externalUrl')?.trim()
    if (!value) return null
    let parsed: URL
    try {
      parsed = new URL(value)
    } catch {
      throw new HttpError(400, 'The provider link must be a full http or https address.')
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new HttpError(400, 'The provider link must use http or https.')
    }
    return parsed.toString()
  }

  return {
    name: text('name'),
    provider: text('provider'),
    type,
    municipality: text('municipality'),
    educationLevels: list('educationLevels') ? stringifyArray(body.educationLevels as string[]) : undefined,
    description: text('description'),
    benefits: list('benefits') ? stringifyArray(body.benefits as string[]) : undefined,
    eligibility: list('eligibility') ? stringifyArray(body.eligibility as string[]) : undefined,
    requirements: list('requirements') ? stringifyArray(body.requirements as string[]) : undefined,
    deadline,
    applicationMode,
    externalUrl: externalUrl(),
    contact: body.contact ? stringifyObject(body.contact) : undefined,
    instructions: list('instructions') ? stringifyArray(body.instructions as string[]) : undefined,
    status,
    featured: typeof body.featured === 'boolean' ? body.featured : undefined,
    tags: list('tags') ? stringifyArray(body.tags as string[]) : undefined,
  }
}

route('POST', '/api/scholarships', async ({ req, res, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const data = scholarshipData(body)

  if (!data.name || !data.provider || !data.type || !data.deadline) {
    throw new HttpError(400, 'Name, provider, type and deadline are required.')
  }
  if (data.applicationMode === 'external' && !data.externalUrl) {
    throw new HttpError(400, 'An external application link is required for external listings.')
  }

  const created = await prisma.scholarship.create({
    data: {
      id: createId('sch'),
      name: data.name,
      provider: data.provider,
      type: data.type,
      municipality: data.municipality ?? 'Province-wide',
      educationLevels: data.educationLevels ?? '[]',
      description: data.description ?? '',
      benefits: data.benefits ?? '[]',
      eligibility: data.eligibility ?? '[]',
      requirements: data.requirements ?? '[]',
      deadline: data.deadline,
      applicationMode: data.applicationMode ?? 'internal',
      externalUrl: data.externalUrl ?? null,
      contact: data.contact ?? '{}',
      instructions: data.instructions ?? '[]',
      status: data.status ?? 'draft',
      featured: data.featured ?? false,
      tags: data.tags ?? '[]',
    },
  })

  send(res, 201, toScholarship(created))
})

route('PATCH', '/api/scholarships/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.scholarship.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That scholarship listing no longer exists.')

  const body = await readJson(req)
  const data = Object.fromEntries(
    Object.entries(scholarshipData(body)).filter(([, value]) => value !== undefined),
  )

  const mode = (data.applicationMode as string | undefined) ?? existing.applicationMode
  const externalUrl = (data.externalUrl as string | null | undefined) ?? existing.externalUrl
  if (mode === 'external' && !externalUrl) {
    throw new HttpError(400, 'An external application link is required for external listings.')
  }

  const updated = await prisma.scholarship.update({ where: { id: params.id }, data: data as never })
  send(res, 200, toScholarship(updated))
})

route('DELETE', '/api/scholarships/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.scholarship.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That scholarship listing no longer exists.')
  await prisma.scholarship.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})

/* ================================================================== */
/* Saved scholarships                                                  */
/* ================================================================== */

route('GET', '/api/saved', async ({ res, user }) => {
  const student = requireRole(user, 'student')
  const entries = await prisma.savedScholarship.findMany({
    where: { studentId: student.id },
    include: { scholarship: true },
    orderBy: { savedAt: 'desc' },
  })
  send(res, 200, entries.map((entry) => toScholarship(entry.scholarship)))
})

route('POST', '/api/saved/:scholarshipId/toggle', async ({ res, params, user }) => {
  const student = requireRole(user, 'student')
  const key = { studentId: student.id, scholarshipId: params.scholarshipId }

  const existing = await prisma.savedScholarship.findUnique({
    where: { studentId_scholarshipId: key },
  })

  if (existing) {
    await prisma.savedScholarship.delete({ where: { studentId_scholarshipId: key } })
    send(res, 200, { saved: false })
    return
  }

  await prisma.savedScholarship.create({ data: key })
  send(res, 200, { saved: true })
})
