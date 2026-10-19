import { DOCUMENT_CLASSIFICATIONS, MUNICIPALITIES } from './constants.ts'
import { suggestDocumentTitle, validateDocumentFile } from './documents.ts'
import { daysUntil } from './format.ts'
import { IS_REMOTE, httpApi } from './httpApi.ts'
import { createId, createReferenceNumber } from './id.ts'
import { STORAGE_KEYS, clearAll, readJson, writeJson } from './storage.ts'
import { TEST_ACCOUNTS } from './testAccounts.ts'
import { DB_VERSION, createSeedDatabase, type DemoDatabase } from '../data/schema.ts'
import type {
  Announcement,
  AnnouncementAudience,
  Application,
  ApplicationFilters,
  ApplicationStatus,
  CompleteProfileInput,
  DocumentClassification,
  DocumentFilters,
  DocumentRecord,
  DocumentStatus,
  DocumentUpload,
  Grant,
  GrantFilters,
  LoginInput,
  Notification,
  OtpPurpose,
  OtpRequestResult,
  Paginated,
  PlatformSettings,
  RegisterInput,
  RegistrationFilters,
  RegistrationStatus,
  Role,
  Scholarship,
  ScholarshipFilters,
  ScholarshipStatus,
  SemesterRegistration,
  StudentDocument,
  StudentProfile,
  StudentRecord,
  User,
} from '../types/index.ts'

/**
 * Data-access layer.
 *
 * Every screen goes through this module; nothing reads the seed records
 * directly. That keeps a single seam for a backend: replace the bodies below
 * with `fetch` calls to your API and the UI needs no changes.
 *
 * Until a backend is connected, the implementation is backed by localStorage
 * so the interface can be exercised end to end.
 */
const LATENCY_MS = 180

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

/* ------------------------------------------------------------------ */
/* Store lifecycle                                                     */
/* ------------------------------------------------------------------ */

function loadDatabase(): DemoDatabase {
  const stored = readJson<DemoDatabase | null>(STORAGE_KEYS.database, null)
  if (stored && stored.version === DB_VERSION) {
    return stored
  }
  const seeded = createSeedDatabase()
  writeJson(STORAGE_KEYS.database, seeded)
  return seeded
}

let db: DemoDatabase = loadDatabase()

function persist(): void {
  writeJson(STORAGE_KEYS.database, db)
}

/** Restore the record set the application ships with. */
export async function resetDemoData(): Promise<void> {
  await delay()
  db = createSeedDatabase()
  persist()
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: clone(items.slice(start, start + pageSize)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  }
}

function matchesQuery(haystack: string[], needle: string): boolean {
  if (!needle.trim()) return true
  const terms = needle.toLowerCase().split(/\s+/).filter(Boolean)
  const hay = haystack.join(' ').toLowerCase()
  return terms.every((term) => hay.includes(term))
}

function sortByDateDesc<T>(items: T[], pick: (item: T) => string): T[] {
  return [...items].sort((a, b) => new Date(pick(b)).getTime() - new Date(pick(a)).getTime())
}

/**
 * Generate a human-facing reference number that does not collide with a record
 * that already exists.
 *
 * The demo sequence counters live in memory and reset on every page load, so
 * without this check a newly created record could reuse a reference that a
 * seeded record already holds.
 */
function nextReference(kind: string, existing: string[]): string {
  let candidate = createReferenceNumber(kind)
  let attempts = 0
  while (existing.includes(candidate) && attempts < 1000) {
    candidate = createReferenceNumber(kind)
    attempts += 1
  }
  return candidate
}

