import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import { prisma } from './db.ts'
import { createId, nextReference } from './ids.ts'
import { hashPassword, verifyPassword } from './passwords.ts'
import { HttpError } from './httpError.ts'
import { deleteUpload, readMultipart, readUpload, saveUpload, storedNameFor } from './uploads.ts'
import { googleIsAuthoritative, verifyGoogleIdToken } from './googleAuth.ts'
import {
  stringifyArray,
  stringifyObject,
  toAnnouncement,
  toApplication,
  toDocument,
  toGrant,
  toNotification,
  toProfile,
  toRegistration,
  toScholarship,
  toSettings,
  toUser,
} from './mappers.ts'
import { DOCUMENT_CLASSIFICATIONS, MUNICIPALITIES_ONLY } from '../src/lib/constants.ts'
import {
  classifyDocument,
  suggestDocumentTitle,
  validateDocumentFile,
} from '../src/lib/documents.ts'
import type { DocumentClassification, Role, User } from '../src/types/index.ts'

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

/**
 * Google OAuth client ids this server accepts tokens for.
 *
 * Comma-separated so a deployment can accept more than one client (for
 * example staging and production) without a code change. Server-side only:
 * a client id is not a secret, but keeping it here means the browser learns it
 * from the API rather than from a bundled `VITE_*` variable.
 */
function googleClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
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
  //
  // An account created through Google has an empty hash, and must never be
  // enterable with a password: verifyPassword would be asked to check against
  // nothing at all.
  if (!found || !found.passwordHash || !verifyPassword(password, found.passwordHash)) {
    throw new HttpError(401, 'Those credentials did not match any account.')
  }

  await startSession(res, found.id)
  send(res, 200, { user: toUser(found) })
})

/* ------------------------------------------------------------------ */
/* Google sign-in                                                      */
/* ------------------------------------------------------------------ */

/**
 * What the browser needs to start Google sign-in, or `configured: false` so
 * the button can stay hidden rather than fail when pressed.
 */
route('GET', '/api/auth/google/config', async ({ res }) => {
  const clientId = googleClientIds()[0] ?? ''
  send(res, 200, { configured: clientId !== '', clientId })
})

/**
 * Exchange a Google ID token for a session.
 *
 * Three account states, as Google's own guide sets out:
 *  - a returning Google account → sign in
 *  - an existing password account with the same address → refuse, and say so;
 *    linking an existing account must prove ownership of it, which is a
 *    separate flow and not something to shortcut here
 *  - no account → create one, marked incomplete, and send the student to the
 *    profile step Google cannot fill in
 *
 * A new account is created with `profileComplete: false`. Everything that
 * depends on a student profile — matching, applying, semester registration —
 * is therefore behind the completion step, rather than rendering half a
 * dashboard for an account that has only an email address.
 */
route('POST', '/api/auth/google', async ({ req, res }) => {
  const clientIds = googleClientIds()
  if (clientIds.length === 0) {
    throw new HttpError(503, 'Google sign-in has not been configured on this server.')
  }

  const body = await readJson(req)
  const credential = String(body.credential ?? '')
  if (!credential) throw new HttpError(400, 'No Google credential was supplied.')

  let identity
  try {
    identity = await verifyGoogleIdToken(credential, clientIds)
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'That Google sign-in could not be verified.'
    throw new HttpError(401, message)
  }

  // `sub` is the identity. Email is only used to find an account to refuse.
  const bySub = await prisma.user.findUnique({ where: { googleSub: identity.sub } })
  if (bySub) {
    await startSession(res, bySub.id)
    send(res, 200, { user: toUser(bySub) })
    return
  }

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } })
  if (byEmail) {
    // Deliberately not an automatic merge. Linking Google to an existing
    // password account without proving control of it would let anyone who
    // creates a Google account with that address take the account over.
    throw new HttpError(
      409,
      googleIsAuthoritative(identity)
        ? 'An account already exists for this email address. Sign in with your password, then connect Google from your profile.'
        : 'An account already exists for this email address. Sign in with your password to continue.',
    )
  }

  const id = createId('usr')
  const created = await prisma.user.create({
    data: {
      id,
      email: identity.email,
      // No password: this account can only be entered through Google.
      passwordHash: '',
      googleSub: identity.sub,
      role: 'student',
      firstName: identity.givenName || 'Student',
      lastName: identity.familyName || '',
      profileComplete: false,
    },
  })

  await prisma.studentProfile.create({ data: { userId: id } })

  await startSession(res, created.id)
  send(res, 201, { user: toUser(created), needsProfile: true })
})

