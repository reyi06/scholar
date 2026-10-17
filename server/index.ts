import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { prisma } from './db.ts'
import { createId, nextReference } from './ids.ts'
import { hashPassword, verifyPassword } from './passwords.ts'
import {
  stringifyArray,
  stringifyObject,
  toApplication,
  toScholarship,
  toUser,
} from './mappers.ts'
import type { Role, User } from '../src/types/index.ts'

/**
 * Local API server.
 *
 * Owns the SQLite database. The browser never touches the database directly and
 * never receives database credentials — authorisation is decided here, per
 * request, which is the whole point of having a server at all.
 *
 * Deliberately dependency-free: Node's `http` plus a small router, matching the
 * project's approach elsewhere (icons, CSV, dialogs and validation are all
 * hand-rolled rather than pulled in).
 *
 * Run with: npm run server
 */

const PORT = Number(process.env.API_PORT ?? 8787)
const SESSION_COOKIE = 'pgc_session'
const SESSION_DAYS = 30

/* ------------------------------------------------------------------ */
/* Small HTTP helpers                                                  */
/* ------------------------------------------------------------------ */

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, 'Request body was not valid JSON.')
  }
}

function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=')
    if (index > 0) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    return acc
  }, {})
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

/** Resolves the signed-in user from the session cookie, or null. */
async function currentUser(req: IncomingMessage): Promise<User | null> {
  const sessionId = parseCookies(req)[SESSION_COOKIE]
  if (!sessionId) return null

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } })
  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }

  return toUser(session.user)
}

async function startSession(res: ServerResponse, userId: string): Promise<void> {
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await prisma.session.create({ data: { id, userId, expiresAt } })

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}`,
  )
}

function endSession(res: ServerResponse): void {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`)
}

/* ------------------------------------------------------------------ */
/* Authorisation                                                       */
/* ------------------------------------------------------------------ */

function requireUser(user: User | null): User {
  if (!user) throw new HttpError(401, 'You need to be signed in.')
  return user
}

function requireRole(user: User | null, role: Role): User {
  const signedIn = requireUser(user)
  if (signedIn.role !== role) throw new HttpError(403, 'You do not have access to this resource.')
  return signedIn
}

/** A student may only ever act on their own records. */
function requireOwnerOrAdmin(user: User, ownerId: string): void {
  if (user.role !== 'admin' && user.id !== ownerId) {
    throw new HttpError(403, 'You do not have access to this resource.')
  }
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

interface Route {
  method: string
  /** Path segments; a segment starting with ':' captures. */
  pattern: string[]
  handler: (ctx: {
    req: IncomingMessage
    res: ServerResponse
    params: Record<string, string>
    query: URLSearchParams
    user: User | null
  }) => Promise<void>
}

const routes: Route[] = []
const route = (
  method: string,
  path: string,
  handler: Route['handler'],
): void => {
  routes.push({ method, pattern: path.split('/').filter(Boolean), handler })
}

function match(route: Route, method: string, segments: string[]): Record<string, string> | null {
  if (route.method !== method) return null
  if (route.pattern.length !== segments.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < route.pattern.length; i += 1) {
    const expected = route.pattern[i]
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(segments[i])
    else if (expected !== segments[i]) return null
  }
  return params
}

/** Constant-time comparison so logout cannot be used to probe session ids. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/* ================================================================== */
/* Auth                                                                */
/* ================================================================== */

route('GET', '/api/health', async ({ res }) => {
  send(res, 200, { ok: true, time: new Date().toISOString() })
})

route('GET', '/api/auth/session', async ({ res, user }) => {
  send(res, 200, { user })
})

route('POST', '/api/auth/login', async ({ req, res }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')

  const found = await prisma.user.findUnique({ where: { email } })
  // One message for both failure modes, so the response cannot be used to
  // discover which email addresses exist.
  if (!found || !verifyPassword(password, found.passwordHash)) {
    throw new HttpError(401, 'Those credentials did not match any account.')
  }

  await startSession(res, found.id)
  send(res, 200, { user: toUser(found) })
})

route('POST', '/api/auth/logout', async ({ req, res }) => {
  const sessionId = parseCookies(req)[SESSION_COOKIE]
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined)
  }
  endSession(res)
  send(res, 200, { ok: true })
})

route('POST', '/api/auth/register', async ({ req, res }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()

  if (!email || !password || password.length < 8 || !firstName || !lastName) {
    throw new HttpError(400, 'Please complete every required field.')
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) throw new HttpError(409, 'An account with that email address already exists.')

  const id = createId('usr')
  const created = await prisma.user.create({
    data: {
      id,
      email,
      passwordHash: hashPassword(password),
      role: 'student',
      firstName,
      lastName,
    },
  })

  await prisma.studentProfile.create({
    data: {
      userId: id,
      phone: String(body.phone ?? '').trim(),
      municipality: String(body.municipality ?? '').trim(),
    },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: id,
      title: 'Welcome to Pampanga GrantConnect',
      body: 'Complete your student profile to improve your scholarship matches.',
      createdAt: new Date(),
      link: '/student/profile',
    },
  })

  await startSession(res, id)
  send(res, 201, { user: toUser(created) })
})

/**
 * The seeded sign-in credentials, so the login screen can offer them.
 * Remove this endpoint (and the buttons it feeds) before any real deployment.
 */
route('GET', '/api/accounts', async ({ res }) => {
  send(res, 200, [
    { role: 'student', label: 'Student', email: 'maria.santos@example.com', password: 'student123' },
    { role: 'admin', label: 'Administrator', email: 'admin@example.com', password: 'admin123' },
  ])
})

/* ================================================================== */
/* Scholarships                                                        */
/* ================================================================== */

function buildScholarshipWhere(query: URLSearchParams, includeDrafts: boolean) {
  const type = query.get('type') ?? 'all'
  const municipality = query.get('municipality') ?? 'all'
  const status = query.get('status') ?? 'all'
  const search = (query.get('query') ?? '').trim()

  const where: Record<string, unknown> = {}

  if (!includeDrafts) where.status = { not: 'draft' }
  if (includeDrafts && status !== 'all') where.status = status
  if (type !== 'all') where.type = type
  if (municipality !== 'all') where.municipality = municipality

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

  const [total, rows] = await Promise.all([
    prisma.scholarship.count({ where }),
    prisma.scholarship.findMany({
      where,
      orderBy: [{ deadline: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  send(res, 200, {
    items: rows.map(toScholarship),
    total,
    page: Math.min(page, totalPages),
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

route('GET', '/api/scholarships/:id', async ({ res, params }) => {
  const row = await prisma.scholarship.findUnique({ where: { id: params.id } })
  send(res, 200, row ? toScholarship(row) : null)
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

export const __routes = routes

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = createServer((req, res) => {
  void (async () => {
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
      const segments = url.pathname.split('/').filter(Boolean)
      const method = req.method ?? 'GET'

      for (const candidate of routes) {
        const params = match(candidate, method, segments)
        if (!params) continue

        const user = await currentUser(req)
        await candidate.handler({ req, res, params, query: url.searchParams, user })
        return
      }

      send(res, 404, { error: `No route for ${method} ${url.pathname}` })
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        send(res, error.status, { error: error.message })
        return
      }
      const message = error instanceof Error ? error.message : 'Unexpected server error.'
      console.error('[api]', message)
      send(res, 500, { error: 'Something went wrong on the server.' })
    }
  })()
})

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

export { server, safeEqual }