function countBy<T>(items: T[], pick: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = pick(item)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const localAuthApi = {
  /** Synchronous session read, used to hydrate the auth context on boot. */
  getCurrentUserSync(): User | null {
    if (!db.sessionUserId) return null
    const user = db.users.find((candidate) => candidate.id === db.sessionUserId)
    return user ? clone(user) : null
  },

  /** Same answer as `getCurrentUserSync`, for callers that can only be async. */
  async getSession(): Promise<User | null> {
    return localAuthApi.getCurrentUserSync()
  },

  async login(input: LoginInput): Promise<User> {
    await delay()
    const email = input.email.trim().toLowerCase()
    const credential = db.credentials.find((entry) => entry.email.toLowerCase() === email)
    // DEMO ONLY. A real implementation must verify credentials server-side.
    if (!credential || credential.password !== input.password) {
      throw new Error('Those credentials did not match any account.')
    }
    const user = db.users.find((candidate) => candidate.id === credential.userId)
    if (!user) throw new Error('That account is no longer available.')
    db.sessionUserId = user.id
    persist()
    return clone(user)
  },

  async register(input: RegisterInput): Promise<User> {
    await delay()
    const email = input.email.trim().toLowerCase()
    if (db.users.some((candidate) => candidate.email.toLowerCase() === email)) {
      throw new Error('An account with that email address already exists.')
    }
    const user: User = {
      id: createId('usr'),
      email: input.email.trim(),
      role: 'student',
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      createdAt: new Date().toISOString(),
      profileComplete: true,
      hasPassword: true,
      usesGoogle: false,
      // The browser-storage build has no mail, so nothing to confirm.
      emailVerified: true,
    }
    db.users.push(user)
    // The password is held in plain text because there is no backend yet.
    // Replace with server-side hashing and verification before deploying.
    db.credentials.push({ userId: user.id, email: user.email, password: input.password })
    db.profiles.push({
      userId: user.id,
      studentNumber: '',
      phone: input.phone.trim(),
      municipality: input.municipality,
      barangay: input.barangay.trim(),
      address: (input.address ?? '').trim(),
      birthDate: input.birthDate,
      educationLevel: input.educationLevel,
      school: input.school.trim(),
      course: input.course.trim(),
      yearLevel: input.yearLevel,
      gwa: input.gwa ?? null,
      householdIncome: input.householdIncome ?? null,
      guardianName: (input.guardianName ?? '').trim(),
      guardianContact: (input.guardianContact ?? '').trim(),
      updatedAt: new Date().toISOString(),
    })
    db.notifications.push({
      id: createId('ntf'),
      userId: user.id,
      title: 'Welcome to Scholar',
      body: 'Complete your student profile to improve your scholarship matches.',
      createdAt: new Date().toISOString(),
      read: false,
      link: '/student/profile',
    })
    db.sessionUserId = user.id
    persist()
    return clone(user)
  },

  async logout(): Promise<void> {
    await delay(80)
    db.sessionUserId = null
    persist()
  },

  async changePassword(currentPassword: string, nextPassword: string): Promise<void> {
    await delay()
    const credential = db.credentials.find((entry) => entry.userId === db.sessionUserId)
    if (!credential) throw new Error('You need to be signed in to change your password.')
    if (credential.password !== currentPassword) throw new Error('The current password is incorrect.')
    credential.password = nextPassword
    persist()
  },

  /**
   * Google sign-in is not available in the browser-storage build.
   *
   * It cannot be faked: verifying a Google token needs the client secret and
   * Google's public keys, and neither belongs in the browser. Reporting
   * `configured: false` hides the button, so the option is never offered and
   * then broken.
   */
  async googleConfig(): Promise<{ configured: boolean; clientId: string }> {
    await delay(80)
    return { configured: false, clientId: '' }
  },

  async googleSignIn(_credential: string): Promise<{ user: User; needsProfile: boolean }> {
    throw new Error(
      'Google sign-in needs the API server. Start it with "npm run server" and set GOOGLE_CLIENT_ID.',
    )
  },

  async completeGoogleProfile(_input: CompleteProfileInput): Promise<User> {
    throw new Error('Google sign-in needs the API server.')
  },

  /**
   * No mail exists in the browser-storage build, so a code could be generated
   * but never delivered. Reporting `delivery: 'none'` keeps the interface
   * honest instead of implying a message was sent.
   */
  async requestCode(
    _email: string,
    _purpose: OtpPurpose,
  ): Promise<OtpRequestResult> {
    await delay()
    return {
      submitted: true,
      expiresInSeconds: 600,
      resendAfterSeconds: 60,
      delivery: 'none',
    }
  },

  async verifyEmailCode(_email: string, _code: string): Promise<User | null> {
    throw new Error(
      'Email verification needs the API server. Start it with "npm run server".',
    )
  },

  async resetPassword(_input: {
    email: string
    code: string
    password: string
  }): Promise<void> {
    throw new Error(
      'Password reset needs the API server. Start it with "npm run server".',
    )
  },
}

/* ------------------------------------------------------------------ */
/* Scholarships                                                        */
/* ------------------------------------------------------------------ */

function filterScholarships(filters: ScholarshipFilters): Scholarship[] {
  const {
    query = '',
    type = 'all',
    municipality = 'all',
    educationLevel = 'all',
    status = 'all',
    deadlineWithinDays = null,
    featuredOnly = false,
    sort = 'deadline',
    // Draft listings are administrator-only; public screens never receive them.
    includeDrafts = false,
  } = filters

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const results = db.scholarships.filter((item) => {
    if (!includeDrafts && item.status === 'draft') return false
    if (type !== 'all' && item.type !== type) return false
    if (municipality !== 'all' && item.municipality !== municipality) return false
    if (educationLevel !== 'all' && !item.educationLevels.includes(educationLevel)) return false
    if (status !== 'all' && item.status !== status) return false
    if (featuredOnly && !item.featured) return false
    if (deadlineWithinDays !== null) {
      const days = (new Date(item.deadline).getTime() - today.getTime()) / 86_400_000
      if (days < 0 || days > deadlineWithinDays) return false
    }
    return matchesQuery(
      [item.name, item.provider, item.description, item.municipality, item.tags.join(' ')],
      query,
    )
  })

  const sorted = [...results]
  if (sort === 'name') {
    sorted.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sort === 'newest') {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else {
    // Soonest deadline first, but listings that are closed or already past
    // their deadline sink to the bottom instead of leading the list.
    const rank = (item: Scholarship): number => {
      const days = daysUntil(item.deadline)
      return item.status === 'open' && (days === null || days >= 0) ? 0 : 1
    }
    sorted.sort(
      (a, b) =>
        rank(a) - rank(b) || new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    )
  }
  return sorted
}

export interface ScholarshipInput {
  name: string
  provider: string
  type: Scholarship['type']
  municipality: string
  educationLevels: Scholarship['educationLevels']
  description: string
  benefits: string[]
  eligibility: string[]
  requirements: string[]
  deadline: string
  applicationMode: Scholarship['applicationMode']
  externalUrl?: string
  contact: Scholarship['contact']
  instructions: string[]
  status: ScholarshipStatus
  featured: boolean
  tags: string[]
}

const localScholarshipsApi = {
  async list(
    filters: ScholarshipFilters = {},
    page = 1,
    pageSize = 9,
  ): Promise<Paginated<Scholarship>> {
    await delay()
    return paginate(filterScholarships(filters), page, pageSize)
  },

  async listAll(filters: ScholarshipFilters = {}): Promise<Scholarship[]> {
    await delay()
    return clone(filterScholarships(filters))
  },

  async get(id: string): Promise<Scholarship | null> {
    await delay()
    const found = db.scholarships.find((item) => item.id === id)
    return found ? clone(found) : null
  },

  async create(input: ScholarshipInput): Promise<Scholarship> {
    await delay()
    const now = new Date().toISOString()
    const scholarship: Scholarship = {
      ...input,
      id: createId('sch'),
      createdAt: now,
      updatedAt: now,
    }
    db.scholarships.unshift(scholarship)
    persist()
    return clone(scholarship)
  },

  async update(id: string, patch: Partial<ScholarshipInput>): Promise<Scholarship> {
    await delay()
    const index = db.scholarships.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That scholarship listing no longer exists.')
    const updated: Scholarship = {
      ...db.scholarships[index],
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    db.scholarships[index] = updated
    persist()
    return clone(updated)
  },

  async setStatus(id: string, status: ScholarshipStatus): Promise<Scholarship> {
    return localScholarshipsApi.update(id, { status })
  },

  async remove(id: string): Promise<void> {
    await delay()
    const index = db.scholarships.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That scholarship listing no longer exists.')
    db.scholarships.splice(index, 1)
    // Clean up bookmarks that point at the removed listing.
    db.saved = db.saved.filter((entry) => entry.scholarshipId !== id)
    persist()
  },

  async featured(limit = 3): Promise<Scholarship[]> {
    await delay()
    const open = db.scholarships.filter((item) => item.status === 'open' && item.featured)
    return clone(open.slice(0, limit))
  },

  async closingSoon(limit = 4, withinDays = 21): Promise<Scholarship[]> {
    await delay()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const soon = db.scholarships
      .filter((item) => item.status === 'open')
      .filter((item) => {
        const days = (new Date(item.deadline).getTime() - today.getTime()) / 86_400_000
        return days >= 0 && days <= withinDays
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    return clone(soon.slice(0, limit))
  },

  async countsByType(): Promise<{ type: Scholarship['type']; count: number }[]> {
    await delay()
    const counts = countBy(
      db.scholarships.filter((item) => item.status !== 'draft'),
      (item) => item.type,
    )
    return Object.entries(counts).map(([type, count]) => ({
      type: type as Scholarship['type'],
      count,
    }))
  },

  municipalities(): string[] {
    return [...MUNICIPALITIES]
  },

  /** Options for administrator pickers, including drafts. */
  async options(): Promise<{ id: string; name: string; provider: string }[]> {
    await delay()
    return clone(
      [...db.scholarships]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({ id: item.id, name: item.name, provider: item.provider })),
    )
  },
}

/* ------------------------------------------------------------------ */
/* Saved scholarships (bookmarks)                                      */
/* ------------------------------------------------------------------ */

const localSavedApi = {
  async ids(studentId: string): Promise<string[]> {
    await delay()
    return db.saved.filter((entry) => entry.studentId === studentId).map((e) => e.scholarshipId)
  },

  async listForStudent(studentId: string): Promise<Scholarship[]> {
    await delay()
    const entries = db.saved
      .filter((entry) => entry.studentId === studentId)
      .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
    const items = entries
      .map((entry) => db.scholarships.find((item) => item.id === entry.scholarshipId))
      .filter((item): item is Scholarship => Boolean(item))
    return clone(items)
  },

  /** Toggle a bookmark. Returns the resulting saved state. */
  async toggle(studentId: string, scholarshipId: string): Promise<boolean> {
    await delay(90)
    const index = db.saved.findIndex(
      (entry) => entry.studentId === studentId && entry.scholarshipId === scholarshipId,
    )
    if (index >= 0) {
      db.saved.splice(index, 1)
      persist()
      return false
    }
    db.saved.push({ studentId, scholarshipId, savedAt: new Date().toISOString() })
    persist()
    return true
  },
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

export interface ApplicationInput {
  scholarshipId: string
  motivation: string
  documentNames: string[]
  responses: { label: string; value: string }[]
}

function applicationStatusLabel(status: ApplicationStatus): string {
  return status.replace(/-/g, ' ')
}

const localApplicationsApi = {
  async listForStudent(studentId: string): Promise<Application[]> {
    await delay()
    const mine = db.applications.filter((item) => item.studentId === studentId)
    return clone(sortByDateDesc(mine, (item) => item.submittedAt))
  },

  async list(filters: ApplicationFilters = {}, page = 1, pageSize = 10): Promise<Paginated<Application>> {
    await delay()
    const { query = '', status = 'all', scholarshipId = 'all', studentId } = filters
    const filtered = db.applications.filter((item) => {
      if (studentId && item.studentId !== studentId) return false
      if (status !== 'all' && item.status !== status) return false
      if (scholarshipId !== 'all' && item.scholarshipId !== scholarshipId) return false
      const scholarship = db.scholarships.find((s) => s.id === item.scholarshipId)
      const student = db.users.find((u) => u.id === item.studentId)
      return matchesQuery(
        [
          item.referenceNo,
          scholarship?.name ?? '',
          scholarship?.provider ?? '',
          student ? `${student.firstName} ${student.lastName}` : '',
        ],
        query,
      )
    })
    const sorted = sortByDateDesc(filtered, (item) => item.submittedAt)
    return paginate(sorted, page, pageSize)
  },

  /**
   * Fetch one application.
   * Pass `studentId` to enforce ownership — this is the check that keeps a
   * student from opening another student's record (business rule 7). In a real
   * deployment the same check must happen on the server.
   */
  async get(id: string, studentId?: string): Promise<Application | null> {
    await delay()
    const found = db.applications.find((item) => item.id === id)
    if (!found) return null
    if (studentId && found.studentId !== studentId) return null
    return clone(found)
  },

  async findForStudentAndScholarship(
    studentId: string,
    scholarshipId: string,
  ): Promise<Application | null> {
    await delay()
    const found = db.applications.find(
      (item) => item.studentId === studentId && item.scholarshipId === scholarshipId,
    )
    return found ? clone(found) : null
  },

  async create(studentId: string, input: ApplicationInput, asDraft: boolean): Promise<Application> {
    await delay()
    const existing = db.applications.find(
      (item) => item.studentId === studentId && item.scholarshipId === input.scholarshipId,
    )
    if (existing && existing.status !== 'draft') {
      throw new Error('You already have an application for this scholarship.')
    }
    const now = new Date().toISOString()
    const application: Application = {
      id: createId('app'),
      referenceNo: nextReference(
        'APP',
        db.applications.map((item) => item.referenceNo),
      ),
      scholarshipId: input.scholarshipId,
      studentId,
      status: asDraft ? 'draft' : 'submitted',
      submittedAt: now,
      updatedAt: now,
      motivation: input.motivation,
      responses: input.responses,
      documentNames: input.documentNames,
      timeline: asDraft
        ? []
        : [{ status: 'submitted', at: now, note: 'Application submitted through the portal.' }],
    }
    db.applications.unshift(application)
    if (!asDraft) {
      db.notifications.push({
        id: createId('ntf'),
        userId: studentId,
        title: 'Application submitted',
        body: `Your application ${application.referenceNo} was recorded as submitted.`,
        createdAt: now,
        read: false,
        link: `/student/applications/${application.id}`,
      })
    }
    persist()
    return clone(application)
  },

  async update(id: string, input: ApplicationInput, asDraft: boolean): Promise<Application> {
    await delay()
    const index = db.applications.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That application no longer exists.')
    const current = db.applications[index]
    if (current.status !== 'draft') {
      throw new Error('Only draft applications can be edited.')
    }
    const now = new Date().toISOString()
    const updated: Application = {
      ...current,
      motivation: input.motivation,
      responses: input.responses,
      documentNames: input.documentNames,
      status: asDraft ? 'draft' : 'submitted',
      submittedAt: asDraft ? current.submittedAt : now,
      updatedAt: now,
      timeline: asDraft
        ? current.timeline
        : [...current.timeline, { status: 'submitted', at: now, note: 'Application submitted through the portal.' }],
    }
    db.applications[index] = updated
    persist()
    return clone(updated)
  },

  /**
   * Administrator review decision.
   * Approving here does NOT create a grant — that requires an explicit
   * confirmation on the grant records screen (business rule 4).
   */
  async updateStatus(
    id: string,
    status: ApplicationStatus,
    options: { note?: string; actor: string },
  ): Promise<Application> {
    await delay()
    const index = db.applications.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That application no longer exists.')
    const current = db.applications[index]
    const now = new Date().toISOString()
    const updated: Application = {
      ...current,
      status,
      reviewNotes: options.note ?? current.reviewNotes,
      reviewedBy: options.actor,
      updatedAt: now,
      timeline: [
        ...current.timeline,
        {
          status,
          at: now,
          note: options.note,
          actor: options.actor,
        },
      ],
    }
    db.applications[index] = updated
    db.notifications.push({
      id: createId('ntf'),
      userId: current.studentId,
      title: `Application ${applicationStatusLabel(status)}`,
      body: `Your application ${current.referenceNo} is now marked as ${applicationStatusLabel(status)}.`,
      createdAt: now,
      read: false,
      link: `/student/applications/${current.id}`,
    })
    persist()
    return clone(updated)
  },

  async withdraw(id: string, studentId: string): Promise<Application> {
    await delay()
    const index = db.applications.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That application no longer exists.')
    const current = db.applications[index]
    if (current.studentId !== studentId) {
      throw new Error('You can only withdraw your own application.')
    }
    if (current.status !== 'draft' && current.status !== 'submitted') {
      throw new Error('Only draft or submitted applications can be withdrawn.')
    }
    const now = new Date().toISOString()
    db.applications[index] = {
      ...current,
      status: 'rejected',
      updatedAt: now,
      reviewNotes: 'Withdrawn by the applicant.',
      timeline: [
        ...current.timeline,
        { status: 'rejected', at: now, note: 'Withdrawn by the applicant.', actor: 'Applicant' },
      ],
    }
    persist()
    return clone(db.applications[index])
  },

  async remove(id: string): Promise<void> {
    await delay()
    db.applications = db.applications.filter((item) => item.id !== id)
    persist()
  },

  async countsByStatus(): Promise<Record<ApplicationStatus, number>> {
    await delay()
    const counts = countBy(db.applications, (item) => item.status)
    return {
      draft: counts.draft ?? 0,
      submitted: counts.submitted ?? 0,
      'under-review': counts['under-review'] ?? 0,
      'needs-info': counts['needs-info'] ?? 0,
      approved: counts.approved ?? 0,
      rejected: counts.rejected ?? 0,
    }
  },

  /** Approved applications that do not yet have a confirmed grant record. */
  async awaitingGrantConfirmation(): Promise<Application[]> {
    await delay()
    const confirmed = new Set(db.grants.map((grant) => grant.applicationId).filter(Boolean))
    return clone(db.applications.filter((item) => item.status === 'approved' && !confirmed.has(item.id)))
  },
}

/* ------------------------------------------------------------------ */
/* Semester registrations                                              */
/* ------------------------------------------------------------------ */

export interface RegistrationInput {
  academicYear: string
  semester: string
  school: string
  course: string
  yearLevel: string
  unitsEnrolled: number
  gwa: number | null
}

const localRegistrationsApi = {
  async listForStudent(studentId: string): Promise<SemesterRegistration[]> {
    await delay()
    const mine = db.registrations.filter((item) => item.studentId === studentId)
    return clone(sortByDateDesc(mine, (item) => item.submittedAt))
  },

  async list(
    filters: RegistrationFilters = {},
    page = 1,
    pageSize = 10,
  ): Promise<Paginated<SemesterRegistration>> {
    await delay()
    const { query = '', status = 'all', academicYear = 'all', semester = 'all', studentId } = filters
    const filtered = db.registrations.filter((item) => {
      if (studentId && item.studentId !== studentId) return false
      if (status !== 'all' && item.status !== status) return false
      if (academicYear !== 'all' && item.academicYear !== academicYear) return false
      if (semester !== 'all' && item.semester !== semester) return false
      const student = db.users.find((u) => u.id === item.studentId)
      return matchesQuery(
        [
          item.referenceNo,
          item.school,
          item.course,
          student ? `${student.firstName} ${student.lastName}` : '',
        ],
        query,
      )
    })
    return paginate(sortByDateDesc(filtered, (item) => item.submittedAt), page, pageSize)
  },

  async get(id: string): Promise<SemesterRegistration | null> {
    await delay()
    const found = db.registrations.find((item) => item.id === id)
    return found ? clone(found) : null
  },

  async create(studentId: string, input: RegistrationInput): Promise<SemesterRegistration> {
    await delay()
    const duplicate = db.registrations.find(
      (item) =>
        item.studentId === studentId &&
        item.academicYear === input.academicYear &&
        item.semester === input.semester,
    )
    if (duplicate) {
      throw new Error(
        `You already have a registration for ${input.semester}, AY ${input.academicYear}.`,
      )
    }
    const now = new Date().toISOString()
    const registration: SemesterRegistration = {
      ...input,
      id: createId('reg'),
      referenceNo: nextReference(
        'REG',
        db.registrations.map((item) => item.referenceNo),
      ),
      studentId,
      status: 'pending',
      submittedAt: now,
      updatedAt: now,
    }
    db.registrations.unshift(registration)
    db.notifications.push({
      id: createId('ntf'),
      userId: studentId,
      title: 'Semester registration submitted',
      body: `Registration ${registration.referenceNo} is pending verification.`,
      createdAt: now,
      read: false,
      link: '/student/semester-registration',
    })
    persist()
    return clone(registration)
  },

  async updateStatus(
    id: string,
    status: RegistrationStatus,
    options: { remarks?: string; actor: string },
  ): Promise<SemesterRegistration> {
    await delay()
    const index = db.registrations.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That registration no longer exists.')
    const now = new Date().toISOString()
    const updated: SemesterRegistration = {
      ...db.registrations[index],
      status,
      remarks: options.remarks ?? db.registrations[index].remarks,
      verifiedBy: options.actor,
      updatedAt: now,
    }
    db.registrations[index] = updated
    db.notifications.push({
      id: createId('ntf'),
      userId: updated.studentId,
      title: `Semester registration ${status}`,
      body: `Registration ${updated.referenceNo} is now marked as ${status}.`,
      createdAt: now,
      read: false,
      link: '/student/semester-registration',
    })
    persist()
    return clone(updated)
  },

  async countByStatus(): Promise<Record<RegistrationStatus, number>> {
    await delay()
    const counts = countBy(db.registrations, (item) => item.status)
    return {
      pending: counts.pending ?? 0,
      verified: counts.verified ?? 0,
      rejected: counts.rejected ?? 0,
    }
  },
}

/* ------------------------------------------------------------------ */
/* Confirmed grants                                                    */
/* ------------------------------------------------------------------ */

export interface GrantInput {
  studentId: string
  scholarshipId: string
  academicYear: string
  semester: string
  amount: number
  status: Grant['status']
  releasedAt: string
  remarks?: string
}

const localGrantsApi = {
  async listForStudent(studentId: string): Promise<Grant[]> {
    await delay()
    const mine = db.grants.filter((item) => item.studentId === studentId)
    return clone(sortByDateDesc(mine, (item) => item.releasedAt))
  },

  async list(filters: GrantFilters = {}, page = 1, pageSize = 10): Promise<Paginated<Grant>> {
    await delay()
    const { query = '', status = 'all', academicYear = 'all', semester = 'all', studentId } = filters
    const filtered = db.grants.filter((item) => {
      if (studentId && item.studentId !== studentId) return false
      if (status !== 'all' && item.status !== status) return false
      if (academicYear !== 'all' && item.academicYear !== academicYear) return false
      if (semester !== 'all' && item.semester !== semester) return false
      const student = db.users.find((u) => u.id === item.studentId)
      const scholarship = db.scholarships.find((s) => s.id === item.scholarshipId)
      return matchesQuery(
        [
          item.referenceNo,
          scholarship?.name ?? '',
          student ? `${student.firstName} ${student.lastName}` : '',
        ],
        query,
      )
    })
    return paginate(sortByDateDesc(filtered, (item) => item.releasedAt), page, pageSize)
  },

  async get(id: string): Promise<Grant | null> {
    await delay()
    const found = db.grants.find((item) => item.id === id)
    return found ? clone(found) : null
  },

  /**
   * Explicitly confirm a grant. This is the only path that turns an approved
   * application into a confirmed grant record (business rule 4).
   */
  async confirmFromApplication(
    applicationId: string,
    options: { amount: number; academicYear: string; semester: string; remarks?: string; actor: string },
  ): Promise<Grant> {
    await delay()
    const application = db.applications.find((item) => item.id === applicationId)
    if (!application) throw new Error('That application no longer exists.')
    if (application.status !== 'approved') {
      throw new Error('Only approved applications can be confirmed as grants.')
    }
    const already = db.grants.find((grant) => grant.applicationId === applicationId)
    if (already) {
      throw new Error('A grant record has already been confirmed for this application.')
    }
    const now = new Date().toISOString()
    const grant: Grant = {
      id: createId('grt'),
      referenceNo: nextReference(
        'GRT',
        db.grants.map((item) => item.referenceNo),
      ),
      studentId: application.studentId,
      scholarshipId: application.scholarshipId,
      applicationId,
      academicYear: options.academicYear,
      semester: options.semester,
      amount: options.amount,
      status: 'active',
      releasedAt: now,
      confirmedBy: options.actor,
      remarks: options.remarks,
    }
    db.grants.unshift(grant)
    db.notifications.push({
      id: createId('ntf'),
      userId: application.studentId,
      title: 'Grant record confirmed',
      body: `A grant of ${grant.amount.toLocaleString('en-PH')} was confirmed for ${grant.semester}, AY ${grant.academicYear}.`,
      createdAt: now,
      read: false,
      link: '/student/grants',
    })
    persist()
    return clone(grant)
  },

  async create(input: GrantInput, actor: string): Promise<Grant> {
    await delay()
    const grant: Grant = {
      ...input,
      id: createId('grt'),
      referenceNo: nextReference(
        'GRT',
        db.grants.map((item) => item.referenceNo),
      ),
      confirmedBy: actor,
    }
    db.grants.unshift(grant)
    persist()
    return clone(grant)
  },

  async update(id: string, patch: Partial<GrantInput>): Promise<Grant> {
    await delay()
    const index = db.grants.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That grant record no longer exists.')
    const updated: Grant = { ...db.grants[index], ...patch }
    db.grants[index] = updated
    persist()
    return clone(updated)
  },

  async remove(id: string): Promise<void> {
    await delay()
    db.grants = db.grants.filter((item) => item.id !== id)
    persist()
  },

  async totalReleased(): Promise<number> {
    await delay()
    return db.grants.reduce((sum, grant) => sum + grant.amount, 0)
  },
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export interface AnnouncementInput {
  title: string
  body: string
  audience: AnnouncementAudience
  pinned: boolean
}

const localAnnouncementsApi = {
  /** `audience` filters to what a role should see. Omit for everything. */
  async list(audience?: AnnouncementAudience | Role): Promise<Announcement[]> {
    await delay()
    let items = [...db.announcements]
    if (audience === 'students') {
      items = items.filter((item) => item.audience === 'all' || item.audience === 'students')
    } else if (audience === 'admins' || audience === 'admin') {
      items = items.filter((item) => item.audience === 'all' || item.audience === 'admins')
    }
    items.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    return clone(items)
  },

  async get(id: string): Promise<Announcement | null> {
    await delay()
    const found = db.announcements.find((item) => item.id === id)
    return found ? clone(found) : null
  },

  async create(input: AnnouncementInput, author: string): Promise<Announcement> {
    await delay()
    const announcement: Announcement = {
      ...input,
      id: createId('ann'),
      author,
      publishedAt: new Date().toISOString(),
    }
    db.announcements.unshift(announcement)
    persist()
    return clone(announcement)
  },

  async update(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    await delay()
    const index = db.announcements.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That announcement no longer exists.')
    const updated: Announcement = { ...db.announcements[index], ...patch }
    db.announcements[index] = updated
    persist()
    return clone(updated)
  },

  async remove(id: string): Promise<void> {
    await delay()
    db.announcements = db.announcements.filter((item) => item.id !== id)
    persist()
  },
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

/** Role of the signed-in account in the demo store. */
function currentRole(): Role {
  return db.users.find((user) => user.id === db.sessionUserId)?.role ?? 'student'
}

function filterDocuments(filters: DocumentFilters): StudentDocument[] {
  let items = [...db.documents]

  // The same ownership rule as the server: a student only ever sees their own.
  if (currentRole() !== 'admin') {
    items = items.filter((item) => item.studentId === db.sessionUserId)
  } else if (filters.studentId) {
    items = items.filter((item) => item.studentId === filters.studentId)
  }

  if (filters.classification && filters.classification !== 'all') {
    items = items.filter((item) => item.classification === filters.classification)
  }
  if (filters.status && filters.status !== 'all') {
    items = items.filter((item) => item.status === filters.status)
  }
  if (filters.applicationId) {
    items = items.filter((item) => item.applicationId === filters.applicationId)
  }

  const search = (filters.query ?? '').trim().toLowerCase()
  if (search) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(search) || item.fileName.toLowerCase().includes(search),
    )
  }

  return items.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )
}

/** Read a browser `File` into a data URL, so the demo store can hand it back. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('That file could not be read.'))
    reader.readAsDataURL(file)
  })
}

const localDocumentsApi = {
  async list(filters: DocumentFilters = {}): Promise<StudentDocument[]> {
    await delay()
    return clone(filterDocuments(filters))
  },

  async listRecords(filters: DocumentFilters = {}): Promise<DocumentRecord[]> {
    await delay()
    return filterDocuments(filters)
      .map((document) => {
        const student = db.users.find((user) => user.id === document.studentId)
        return student ? { document: clone(document), student: clone(student) } : null
      })
      .filter((record): record is DocumentRecord => record !== null)
  },

  async upload(input: DocumentUpload): Promise<StudentDocument> {
    await delay()
    const problem = validateDocumentFile(input.file)
    if (problem) throw new Error(problem)

    const id = createId('doc')
    const document: StudentDocument = {
      id,
      studentId: db.sessionUserId ?? '',
      applicationId: input.applicationId ?? null,
      title: input.title.trim() || suggestDocumentTitle(input.file.name),
      classification: input.classification,
      fileName: input.file.name,
      mimeType: input.file.type,
      size: input.file.size,
      uploadedAt: new Date().toISOString(),
      status: 'submitted',
      note: null,
    }

    db.documents.unshift(document)
    db.documentData[id] = await readAsDataUrl(input.file)
    persist()
    return clone(document)
  },

  async update(
    id: string,
    changes: {
      title?: string
      classification?: DocumentClassification
      status?: DocumentStatus
      note?: string
    },
  ): Promise<StudentDocument> {
    await delay()
    const index = db.documents.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('That document no longer exists.')

    const existing = db.documents[index]
    const isAdmin = currentRole() === 'admin'
    if (!isAdmin && existing.studentId !== db.sessionUserId) {
      throw new Error('You do not have access to this resource.')
    }

    const updated: StudentDocument = { ...existing }

    // Filing is the student's to correct; accepting a file is the office's.
    if (changes.title !== undefined) {
      const title = changes.title.trim()
      if (!title) throw new Error('Give the document a title.')
      updated.title = title
    }

    if (changes.classification !== undefined) {
      if (!DOCUMENT_CLASSIFICATIONS.some((option) => option.value === changes.classification)) {
        throw new Error('That is not a valid classification.')
      }
      updated.classification = changes.classification
    }

    if (changes.status !== undefined || changes.note !== undefined) {
      if (!isAdmin) throw new Error('You do not have access to this resource.')
      const status = changes.status ?? existing.status
      const note = (changes.note ?? existing.note ?? '').trim()
      if (status === 'rejected' && !note) {
        throw new Error('Give a reason for rejecting the document.')
      }
      updated.status = status
      updated.note = note || null
    }

    db.documents[index] = updated
    persist()
    return clone(updated)
  },

  async remove(id: string): Promise<void> {
    await delay()
    const existing = db.documents.find((item) => item.id === id)
    if (!existing) throw new Error('That document no longer exists.')

    const isAdmin = currentRole() === 'admin'
    if (!isAdmin && existing.studentId !== db.sessionUserId) {
      throw new Error('You do not have access to this resource.')
    }
    // Verified files are the evidence a decision rested on.
    if (!isAdmin && existing.status === 'verified') {
      throw new Error(
        'A verified document cannot be removed. Ask the scholarship office if it is wrong.',
      )
    }

    db.documents = db.documents.filter((item) => item.id !== id)
    delete db.documentData[id]
    persist()
  },

  /**
   * A data URL here, where the HTTP layer returns an endpoint. Both work as the
   * `href` of a download link, which is all the UI does with it.
   */
  fileUrl(id: string): string {
    return db.documentData[id] ?? ''
  },
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const localNotificationsApi = {
  /** Includes notifications targeted at the user plus broadcasts. */
  async listForUser(userId: string): Promise<Notification[]> {
    await delay()
    const mine = db.notifications.filter(
      (item) => item.userId === userId || item.userId === null,
    )
    return clone(sortByDateDesc(mine, (item) => item.createdAt))
  },

  async unreadCount(userId: string): Promise<number> {
    await delay(90)
    return db.notifications.filter(
      (item) => (item.userId === userId || item.userId === null) && !item.read,
    ).length
  },

  async markRead(id: string): Promise<void> {
    await delay(90)
    const found = db.notifications.find((item) => item.id === id)
    if (found) {
      found.read = true
      persist()
    }
  },

  async markAllRead(userId: string): Promise<void> {
    await delay(120)
    db.notifications.forEach((item) => {
      if (item.userId === userId || item.userId === null) item.read = true
    })
    persist()
  },
}

/* ------------------------------------------------------------------ */
/* Students (administrator views + student self-service)               */
/* ------------------------------------------------------------------ */

function buildStudentRecord(user: User): StudentRecord {
  return {
    user: clone(user),
    profile: clone(db.profiles.find((item) => item.userId === user.id) ?? null),
    applicationCount: db.applications.filter((item) => item.studentId === user.id).length,
    grantCount: db.grants.filter((item) => item.studentId === user.id).length,
  }
}

const localStudentsApi = {
  async list(
    filters: { query?: string; municipality?: string | 'all' } = {},
    page = 1,
    pageSize = 10,
  ): Promise<Paginated<StudentRecord>> {
    await delay()
    const { query = '', municipality = 'all' } = filters
    const students = db.users.filter((user) => {
      if (user.role !== 'student') return false
      const profile = db.profiles.find((item) => item.userId === user.id)
      if (municipality !== 'all' && profile?.municipality !== municipality) return false
      return matchesQuery(
        [user.firstName, user.lastName, user.email, profile?.school ?? '', profile?.studentNumber ?? ''],
        query,
      )
    })
    students.sort((a, b) => a.lastName.localeCompare(b.lastName))
    const paged = paginate(students, page, pageSize)
    return { ...paged, items: paged.items.map((user) => buildStudentRecord(user)) }
  },

  async get(userId: string): Promise<StudentRecord | null> {
    await delay()
    const user = db.users.find((item) => item.id === userId && item.role === 'student')
    return user ? buildStudentRecord(user) : null
  },

  async profile(userId: string): Promise<StudentProfile | null> {
    await delay()
    const found = db.profiles.find((item) => item.userId === userId)
    return found ? clone(found) : null
  },

  async updateProfile(userId: string, patch: Partial<StudentProfile>): Promise<StudentProfile> {
    await delay()
    const index = db.profiles.findIndex((item) => item.userId === userId)
    const now = new Date().toISOString()
    if (index === -1) {
      const created: StudentProfile = {
        userId,
        studentNumber: '',
        phone: '',
        municipality: MUNICIPALITIES[1],
        barangay: '',
        address: '',
        birthDate: '',
        educationLevel: 'college',
        school: '',
        course: '',
        yearLevel: '',
        gwa: null,
        householdIncome: null,
        guardianName: '',
        guardianContact: '',
        ...patch,
        updatedAt: now,
      }
      db.profiles.push(created)
      persist()
      return clone(created)
    }
    const updated: StudentProfile = { ...db.profiles[index], ...patch, updatedAt: now }
    db.profiles[index] = updated
    persist()
    return clone(updated)
  },

  /** Administrator edit of the account itself. */
  async updateAccount(userId: string, patch: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>): Promise<User> {
    await delay()
    const index = db.users.findIndex((item) => item.id === userId)
    if (index === -1) throw new Error('That student record no longer exists.')
    const updated: User = { ...db.users[index], ...patch }
    db.users[index] = updated
    const credential = db.credentials.find((entry) => entry.userId === userId)
    if (credential && patch.email) credential.email = patch.email
    persist()
    return clone(updated)
  },

  /**
   * Remove a student and every record that belongs to them.
   * Deliberately destructive and gated behind a confirmation dialog in the UI.
   */
  async remove(userId: string): Promise<void> {
    await delay()
    db.users = db.users.filter((item) => item.id !== userId)
    db.credentials = db.credentials.filter((item) => item.userId !== userId)
    db.profiles = db.profiles.filter((item) => item.userId !== userId)
    db.applications = db.applications.filter((item) => item.studentId !== userId)
    db.registrations = db.registrations.filter((item) => item.studentId !== userId)
    db.grants = db.grants.filter((item) => item.studentId !== userId)
    db.notifications = db.notifications.filter((item) => item.userId !== userId)
    db.saved = db.saved.filter((item) => item.studentId !== userId)
    persist()
  },

  async count(): Promise<number> {
    await delay(90)
    return db.users.filter((user) => user.role === 'student').length
  },
}

/* ------------------------------------------------------------------ */
/* Platform settings                                                   */
/* ------------------------------------------------------------------ */

const localSettingsApi = {
  async get(): Promise<PlatformSettings> {
    await delay(90)
    return clone(db.settings)
  },

  async update(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    await delay()
    db.settings = { ...db.settings, ...patch, updatedAt: new Date().toISOString() }
    persist()
    return clone(db.settings)
  },
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export interface ReportOverview {
  totalScholarships: number
  openScholarships: number
  draftScholarships: number
  totalStudents: number
  totalApplications: number
  pendingApplications: number
  totalRegistrations: number
  pendingRegistrations: number
  totalGrants: number
  activeGrants: number
  totalAmountReleased: number
}

export interface BreakdownRow {
  label: string
  count: number
  amount: number
}

const localReportsApi = {
  async overview(): Promise<ReportOverview> {
    await delay()
    const scholarships = db.scholarships
    const applications = db.applications
    const registrations = db.registrations
    const grants = db.grants
    return {
      totalScholarships: scholarships.length,
      openScholarships: scholarships.filter((item) => item.status === 'open').length,
      draftScholarships: scholarships.filter((item) => item.status === 'draft').length,
      totalStudents: db.users.filter((user) => user.role === 'student').length,
      totalApplications: applications.length,
      pendingApplications: applications.filter((item) =>
        ['submitted', 'under-review', 'needs-info'].includes(item.status),
      ).length,
      totalRegistrations: registrations.length,
      pendingRegistrations: registrations.filter((item) => item.status === 'pending').length,
      totalGrants: grants.length,
      activeGrants: grants.filter((item) => item.status === 'active').length,
      totalAmountReleased: grants.reduce((sum, grant) => sum + grant.amount, 0),
    }
  },

  async applicationsByStatus(): Promise<BreakdownRow[]> {
    await delay()
    const counts = countBy(db.applications, (item) => item.status)
    return Object.entries(counts)
      .map(([label, count]) => ({ label: label.replace(/-/g, ' '), count, amount: 0 }))
      .sort((a, b) => b.count - a.count)
  },

  async applicationsByScholarship(): Promise<BreakdownRow[]> {
    await delay()
    const counts = countBy(db.applications, (item) => item.scholarshipId)
    return Object.entries(counts)
      .map(([id, count]) => ({
        label: db.scholarships.find((item) => item.id === id)?.name ?? 'Removed listing',
        count,
        amount: 0,
      }))
      .sort((a, b) => b.count - a.count)
  },

  async grantsByMunicipality(): Promise<BreakdownRow[]> {
    await delay()
    const totals = new Map<string, { count: number; amount: number }>()
    db.grants.forEach((grant) => {
      const profile = db.profiles.find((item) => item.userId === grant.studentId)
      const label = profile?.municipality || 'Not provided'
      const current = totals.get(label) ?? { count: 0, amount: 0 }
      totals.set(label, { count: current.count + 1, amount: current.amount + grant.amount })
    })
    return [...totals.entries()]
      .map(([label, value]) => ({ label, count: value.count, amount: value.amount }))
      .sort((a, b) => b.amount - a.amount)
  },

  async applicationsByMonth(): Promise<BreakdownRow[]> {
    await delay()
    const counts = countBy(db.applications, (item) => item.submittedAt.slice(0, 7))
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count, amount: 0 }))
      .sort((a, b) => a.label.localeCompare(b.label))
  },

  async registrationsByStatus(): Promise<BreakdownRow[]> {
    await delay()
    const counts = countBy(db.registrations, (item) => item.status)
    return Object.entries(counts).map(([label, count]) => ({ label, count, amount: 0 }))
  },
}

/* ------------------------------------------------------------------ */
/* Demo utilities                                                      */
/* ------------------------------------------------------------------ */

const localDemoApi = {
  /** Wipe every stored record and re-seed from the shipped records. */
  reset: resetDemoData,

  /**
   * The seeded sign-in credentials, surfaced so the login screen can offer them.
   * Defined once in src/lib/testAccounts.ts, shared with the HTTP adapter.
   */
  accounts(): { role: Role; label: string; email: string; password: string }[] {
    // One definition of the test credentials, shared with the HTTP adapter.
    return TEST_ACCOUNTS.map((account) => ({ ...account }))
  },

  /** Remove all app-owned localStorage keys, including the session. */
  hardReset(): void {
    clearAll()
    db = createSeedDatabase()
  },

  stats(): { scholarships: number; applications: number; students: number; grants: number } {
    return {
      scholarships: db.scholarships.length,
      applications: db.applications.length,
      students: db.users.filter((user) => user.role === 'student').length,
      grants: db.grants.length,
    }
  },
}

/* ------------------------------------------------------------------ */
/* Which data source is active                                         */
/* ------------------------------------------------------------------ */

/**
 * `VITE_API_BASE_URL` decides at build time whether the app talks to the API
 * server or to its own browser store. Both implementations expose the same
 * methods, so no page needs to know which is in play.
 *
 * Browser storage is per-browser and not shared: fine for previewing the
 * interface, wrong for anything real. Set the variable to use the server.
 *
 * The assertions below exist because the two implementations are structurally
 * identical but independently declared, and a union type would make every call
 * site ambiguous. Divergence between them is caught by the end-to-end check
 * against a running server rather than by the compiler.
 */
export const USING_REMOTE_API = IS_REMOTE

export const authApi = (IS_REMOTE ? httpApi.authApi : localAuthApi) as typeof localAuthApi
export const scholarshipsApi = (IS_REMOTE
  ? httpApi.scholarshipsApi
  : localScholarshipsApi) as typeof localScholarshipsApi
export const savedApi = (IS_REMOTE ? httpApi.savedApi : localSavedApi) as typeof localSavedApi
export const applicationsApi = (IS_REMOTE
  ? httpApi.applicationsApi
  : localApplicationsApi) as typeof localApplicationsApi
export const registrationsApi = (IS_REMOTE
  ? httpApi.registrationsApi
  : localRegistrationsApi) as typeof localRegistrationsApi
export const grantsApi = (IS_REMOTE ? httpApi.grantsApi : localGrantsApi) as typeof localGrantsApi
export const documentsApi = (IS_REMOTE
  ? httpApi.documentsApi
  : localDocumentsApi) as typeof localDocumentsApi
export const announcementsApi = (IS_REMOTE
  ? httpApi.announcementsApi
  : localAnnouncementsApi) as typeof localAnnouncementsApi
export const notificationsApi = (IS_REMOTE
  ? httpApi.notificationsApi
  : localNotificationsApi) as typeof localNotificationsApi
export const studentsApi = (IS_REMOTE ? httpApi.studentsApi : localStudentsApi) as typeof localStudentsApi
export const settingsApi = (IS_REMOTE ? httpApi.settingsApi : localSettingsApi) as typeof localSettingsApi
export const reportsApi = (IS_REMOTE ? httpApi.reportsApi : localReportsApi) as typeof localReportsApi
export const demoApi = (IS_REMOTE ? httpApi.demoApi : localDemoApi) as typeof localDemoApi