/**
 * Complete the profile of a Google-created account.
 *
 * Separate from `PATCH /api/profile` because that route edits an existing
 * student's details, whereas this is the one-time step that turns a bare
 * Google account into a student record. It accepts the details Google cannot
 * supply and flips `profileComplete` so the route guard releases the student.
 */
route('POST', '/api/auth/google/complete', async ({ req, res, user }) => {
  const signedIn = requireUser(user)
  const body = await readJson(req)

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const municipality = String(body.municipality ?? '').trim()
  const phone = String(body.phone ?? '').trim()

  if (!firstName || !lastName) throw new HttpError(400, 'Enter your first and last name.')
  if (!MUNICIPALITIES_ONLY.includes(municipality)) {
    throw new HttpError(400, 'Choose the municipality you live in.')
  }
  if (phone && !/^[\d\s+()-]{7,20}$/.test(phone)) {
    throw new HttpError(400, 'Enter a valid contact number.')
  }

  const updated = await prisma.user.update({
    where: { id: signedIn.id },
    data: { firstName, lastName, profileComplete: true },
  })

  await prisma.studentProfile.upsert({
    where: { userId: signedIn.id },
    update: { municipality, phone },
    create: { userId: signedIn.id, municipality, phone },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: signedIn.id,
      title: 'Profile complete',
      body: 'Add your school, course and year level so listings can be matched to you.',
      createdAt: new Date(),
      link: '/student/profile',
    },
  })

  send(res, 200, { user: toUser(updated) })
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

  // The form offers a list; the server must not accept anything outside it, or
  // a hand-made request could store a municipality that does not exist.
  const municipality = String(body.municipality ?? '').trim()
  if (!MUNICIPALITIES_ONLY.includes(municipality)) {
    throw new HttpError(400, 'Choose the municipality you live in.')
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
      municipality,
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

/* Test credentials live in the client (src/lib/testAccounts.ts) rather than
   behind an endpoint, so the server never serves passwords. */

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

route('GET', '/api/scholarships/:id', async ({ res, params }) => {
  const row = await prisma.scholarship.findUnique({ where: { id: params.id } })
  send(res, 200, row ? toScholarship(row) : null)
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

  return {
    name: text('name'),
    provider: text('provider'),
    type: text('type'),
    municipality: text('municipality'),
    educationLevels: list('educationLevels') ? stringifyArray(body.educationLevels as string[]) : undefined,
    description: text('description'),
    benefits: list('benefits') ? stringifyArray(body.benefits as string[]) : undefined,
    eligibility: list('eligibility') ? stringifyArray(body.eligibility as string[]) : undefined,
    requirements: list('requirements') ? stringifyArray(body.requirements as string[]) : undefined,
    deadline: text('deadline'),
    applicationMode: text('applicationMode'),
    externalUrl: body.externalUrl === undefined ? undefined : (text('externalUrl') || null),
    contact: body.contact ? stringifyObject(body.contact) : undefined,
    instructions: list('instructions') ? stringifyArray(body.instructions as string[]) : undefined,
    status: text('status'),
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

  // Registration is for existing grantees only.
  const grantCount = await prisma.grant.count({ where: { studentId: student.id } })
  if (grantCount === 0) {
    throw new HttpError(403, 'Semester registration is only available to students with a confirmed grant.')
  }

  const duplicate = await prisma.semesterRegistration.findFirst({
    where: { studentId: student.id, academicYear, semester },
  })
  if (duplicate) {
    throw new HttpError(409, `You already have a registration for ${semester}, AY ${academicYear}.`)
  }

  const existingRefs = (
    await prisma.semesterRegistration.findMany({ select: { referenceNo: true } })
  ).map((row) => row.referenceNo)

  const now = new Date()
  const created = await prisma.semesterRegistration.create({
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

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: student.id,
      title: 'Semester registration submitted',
      body: `Registration ${created.referenceNo} is pending verification.`,
      createdAt: now,
      link: '/student/semester-registration',
    },
  })

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

  const existing = await prisma.semesterRegistration.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That registration no longer exists.')

  const now = new Date()
  const updated = await prisma.semesterRegistration.update({
    where: { id: params.id },
    data: {
      status,
      remarks: remarks || existing.remarks,
      verifiedBy: `${admin.firstName} ${admin.lastName}`,
      updatedAt: now,
    },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: updated.studentId,
      title: `Semester registration ${status}`,
      body: `Registration ${updated.referenceNo} is now marked as ${status}.`,
      createdAt: now,
      link: '/student/semester-registration',
    },
  })

  send(res, 200, toRegistration(updated))
})

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
  const result = await prisma.grant.aggregate({ _sum: { amount: true } })
  send(res, 200, result._sum.amount ?? 0)
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
      amount,
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
      amount,
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
      amount: body.amount === undefined ? existing.amount : Number(body.amount),
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

/* ================================================================== */
/* Announcements                                                       */
/* ================================================================== */

route('GET', '/api/announcements', async ({ res, query, user }) => {
  const audience = query.get('audience')
  const where: Record<string, unknown> = {}

  if (audience === 'students') where.audience = { in: ['all', 'students'] }
  else if (audience === 'admins') where.audience = { in: ['all', 'admins'] }
  else if (!user) where.audience = 'all'

  const rows = await prisma.announcement.findMany({
    where: where as never,
    orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
  })

  send(res, 200, rows.map(toAnnouncement))
})

route('POST', '/api/announcements', async ({ req, res, user }) => {
  const admin = requireRole(user, 'admin')
  const body = await readJson(req)
  const title = String(body.title ?? '').trim()
  const text = String(body.body ?? '').trim()

  if (title.length < 5) throw new HttpError(400, 'Give the announcement a longer title.')
  if (text.length < 10) throw new HttpError(400, 'Give the announcement a longer body.')

  const created = await prisma.announcement.create({
    data: {
      id: createId('ann'),
      title,
      body: text,
      audience: String(body.audience ?? 'all'),
      pinned: Boolean(body.pinned),
      publishedAt: new Date(),
      author: `${admin.firstName} ${admin.lastName}`,
    },
  })

  send(res, 201, toAnnouncement(created))
})

route('PATCH', '/api/announcements/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That announcement no longer exists.')

  const title = body.title === undefined ? existing.title : String(body.title).trim()
  const text = body.body === undefined ? existing.body : String(body.body).trim()
  if (title.length < 5) throw new HttpError(400, 'Give the announcement a longer title.')
  if (text.length < 10) throw new HttpError(400, 'Give the announcement a longer body.')

  const updated = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      title,
      body: text,
      audience: body.audience ? String(body.audience) : existing.audience,
      pinned: body.pinned === undefined ? existing.pinned : Boolean(body.pinned),
    },
  })

  send(res, 200, toAnnouncement(updated))
})

