import { MUNICIPALITIES } from './constants.ts'
import { validateDocumentFile } from './documents.ts'
import { TEST_ACCOUNTS } from './testAccounts.ts'
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
import type {
  AnnouncementInput,
  ApplicationInput,
  BreakdownRow,
  GrantInput,
  RegistrationInput,
  ReportOverview,
  ScholarshipInput,
} from './api.ts'

/**
 * HTTP implementation of the data layer.
 *
 * Mirrors `src/lib/api.ts` method for method, so pages do not know or care which
 * one is active. The browser never talks to the database — only to this API,
 * which owns the SQLite/Postgres connection and decides every authorisation
 * question per request.
 *
 * Selected automatically when `VITE_API_BASE_URL` is set at build time.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

/** How long to wait before treating a request as failed rather than pending. */
const REQUEST_TIMEOUT_MS = 20_000

/** A file takes longer to move than a JSON body, so it gets its own budget. */
const UPLOAD_TIMEOUT_MS = 60_000

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      // Sends the httpOnly session cookie. Requires the API to be same-origin,
      // which the dev proxy and the production rewrite both arrange.
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      // A request that never settles would leave the UI on a spinner forever.
      // Failing loudly is better than an indefinite wait.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (cause: unknown) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') {
      throw new Error('The server took too long to respond. Please try again.')
    }
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  return parseResponse<T>(response)
}

/**
 * Turn a response into a value, or throw the server's message. Shared by the
 * JSON and multipart paths so both report failures the same way.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : 'Something went wrong. Please try again.'
    throw new Error(message)
  }

  return payload as T
}

/**
 * Send a multipart body.
 *
 * Deliberately sets no Content-Type: the browser has to append the multipart
 * boundary, and setting the header by hand would drop it.
 */
async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    })
  } catch (cause: unknown) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') {
      throw new Error('The upload took too long. Please try again.')
    }
    throw new Error('Could not reach the server. Check your connection and try again.')
  }

  return parseResponse<T>(response)
}

