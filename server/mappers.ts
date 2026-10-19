import type {
  Announcement,
  Application,
  ApplicationResponse,
  ApplicationTimelineEntry,
  Grant,
  Notification,
  PlatformSettings,
  Scholarship,
  ScholarshipContact,
  SemesterRegistration,
  StudentDocument,
  StudentProfile,
  User,
} from '../src/types/index.ts'

/**
 * Row ↔ domain mapping.
 *
 * SQLite has no array or object column types, so those fields are stored as
 * JSON strings. Every parse is defensive: a hand-edited or half-migrated row
 * should degrade to an empty value rather than take the request down.
 */

function parseArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function parseObject<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function stringifyArray(value: string[] | undefined): string {
  return JSON.stringify(value ?? [])
}

export function stringifyObject(value: unknown): string {
  return JSON.stringify(value ?? {})
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

interface UserRow {
  id: string
  email: string
  role: string
  firstName: string
  lastName: string
  createdAt: Date
}

export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'student',
    firstName: row.firstName,
    lastName: row.lastName,
    createdAt: row.createdAt.toISOString(),
  }
}

interface ProfileRow {
  userId: string
  studentNumber: string
  phone: string
  municipality: string
  barangay: string
  address: string
  birthDate: string
  educationLevel: string
  school: string
  course: string
  yearLevel: string
  gwa: number | null
  householdIncome: number | null
  guardianName: string
  guardianContact: string
  updatedAt: Date
}