route('DELETE', '/api/announcements/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.announcement.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That announcement no longer exists.')
  await prisma.announcement.delete({ where: { id: params.id } })
  send(res, 200, { ok: true })
})

/* ================================================================== */
/* Notifications                                                       */
/* ================================================================== */

route('GET', '/api/notifications', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const rows = await prisma.notification.findMany({
    where: { OR: [{ userId: signedIn.id }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  send(res, 200, rows.map(toNotification))
})

route('GET', '/api/notifications/unread-count', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const count = await prisma.notification.count({
    where: { OR: [{ userId: signedIn.id }, { userId: null }], read: false },
  })
  send(res, 200, count)
})

route('POST', '/api/notifications/read-all', async ({ res, user }) => {
  const signedIn = requireUser(user)
  await prisma.notification.updateMany({
    where: { OR: [{ userId: signedIn.id }, { userId: null }] },
    data: { read: true },
  })
  send(res, 200, { ok: true })
})

route('POST', '/api/notifications/:id/read', async ({ res, params, user }) => {
  requireUser(user)
  await prisma.notification.update({ where: { id: params.id }, data: { read: true } }).catch(() => undefined)
  send(res, 200, { ok: true })
})

/* ================================================================== */
/* Students (administrator)                                            */
/* ================================================================== */

route('GET', '/api/students', async ({ res, query, user }) => {
  requireRole(user, 'admin')

  const search = (query.get('query') ?? '').trim()
  const municipality = query.get('municipality') ?? 'all'
  const page = Math.max(1, Number(query.get('page') ?? 1))
  const pageSize = Math.min(200, Math.max(1, Number(query.get('pageSize') ?? 20)))

  const where: Record<string, unknown> = { role: 'student' }
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ]
  }
  if (municipality !== 'all') where.profile = { municipality }

  const [total, users] = await Promise.all([
    prisma.user.count({ where: where as never }),
    prisma.user.findMany({
      where: where as never,
      include: { profile: true },
      orderBy: { lastName: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const ids = users.map((row) => row.id)
  const [applicationCounts, grantCounts] = await Promise.all([
    prisma.application.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
    prisma.grant.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
  ])
  const appMap = new Map(applicationCounts.map((row) => [row.studentId, row._count._all]))
  const grantMap = new Map(grantCounts.map((row) => [row.studentId, row._count._all]))

  send(res, 200, {
    items: users.map((row) => ({
      user: toUser(row),
      profile: row.profile ? toProfile(row.profile) : null,
      applicationCount: appMap.get(row.id) ?? 0,
      grantCount: grantMap.get(row.id) ?? 0,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})

route('GET', '/api/students/count', async ({ res, user }) => {
  requireRole(user, 'admin')
  send(res, 200, await prisma.user.count({ where: { role: 'student' } }))
})

route('GET', '/api/students/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const row = await prisma.user.findFirst({
    where: { id: params.id, role: 'student' },
    include: { profile: true },
  })
  if (!row) {
    send(res, 200, null)
    return
  }

  const [applicationCount, grantCount] = await Promise.all([
    prisma.application.count({ where: { studentId: row.id } }),
    prisma.grant.count({ where: { studentId: row.id } }),
  ])

  send(res, 200, {
    user: toUser(row),
    profile: row.profile ? toProfile(row.profile) : null,
    applicationCount,
    grantCount,
  })
})

route('PATCH', '/api/students/:id', async ({ req, res, params, user }) => {
  requireRole(user, 'admin')
  const body = await readJson(req)
  const existing = await prisma.user.findFirst({ where: { id: params.id, role: 'student' } })
  if (!existing) throw new HttpError(404, 'That student record no longer exists.')

  const email = body.email === undefined ? existing.email : String(body.email).trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
  const clash = await prisma.user.findFirst({ where: { email, NOT: { id: existing.id } } })
  if (clash) throw new HttpError(409, 'Another account already uses that email address.')

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      firstName: body.firstName ? String(body.firstName).trim() : existing.firstName,
      lastName: body.lastName ? String(body.lastName).trim() : existing.lastName,
      email,
    },
  })

  send(res, 200, toUser(updated))
})

route('DELETE', '/api/students/:id', async ({ res, params, user }) => {
  requireRole(user, 'admin')
  const existing = await prisma.user.findFirst({ where: { id: params.id, role: 'student' } })
  if (!existing) throw new HttpError(404, 'That student record no longer exists.')
  // Related rows cascade via the schema's onDelete: Cascade.
  await prisma.user.delete({ where: { id: existing.id } })
  send(res, 200, { ok: true })
})

/* ================================================================== */
/* Documents                                                           */
/* ================================================================== */

/**
 * Build the filter an administrator asked for, and enforce the ownership rule
 * at the same time: a student's list is pinned to their own id, so no query
 * string can widen it.
 */
function documentWhere(query: URLSearchParams, user: User): Record<string, unknown> {
  const where: Record<string, unknown> = {}

  if (user.role !== 'admin') where.studentId = user.id
  else if (query.get('studentId')) where.studentId = query.get('studentId')

  const classification = query.get('classification')
  if (classification && classification !== 'all') where.classification = classification

  const status = query.get('status')
  if (status && status !== 'all') where.status = status

  const applicationId = query.get('applicationId')
  if (applicationId) where.applicationId = applicationId

  const search = (query.get('query') ?? '').trim()
  if (search) {
    where.OR = [{ title: { contains: search } }, { fileName: { contains: search } }]
  }

  return where
}

route('GET', '/api/documents', async ({ res, query, user }) => {
  const signedIn = requireUser(user)
  const rows = await prisma.studentDocument.findMany({
    where: documentWhere(query, signedIn) as never,
    orderBy: { uploadedAt: 'desc' },
  })
  send(res, 200, rows.map(toDocument))
})

/** As above, with the owner attached. Administrator screens only. */
route('GET', '/api/documents/records', async ({ res, query, user }) => {
  const signedIn = requireRole(user, 'admin')
  const rows = await prisma.studentDocument.findMany({
    where: documentWhere(query, signedIn) as never,
    include: { student: true },
    orderBy: { uploadedAt: 'desc' },
  })
  send(
    res,
    200,
    rows.map((row) => ({ document: toDocument(row), student: toUser(row.student) })),
  )
})

route('POST', '/api/documents', async ({ req, res, user }) => {
  const signedIn = requireRole(user, 'student')

  const { fields, files } = await readMultipart(req)
  const file = files[0]
  if (!file) throw new HttpError(400, 'Choose a file to upload.')

  // Checked in the browser too, so the student hears about it immediately —
  // but a request can always be crafted by hand, so it is checked again here.
  const problem = validateDocumentFile({
    name: file.fileName,
    type: file.mimeType,
    size: file.data.length,
  })
  if (problem) throw new HttpError(400, problem)

  // An unrecognised or absent classification falls back to the same guess the
  // browser was shown, so the two can only ever agree.
  const requested = fields.classification
  const classification = DOCUMENT_CLASSIFICATIONS.some((option) => option.value === requested)
    ? (requested as DocumentClassification)
    : classifyDocument(file.fileName, file.mimeType)

  const applicationId = (fields.applicationId ?? '').trim() || null
  if (applicationId) {
    const owned = await prisma.application.findFirst({
      where: { id: applicationId, studentId: signedIn.id },
    })
    if (!owned) throw new HttpError(404, 'That application no longer exists.')
  }

  const id = createId('doc')
  const storedName = storedNameFor(id, file.mimeType)
  await saveUpload(storedName, file.data)

  try {
    const row = await prisma.studentDocument.create({
      data: {
        id,
        studentId: signedIn.id,
        applicationId,
        title: (fields.title ?? '').trim() || suggestDocumentTitle(file.fileName),
        classification,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.data.length,
        storedName,
        status: 'submitted',
      },
    })
    send(res, 201, toDocument(row))
  } catch (error) {
    // The bytes are written before the row, so a failure here would otherwise
    // leave a file on disk that nothing points at.
    await deleteUpload(storedName)
    throw error
  }
})

/** Strip anything that could break out of a Content-Disposition header. */
function safeHeaderFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').slice(0, 120).trim()
  return cleaned || 'document'
}

route('GET', '/api/documents/:id/file', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!row) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, row.studentId)

  const data = await readUpload(row.storedName)
  if (!data) throw new HttpError(410, 'The stored copy of this file is no longer available.')

  res.writeHead(200, {
    'Content-Type': row.mimeType,
    'Content-Length': data.length,
    // Always an attachment: an uploaded file is untrusted content and must
    // never be rendered inline on this origin.
    'Content-Disposition': `attachment; filename="${safeHeaderFileName(row.fileName)}"`,
    'Cache-Control': 'private, no-store',
  })
  res.end(data)
})