function queryString(values: Record<string, string | number | boolean | undefined | null>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

const authApi = {
  /**
   * Always null over HTTP: the session lives in an httpOnly cookie that
   * JavaScript cannot read, so it can only be resolved asynchronously. The
   * auth provider starts from null and calls `getSession()`.
   */
  getCurrentUserSync(): User | null {
    return null
  },

  async getSession(): Promise<User | null> {
    const result = await request<{ user: User | null }>('GET', '/auth/session')
    return result.user
  },

  async login(input: LoginInput): Promise<User> {
    const result = await request<{ user: User }>('POST', '/auth/login', input)
    return result.user
  },

  async register(input: RegisterInput): Promise<User> {
    const result = await request<{ user: User }>('POST', '/auth/register', input)
    return result.user
  },

  async logout(): Promise<void> {
    await request<{ ok: boolean }>('POST', '/auth/logout')
  },

  async changePassword(): Promise<void> {
    // No endpoint: changing a password without an email address to recover it is
    // a good way to lock people out. Wire this once mail exists.
    throw new Error('Changing your password is not available yet. Contact the scholarship office.')
  },

  /**
   * Whether this deployment has a Google client id. The sign-in button is
   * hidden unless it does, so it is never offered and then fails.
   */
  async googleConfig(): Promise<{ configured: boolean; clientId: string }> {
    return request<{ configured: boolean; clientId: string }>('GET', '/auth/google/config')
  },

  /** Exchange a Google ID token for a session. */
  async googleSignIn(credential: string): Promise<{ user: User; needsProfile: boolean }> {
    const result = await request<{ user: User; needsProfile?: boolean }>('POST', '/auth/google', {
      credential,
    })
    return { user: result.user, needsProfile: result.needsProfile === true }
  },

  /** The one-time step for an account created through Google. */
  async completeGoogleProfile(input: CompleteProfileInput): Promise<User> {
    const result = await request<{ user: User }>('POST', '/auth/google/complete', input)
    return result.user
  },

  /** Ask for a one-time code. Answers identically for unknown addresses. */
  async requestCode(email: string, purpose: OtpPurpose): Promise<OtpRequestResult> {
    return request<OtpRequestResult>('POST', '/auth/otp/request', { email, purpose })
  },

  /**
   * Confirm an address. Returns the refreshed user when the caller was signed
   * in as that account, which is the common case from the profile page.
   */
  async verifyEmailCode(email: string, code: string): Promise<User | null> {
    const result = await request<{ user?: User; verified?: boolean }>(
      'POST',
      '/auth/otp/verify',
      { email, purpose: 'verify-email', code },
    )
    return result.user ?? null
  },

  /** Consume a reset code and set the new password in the same request. */
  async resetPassword(input: {
    email: string
    code: string
    password: string
  }): Promise<void> {
    await request<{ reset: boolean }>('POST', '/auth/otp/verify', {
      ...input,
      purpose: 'reset-password',
    })
  },
}

/* ------------------------------------------------------------------ */
/* Scholarships                                                        */
/* ------------------------------------------------------------------ */

function scholarshipQuery(
  filters: ScholarshipFilters,
  extra: Record<string, string | number> = {},
): string {
  // Everything goes through one helper so the separator is always right.
  // Concatenating "&page=" onto an empty filter string produced
  // "/scholarships&pageSize=1000", which matched no route and returned 404.
  return queryString({
    query: filters.query?.trim() || undefined,
    type: filters.type && filters.type !== 'all' ? filters.type : undefined,
    municipality: filters.municipality && filters.municipality !== 'all' ? filters.municipality : undefined,
    status: filters.status && filters.status !== 'all' ? filters.status : undefined,
    level: filters.educationLevel && filters.educationLevel !== 'all' ? filters.educationLevel : undefined,
    deadlineWithinDays: filters.deadlineWithinDays ?? undefined,
    featured: filters.featuredOnly ? 'true' : undefined,
    includeDrafts: filters.includeDrafts ? 'true' : undefined,
    sort: filters.sort,
    ...extra,
  })
}

const scholarshipsApi = {
  async list(filters: ScholarshipFilters = {}, page = 1, pageSize = 9): Promise<Paginated<Scholarship>> {
    return request<Paginated<Scholarship>>(
      'GET',
      `/scholarships${scholarshipQuery(filters, { page, pageSize })}`,
    )
  },

  async listAll(filters: ScholarshipFilters = {}): Promise<Scholarship[]> {
    const result = await request<Paginated<Scholarship>>(
      'GET',
      `/scholarships${scholarshipQuery(filters, { pageSize: 1000 })}`,
    )
    return result.items
  },

  async get(id: string): Promise<Scholarship | null> {
    return request<Scholarship | null>('GET', `/scholarships/${encodeURIComponent(id)}`)
  },

  async create(input: ScholarshipInput): Promise<Scholarship> {
    return request<Scholarship>('POST', '/scholarships', input)
  },

  async update(id: string, patch: Partial<ScholarshipInput>): Promise<Scholarship> {
    return request<Scholarship>('PATCH', `/scholarships/${encodeURIComponent(id)}`, patch)
  },

  async setStatus(id: string, status: ScholarshipStatus): Promise<Scholarship> {
    return request<Scholarship>('PATCH', `/scholarships/${encodeURIComponent(id)}`, { status })
  },

  async remove(id: string): Promise<void> {
    await request<{ ok: boolean }>('DELETE', `/scholarships/${encodeURIComponent(id)}`)
  },

  async featured(limit = 3): Promise<Scholarship[]> {
    const result = await request<Paginated<Scholarship>>(
      'GET',
      `/scholarships?featured=true&pageSize=${limit}&sort=deadline`,
    )
    return result.items
  },

  async closingSoon(limit = 4, withinDays = 21): Promise<Scholarship[]> {
    const result = await request<Paginated<Scholarship>>(
      'GET',
      `/scholarships?deadlineWithinDays=${withinDays}&pageSize=${limit}&sort=deadline`,
    )
    return result.items
  },

  async countsByType(): Promise<{ type: Scholarship['type']; count: number }[]> {
    return request<{ type: Scholarship['type']; count: number }[]>('GET', '/scholarships/counts-by-type')
  },

  municipalities(): string[] {
    return [...MUNICIPALITIES]
  },

  async options(): Promise<{ id: string; name: string; provider: string }[]> {
    return request<{ id: string; name: string; provider: string }[]>('GET', '/scholarships/options')
  },
}

/* ------------------------------------------------------------------ */
/* Saved                                                               */
/* ------------------------------------------------------------------ */

const savedApi = {
  async ids(_studentId: string): Promise<string[]> {
    return request<string[]>('GET', '/saved/ids')
  },

  async listForStudent(_studentId: string): Promise<Scholarship[]> {
    return request<Scholarship[]>('GET', '/saved')
  },

  async toggle(_studentId: string, scholarshipId: string): Promise<boolean> {
    const result = await request<{ saved: boolean }>(
      'POST',
      `/saved/${encodeURIComponent(scholarshipId)}/toggle`,
    )
    return result.saved
  },
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

const applicationsApi = {
  async listForStudent(_studentId: string): Promise<Application[]> {
    const result = await request<Paginated<Application>>('GET', '/applications?pageSize=200')
    return result.items
  },

  async list(filters: ApplicationFilters = {}, page = 1, pageSize = 10): Promise<Paginated<Application>> {
    return request<Paginated<Application>>(
      'GET',
      `/applications${queryString({
        query: filters.query?.trim() || undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        scholarshipId: filters.scholarshipId && filters.scholarshipId !== 'all' ? filters.scholarshipId : undefined,
        studentId: filters.studentId,
        page,
        pageSize,
      })}`,
    )
  },

  async get(id: string, _studentId?: string): Promise<Application | null> {
    // Ownership is enforced server-side from the session, not from a parameter
    // the caller could forge.
    return request<Application | null>('GET', `/applications/${encodeURIComponent(id)}`)
  },

  async findForStudentAndScholarship(
    _studentId: string,
    scholarshipId: string,
  ): Promise<Application | null> {
    const result = await request<Paginated<Application>>(
      'GET',
      `/applications?scholarshipId=${encodeURIComponent(scholarshipId)}&pageSize=1`,
    )
    return result.items[0] ?? null
  },

  async create(_studentId: string, input: ApplicationInput, asDraft: boolean): Promise<Application> {
    return request<Application>('POST', '/applications', { ...input, asDraft })
  },

  async update(id: string, input: ApplicationInput, asDraft: boolean): Promise<Application> {
    return request<Application>('PATCH', `/applications/${encodeURIComponent(id)}`, { ...input, asDraft })
  },

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    options: { note?: string; actor: string },
  ): Promise<Application> {
    return request<Application>('POST', `/applications/${encodeURIComponent(id)}/status`, {
      status,
      note: options.note,
    })
  },

  async withdraw(id: string, _studentId: string): Promise<Application> {
    return request<Application>('POST', `/applications/${encodeURIComponent(id)}/withdraw`)
  },

  async remove(id: string): Promise<void> {
    await request<{ ok: boolean }>('DELETE', `/applications/${encodeURIComponent(id)}`)
  },

  async countsByStatus(): Promise<Record<ApplicationStatus, number>> {
    return request<Record<ApplicationStatus, number>>('GET', '/applications/counts')
  },

  async awaitingGrantConfirmation(): Promise<Application[]> {
    return request<Application[]>('GET', '/applications/awaiting-grant')
  },
}

/* ------------------------------------------------------------------ */
/* Registrations                                                       */
/* ------------------------------------------------------------------ */

const registrationsApi = {
  async listForStudent(_studentId: string): Promise<SemesterRegistration[]> {
    const result = await request<Paginated<SemesterRegistration>>('GET', '/registrations?pageSize=100')
    return result.items
  },

  async list(
    filters: RegistrationFilters = {},
    page = 1,
    pageSize = 10,
  ): Promise<Paginated<SemesterRegistration>> {
    return request<Paginated<SemesterRegistration>>(
      'GET',
      `/registrations${queryString({
        query: filters.query?.trim() || undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        academicYear: filters.academicYear && filters.academicYear !== 'all' ? filters.academicYear : undefined,
        semester: filters.semester && filters.semester !== 'all' ? filters.semester : undefined,
        studentId: filters.studentId,
        page,
        pageSize,
      })}`,
    )
  },

  async get(id: string): Promise<SemesterRegistration | null> {
    return request<SemesterRegistration | null>('GET', `/registrations/${encodeURIComponent(id)}`)
  },

  async create(_studentId: string, input: RegistrationInput): Promise<SemesterRegistration> {
    return request<SemesterRegistration>('POST', '/registrations', input)
  },

  async updateStatus(
    id: string,
    status: RegistrationStatus,
    options: { remarks?: string; actor: string },
  ): Promise<SemesterRegistration> {
    return request<SemesterRegistration>('POST', `/registrations/${encodeURIComponent(id)}/status`, {
      status,
      remarks: options.remarks,
    })
  },

  async countByStatus(): Promise<Record<RegistrationStatus, number>> {
    return request<Record<RegistrationStatus, number>>('GET', '/registrations/counts')
  },
}

/* ------------------------------------------------------------------ */
/* Grants                                                              */
/* ------------------------------------------------------------------ */

const grantsApi = {
  async listForStudent(_studentId: string): Promise<Grant[]> {
    const result = await request<Paginated<Grant>>('GET', '/grants?pageSize=100')
    return result.items
  },

  async list(filters: GrantFilters = {}, page = 1, pageSize = 10): Promise<Paginated<Grant>> {
    return request<Paginated<Grant>>(
      'GET',
      `/grants${queryString({
        query: filters.query?.trim() || undefined,
        status: filters.status && filters.status !== 'all' ? filters.status : undefined,
        academicYear: filters.academicYear && filters.academicYear !== 'all' ? filters.academicYear : undefined,
        semester: filters.semester && filters.semester !== 'all' ? filters.semester : undefined,
        studentId: filters.studentId,
        page,
        pageSize,
      })}`,
    )
  },

  async get(id: string): Promise<Grant | null> {
    return request<Grant | null>('GET', `/grants/${encodeURIComponent(id)}`)
  },

  async confirmFromApplication(
    applicationId: string,
    options: { amount: number; academicYear: string; semester: string; remarks?: string; actor: string },
  ): Promise<Grant> {
    return request<Grant>('POST', '/grants/confirm', {
      applicationId,
      amount: options.amount,
      academicYear: options.academicYear,
      semester: options.semester,
      remarks: options.remarks,
    })
  },

  async create(input: GrantInput, _actor: string): Promise<Grant> {
    return request<Grant>('POST', '/grants', input)
  },

  async update(id: string, patch: Partial<GrantInput>): Promise<Grant> {
    return request<Grant>('PATCH', `/grants/${encodeURIComponent(id)}`, patch)
  },

  async remove(id: string): Promise<void> {
    await request<{ ok: boolean }>('DELETE', `/grants/${encodeURIComponent(id)}`)
  },

  async totalReleased(): Promise<number> {
    return request<number>('GET', '/grants/total-released')
  },
}

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

const announcementsApi = {
  async list(audience?: AnnouncementAudience | Role): Promise<Announcement[]> {
    const normalised =
      audience === 'students' || audience === 'admins' ? audience : undefined
    return request<Announcement[]>('GET', `/announcements${queryString({ audience: normalised })}`)
  },

  async get(id: string): Promise<Announcement | null> {
    const all = await request<Announcement[]>('GET', '/announcements')
    return all.find((item) => item.id === id) ?? null
  },

  async create(input: AnnouncementInput, _author: string): Promise<Announcement> {
    return request<Announcement>('POST', '/announcements', input)
  },

  async update(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    return request<Announcement>('PATCH', `/announcements/${encodeURIComponent(id)}`, patch)
  },

  async remove(id: string): Promise<void> {
    await request<{ ok: boolean }>('DELETE', `/announcements/${encodeURIComponent(id)}`)
  },
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

const notificationsApi = {
  async listForUser(_userId: string): Promise<Notification[]> {
    return request<Notification[]>('GET', '/notifications')
  },

  async unreadCount(_userId: string): Promise<number> {
    return request<number>('GET', '/notifications/unread-count')
  },

  async markRead(id: string): Promise<void> {
    await request<{ ok: boolean }>('POST', `/notifications/${encodeURIComponent(id)}/read`)
  },

  async markAllRead(_userId: string): Promise<void> {
    await request<{ ok: boolean }>('POST', '/notifications/read-all')
  },
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

const studentsApi = {
  async list(
    filters: { query?: string; municipality?: string | 'all' } = {},
    page = 1,
    pageSize = 10,
  ): Promise<Paginated<StudentRecord>> {
    return request<Paginated<StudentRecord>>(
      'GET',
      `/students${queryString({
        query: filters.query?.trim() || undefined,
        municipality: filters.municipality && filters.municipality !== 'all' ? filters.municipality : undefined,
        page,
        pageSize,
      })}`,
    )
  },

  async get(userId: string): Promise<StudentRecord | null> {
    return request<StudentRecord | null>('GET', `/students/${encodeURIComponent(userId)}`)
  },

  async profile(_userId: string): Promise<StudentProfile | null> {
    return request<StudentProfile | null>('GET', '/profile')
  },

  async updateProfile(_userId: string, patch: Partial<StudentProfile>): Promise<StudentProfile> {
    return request<StudentProfile>('PATCH', '/profile', patch)
  },

  async updateAccount(
    userId: string,
    patch: Partial<Pick<User, 'firstName' | 'lastName' | 'email'>>,
  ): Promise<User> {
    return request<User>('PATCH', `/students/${encodeURIComponent(userId)}`, patch)
  },

  async remove(userId: string): Promise<void> {
    await request<{ ok: boolean }>('DELETE', `/students/${encodeURIComponent(userId)}`)
  },

  async count(): Promise<number> {
    return request<number>('GET', '/students/count')
  },
}

/* ------------------------------------------------------------------ */
/* Settings and reports                                                */
/* ------------------------------------------------------------------ */

const settingsApi = {
  async get(): Promise<PlatformSettings> {
    return request<PlatformSettings>('GET', '/settings')
  },

  async update(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
    return request<PlatformSettings>('PATCH', '/settings', patch)
  },
}

interface ReportsPayload {
  overview: ReportOverview
  byStatus: BreakdownRow[]
  byScholarship: BreakdownRow[]
  byMonth: BreakdownRow[]
  registrationsByStatus: BreakdownRow[]
  grantsByMunicipality: BreakdownRow[]
}

// One request, several views: the reports screen shows all of them together and
// six round trips would only add latency.
const reportsApi = {
  async overview(): Promise<ReportOverview> {
    return (await request<ReportsPayload>('GET', '/reports')).overview
  },
  async applicationsByStatus(): Promise<BreakdownRow[]> {
    return (await request<ReportsPayload>('GET', '/reports')).byStatus
  },
  async applicationsByScholarship(): Promise<BreakdownRow[]> {
    return (await request<ReportsPayload>('GET', '/reports')).byScholarship
  },
  async applicationsByMonth(): Promise<BreakdownRow[]> {
    return (await request<ReportsPayload>('GET', '/reports')).byMonth
  },
  async registrationsByStatus(): Promise<BreakdownRow[]> {
    return (await request<ReportsPayload>('GET', '/reports')).registrationsByStatus
  },
  async grantsByMunicipality(): Promise<BreakdownRow[]> {
    return (await request<ReportsPayload>('GET', '/reports')).grantsByMunicipality
  },
}

/* ------------------------------------------------------------------ */
/* Demo / maintenance                                                  */
/* ------------------------------------------------------------------ */

const demoApi = {
  async reset(): Promise<void> {
    await request<{ ok: boolean }>('POST', '/reset')
  },

  accounts() {
    return TEST_ACCOUNTS
  },

  hardReset(): void {
    // No local store to clear when the server owns the data.
  },

  async stats(): Promise<{ scholarships: number; applications: number; students: number; grants: number }> {
    return request<{ scholarships: number; applications: number; students: number; grants: number }>(
      'GET',
      '/stats',
    )
  },
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

const documentsApi = {
  /** The signed-in student's own files, or an administrator's filtered list. */
  async list(filters: DocumentFilters = {}): Promise<StudentDocument[]> {
    return request<StudentDocument[]>('GET', `/documents${queryString({ ...filters })}`)
  },

  /** The same list with each owner attached. Administrator screens only. */
  async listRecords(filters: DocumentFilters = {}): Promise<DocumentRecord[]> {
    return request<DocumentRecord[]>('GET', `/documents/records${queryString({ ...filters })}`)
  },

  /**
   * Multipart, not JSON. The bytes travel as a file part rather than a base64
   * string, which would inflate a 5 MB certificate by a third.
   */
  async upload(input: DocumentUpload): Promise<StudentDocument> {
    const problem = validateDocumentFile(input.file)
    if (problem) throw new Error(problem)

    const form = new FormData()
    form.set('file', input.file, input.file.name)
    form.set('title', input.title)
    form.set('classification', input.classification)
    if (input.applicationId) form.set('applicationId', input.applicationId)

    return uploadRequest<StudentDocument>('/documents', form)
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
    return request<StudentDocument>('PATCH', `/documents/${id}`, changes)
  },

  async remove(id: string): Promise<void> {
    await request<{ ok: true }>('DELETE', `/documents/${id}`)
  },

  /**
   * Where the browser should fetch the bytes from. Opening this directly works
   * because the session is a same-origin cookie and the route is owner-checked.
   */
  fileUrl(id: string): string {
    return `${BASE}/documents/${id}/file`
  },
}

export const httpApi = {
  authApi,
  scholarshipsApi,
  savedApi,
  applicationsApi,
  registrationsApi,
  grantsApi,
  documentsApi,
  announcementsApi,
  notificationsApi,
  studentsApi,
  settingsApi,
  reportsApi,
  demoApi,
}

export const IS_REMOTE = BASE !== ''