export function toProfile(row: ProfileRow): StudentProfile {
  return {
    userId: row.userId,
    studentNumber: row.studentNumber,
    phone: row.phone,
    municipality: row.municipality,
    barangay: row.barangay,
    address: row.address,
    birthDate: row.birthDate,
    educationLevel: row.educationLevel as StudentProfile['educationLevel'],
    school: row.school,
    course: row.course,
    yearLevel: row.yearLevel,
    gwa: row.gwa,
    householdIncome: row.householdIncome,
    guardianName: row.guardianName,
    guardianContact: row.guardianContact,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Scholarships                                                        */
/* ------------------------------------------------------------------ */

interface ScholarshipRow {
  id: string
  name: string
  provider: string
  type: string
  municipality: string
  educationLevels: string
  description: string
  benefits: string
  eligibility: string
  requirements: string
  deadline: string
  applicationMode: string
  externalUrl: string | null
  contact: string
  instructions: string
  status: string
  featured: boolean
  tags: string
  createdAt: Date
  updatedAt: Date
}

export function toScholarship(row: ScholarshipRow): Scholarship {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    type: row.type as Scholarship['type'],
    municipality: row.municipality,
    educationLevels: parseArray(row.educationLevels) as Scholarship['educationLevels'],
    description: row.description,
    benefits: parseArray(row.benefits),
    eligibility: parseArray(row.eligibility),
    requirements: parseArray(row.requirements),
    deadline: row.deadline,
    applicationMode: row.applicationMode as Scholarship['applicationMode'],
    externalUrl: row.externalUrl ?? undefined,
    contact: parseObject<ScholarshipContact>(row.contact, {}),
    instructions: parseArray(row.instructions),
    status: row.status as Scholarship['status'],
    featured: row.featured,
    tags: parseArray(row.tags),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

interface TimelineRow {
  status: string
  at: Date
  note: string | null
  actor: string | null
}

interface ApplicationRow {
  id: string
  referenceNo: string
  scholarshipId: string
  studentId: string
  status: string
  submittedAt: Date
  updatedAt: Date
  motivation: string
  responses: string
  documentNames: string
  reviewNotes: string | null
  reviewedBy: string | null
  timeline?: TimelineRow[]
}

export function toApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    scholarshipId: row.scholarshipId,
    studentId: row.studentId,
    status: row.status as Application['status'],
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    motivation: row.motivation,
    responses: parseObject<ApplicationResponse[]>(row.responses, []),
    documentNames: parseArray(row.documentNames),
    reviewNotes: row.reviewNotes ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    timeline: (row.timeline ?? []).map<ApplicationTimelineEntry>((entry) => ({
      status: entry.status as ApplicationTimelineEntry['status'],
      at: entry.at.toISOString(),
      note: entry.note ?? undefined,
      actor: entry.actor ?? undefined,
    })),
  }
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

interface DocumentRow {
  id: string
  studentId: string
  applicationId: string | null
  title: string
  classification: string
  fileName: string
  mimeType: string
  size: number
  uploadedAt: Date
  status: string
  note: string | null
}

/**
 * Note what is deliberately absent: `storedName`. Where a file sits on disk is
 * not the browser's business, and a client that never learns it cannot ask for
 * a file by path. Downloads go through the ownership check on the document id.
 */
export function toDocument(row: DocumentRow): StudentDocument {
  return {
    id: row.id,
    studentId: row.studentId,
    applicationId: row.applicationId,
    title: row.title,
    classification: row.classification as StudentDocument['classification'],
    fileName: row.fileName,
    mimeType: row.mimeType,
    size: row.size,
    uploadedAt: row.uploadedAt.toISOString(),
    status: row.status as StudentDocument['status'],
    note: row.note,
  }
}

/* ------------------------------------------------------------------ */
/* Registrations, grants, announcements, notifications, settings        */
/* ------------------------------------------------------------------ */

interface RegistrationRow {
  id: string
  referenceNo: string
  studentId: string
  academicYear: string
  semester: string
  school: string
  course: string
  yearLevel: string
  unitsEnrolled: number
  gwa: number | null
  status: string
  submittedAt: Date
  updatedAt: Date
  remarks: string | null
  verifiedBy: string | null
}

export function toRegistration(row: RegistrationRow): SemesterRegistration {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    studentId: row.studentId,
    academicYear: row.academicYear,
    semester: row.semester,
    school: row.school,
    course: row.course,
    yearLevel: row.yearLevel,
    unitsEnrolled: row.unitsEnrolled,
    gwa: row.gwa,
    status: row.status as SemesterRegistration['status'],
    submittedAt: row.submittedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    remarks: row.remarks ?? undefined,
    verifiedBy: row.verifiedBy ?? undefined,
  }
}

interface GrantRow {
  id: string
  referenceNo: string
  studentId: string
  scholarshipId: string
  applicationId: string | null
  registrationId: string | null
  academicYear: string
  semester: string
  amount: number
  status: string
  releasedAt: Date
  confirmedBy: string
  remarks: string | null
}

export function toGrant(row: GrantRow): Grant {
  return {
    id: row.id,
    referenceNo: row.referenceNo,
    studentId: row.studentId,
    scholarshipId: row.scholarshipId,
    applicationId: row.applicationId ?? undefined,
    registrationId: row.registrationId ?? undefined,
    academicYear: row.academicYear,
    semester: row.semester,
    amount: row.amount,
    status: row.status as Grant['status'],
    releasedAt: row.releasedAt.toISOString(),
    confirmedBy: row.confirmedBy,
    remarks: row.remarks ?? undefined,
  }
}

interface AnnouncementRow {
  id: string
  title: string
  body: string
  audience: string
  pinned: boolean
  publishedAt: Date
  author: string
}

export function toAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience as Announcement['audience'],
    pinned: row.pinned,
    publishedAt: row.publishedAt.toISOString(),
    author: row.author,
  }
}

interface NotificationRow {
  id: string
  userId: string | null
  title: string
  body: string
  createdAt: Date
  read: boolean
  link: string | null
}

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    read: row.read,
    link: row.link ?? undefined,
  }
}

interface SettingsRow {
  currentAcademicYear: string
  currentSemester: string
  applicationsOpen: boolean
  maintenanceMessage: string
  contactEmail: string
  updatedAt: Date
}

export function toSettings(row: SettingsRow): PlatformSettings {
  return {
    currentAcademicYear: row.currentAcademicYear,
    currentSemester: row.currentSemester,
    applicationsOpen: row.applicationsOpen,
    maintenanceMessage: row.maintenanceMessage,
    contactEmail: row.contactEmail,
    updatedAt: row.updatedAt.toISOString(),
  }
}