route('PATCH', '/api/documents/:id', async ({ req, res, params, user }) => {
  const signedIn = requireUser(user)
  const body = await readJson(req)
  const existing = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, existing.studentId)

  const update: Record<string, unknown> = {}

  // The student may correct how their own file is filed. Deciding whether it is
  // acceptable is a different act, and stays with the scholarship office —
  // otherwise a student could verify their own document.
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw new HttpError(400, 'Give the document a title.')
    update.title = title
  }

  if (body.classification !== undefined) {
    const next = String(body.classification)
    if (!DOCUMENT_CLASSIFICATIONS.some((option) => option.value === next)) {
      throw new HttpError(400, 'That is not a valid classification.')
    }
    update.classification = next
  }

  if (body.status !== undefined || body.note !== undefined) {
    requireRole(signedIn, 'admin')
    const status = body.status === undefined ? existing.status : String(body.status)
    if (!['submitted', 'verified', 'rejected'].includes(status)) {
      throw new HttpError(400, 'That is not a valid decision.')
    }
    const note = body.note === undefined ? (existing.note ?? '') : String(body.note).trim()
    if (status === 'rejected' && !note) {
      throw new HttpError(400, 'Give a reason for rejecting the document.')
    }
    update.status = status
    update.note = note || null
  }

  if (Object.keys(update).length === 0) throw new HttpError(400, 'Nothing to update.')

  const updated = await prisma.studentDocument.update({
    where: { id: existing.id },
    data: update as never,
  })
  send(res, 200, toDocument(updated))
})

route('DELETE', '/api/documents/:id', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const existing = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, existing.studentId)

  // A verified document is evidence that a decision was made on it. A student
  // removing one after the fact would quietly change the record behind that
  // decision, so it takes an administrator.
  if (signedIn.role !== 'admin' && existing.status === 'verified') {
    throw new HttpError(
      409,
      'A verified document cannot be removed. Ask the scholarship office if it is wrong.',
    )
  }

  await prisma.studentDocument.delete({ where: { id: existing.id } })
  await deleteUpload(existing.storedName)
  send(res, 200, { ok: true })
})

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

/* ================================================================== */
/* Reports                                                             */
/* ================================================================== */

route('GET', '/api/reports', async ({ res, user }) => {
  requireRole(user, 'admin')

  const [scholarships, applications, registrations, grants, students] = await Promise.all([
    prisma.scholarship.findMany({ select: { id: true, status: true } }),
    prisma.application.findMany({ select: { id: true, status: true, scholarshipId: true, submittedAt: true } }),
    prisma.semesterRegistration.findMany({ select: { id: true, status: true } }),
    prisma.grant.findMany({ select: { id: true, status: true, amount: true, studentId: true } }),
    prisma.user.findMany({ where: { role: 'student' }, select: { id: true } }),
  ])

  const profiles = await prisma.studentProfile.findMany({ select: { userId: true, municipality: true } })
  const municipalityByStudent = new Map(profiles.map((row) => [row.userId, row.municipality || 'Not provided']))
  const scholarshipNames = new Map(
    (await prisma.scholarship.findMany({ select: { id: true, name: true } })).map((row) => [row.id, row.name]),
  )

  const tally = <T>(rows: T[], key: (row: T) => string) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const k = key(row)
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  const byStatus = tally(applications, (row) => row.status)
  const byScholarship = tally(applications, (row) => row.scholarshipId)
  const byMonth = tally(applications, (row) => row.submittedAt.toISOString().slice(0, 7))
  const registrationsByStatus = tally(registrations, (row) => row.status)

  const grantsByMunicipality = grants.reduce<Record<string, { count: number; amount: number }>>((acc, row) => {
    const key = municipalityByStudent.get(row.studentId) ?? 'Not provided'
    const current = acc[key] ?? { count: 0, amount: 0 }
    acc[key] = { count: current.count + 1, amount: current.amount + row.amount }
    return acc
  }, {})

  const toRows = (record: Record<string, number>) =>
    Object.entries(record)
      .map(([label, count]) => ({ label: label.replace(/-/g, ' '), count, amount: 0 }))
      .sort((a, b) => b.count - a.count)

  send(res, 200, {
    overview: {
      totalScholarships: scholarships.length,
      openScholarships: scholarships.filter((row) => row.status === 'open').length,
      draftScholarships: scholarships.filter((row) => row.status === 'draft').length,
      totalStudents: students.length,
      totalApplications: applications.length,
      pendingApplications: applications.filter((row) =>
        ['submitted', 'under-review', 'needs-info'].includes(row.status),
      ).length,
      totalRegistrations: registrations.length,
      pendingRegistrations: registrations.filter((row) => row.status === 'pending').length,
      totalGrants: grants.length,
      activeGrants: grants.filter((row) => row.status === 'active').length,
      totalAmountReleased: grants.reduce((sum, row) => sum + row.amount, 0),
    },
    byStatus: toRows(byStatus),
    byScholarship: Object.entries(byScholarship)
      .map(([id, count]) => ({ label: scholarshipNames.get(id) ?? 'Removed listing', count, amount: 0 }))
      .sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth)
      .map(([label, count]) => ({ label, count, amount: 0 }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    registrationsByStatus: toRows(registrationsByStatus),
    grantsByMunicipality: Object.entries(grantsByMunicipality)
      .map(([label, value]) => ({ label, count: value.count, amount: value.amount }))
      .sort((a, b) => b.amount - a.amount),
  })
})

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

      // Collect every match, then prefer the one with the fewest parameter
      // segments. Without this, registration order decides, and a static path
      // such as /api/applications/counts gets swallowed by /api/applications/:id.
      const candidates: { params: Record<string, string>; score: number; handler: Route['handler'] }[] = []

      for (const candidate of routes) {
        const params = match(candidate, method, segments)
        if (params) {
          candidates.push({ params, score: Object.keys(params).length, handler: candidate.handler })
        }
      }

      if (candidates.length === 0) {
        send(res, 404, { error: `No route for ${method} ${url.pathname}` })
        return
      }

      candidates.sort((a, b) => a.score - b.score)
      const chosen = candidates[0]

      const user = await currentUser(req)
      await chosen.handler({ req, res, params: chosen.params, query: url.searchParams, user })
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
