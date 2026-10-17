/**
 * Domain models for Pampanga GrantConnect.
 *
 * These types are the single source of truth for the shape of data flowing
 * between the UI and the data-access layer (`src/lib/api.ts`). When a real
 * backend is added, keep these types and swap the API implementation.
 *
 * NOTE: every record carries `isSample` where the data is placeholder content
 * (see business rule 1 in the project brief). Sample records must stay clearly
 * labelled in the UI until verified information replaces them.
 */

/* ------------------------------------------------------------------ */
/* Users & access control                                             */
/* ------------------------------------------------------------------ */

export type Role = 'student' | 'admin'

export interface User {
  id: string
  email: string
  role: Role
  firstName: string
  lastName: string
  createdAt: string
}

export interface StudentProfile {
  userId: string
  /** Institution-issued student number, when known. */
  studentNumber: string
  phone: string
  municipality: string
  barangay: string
  address: string
  birthDate: string
  educationLevel: EducationLevel
  school: string
  course: string
  yearLevel: string
  /** General weighted average, or null when not yet provided. */
  gwa: number | null
  /** Annual household income in PHP, or null when not yet provided. */
  householdIncome: number | null
  guardianName: string
  guardianContact: string
  updatedAt: string
}

/**
 * A student plus derived counts, for administrator list views.
 * Never exposed on a public route.
 */
export interface StudentRecord {
  user: User
  profile: StudentProfile | null
  applicationCount: number
  grantCount: number
}

/* ------------------------------------------------------------------ */
/* Scholarships                                                        */
/* ------------------------------------------------------------------ */

export type ScholarshipType =
  | 'provincial'
  | 'municipal'
  | 'national'
  | 'educational'
  | 'private'

export type EducationLevel =
  | 'senior-high'
  | 'college'
  | 'vocational'
  | 'graduate'

export type ScholarshipStatus = 'open' | 'closed' | 'draft'

/**
 * How a student applies.
 * - `internal`: the application is submitted through this system and is
 *   tracked here (see business rule 2).
 * - `external`: the provider handles the application on their own website.
 *   We only surface the link; we do not track that application's progress.
 */
export type ApplicationMode = 'internal' | 'external'

export interface ScholarshipContact {
  person?: string
  email?: string
  phone?: string
  address?: string
}

export interface Scholarship {
  id: string
  name: string
  provider: string
  type: ScholarshipType
  /** A Pampanga LGU name, or `Province-wide`. */
  municipality: string
  educationLevels: EducationLevel[]
  description: string
  benefits: string[]
  eligibility: string[]
  requirements: string[]
  /** ISO date (yyyy-mm-dd) of the application deadline. */
  deadline: string
  applicationMode: ApplicationMode
  /** Required when `applicationMode` is `external`. */
  externalUrl?: string
  contact: ScholarshipContact
  instructions: string[]
  status: ScholarshipStatus
  featured: boolean
  tags: string[]
  isSample: boolean
  createdAt: string
  updatedAt: string
}

export interface ScholarshipFilters {
  query?: string
  type?: ScholarshipType | 'all'
  municipality?: string | 'all'
  educationLevel?: EducationLevel | 'all'
  status?: ScholarshipStatus | 'all'
  /** Only include scholarships whose deadline is within N days. */
  deadlineWithinDays?: number | null
  featuredOnly?: boolean
  /**
   * Include `draft` listings. Administrator screens pass `true`; public pages
   * never do, so unpublished listings cannot leak into the directory.
   */
  includeDrafts?: boolean
  sort?: 'deadline' | 'newest' | 'name'
}

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

/**
 * Lifecycle of an internally submitted application.
 *
 * `approved` means the application passed review. It is deliberately NOT the
 * same as a confirmed grant — see business rule 4: a grant record must be
 * confirmed separately by an administrator.
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-review'
  | 'needs-info'
  | 'approved'
  | 'rejected'

export interface ApplicationTimelineEntry {
  status: ApplicationStatus
  at: string
  note?: string
  actor?: string
}

export interface ApplicationResponse {
  label: string
  value: string
}

export interface Application {
  id: string
  referenceNo: string
  scholarshipId: string
  studentId: string
  status: ApplicationStatus
  submittedAt: string
  updatedAt: string
  motivation: string
  responses: ApplicationResponse[]
  /**
   * File names the student indicates they will submit. Document upload is NOT
   * implemented; these are text labels only (business rule 10).
   */
  documentNames: string[]
  reviewNotes?: string
  reviewedBy?: string
  timeline: ApplicationTimelineEntry[]
  isSample: boolean
}

export interface ApplicationFilters {
  query?: string
  status?: ApplicationStatus | 'all'
  scholarshipId?: string | 'all'
  studentId?: string
}

/* ------------------------------------------------------------------ */
/* Semester registration (existing grantees only)                      */
/* ------------------------------------------------------------------ */

export type RegistrationStatus = 'pending' | 'verified' | 'rejected'

/**
 * Semester-specific re-registration for students who ALREADY hold a grant.
 * Tracked separately from new scholarship applications (business rule 5).
 */
export interface SemesterRegistration {
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
  status: RegistrationStatus
  submittedAt: string
  updatedAt: string
  remarks?: string
  verifiedBy?: string
  isSample: boolean
}

export interface RegistrationFilters {
  query?: string
  status?: RegistrationStatus | 'all'
  academicYear?: string | 'all'
  semester?: string | 'all'
  studentId?: string
}

/* ------------------------------------------------------------------ */
/* Confirmed grants                                                    */
/* ------------------------------------------------------------------ */

export type GrantStatus = 'active' | 'completed' | 'suspended'

/**
 * A confirmed grant record. Only an administrator can create or confirm these
 * (business rules 4 and 6).
 */
export interface Grant {
  id: string
  referenceNo: string
  studentId: string
  scholarshipId: string
  /** Set when the grant was confirmed from an approved application. */
  applicationId?: string
  /** Set when the grant was confirmed from a semester registration. */
  registrationId?: string
  academicYear: string
  semester: string
  /** Released amount in PHP. */
  amount: number
  status: GrantStatus
  /** ISO date the funds were released. */
  releasedAt: string
  confirmedBy: string
  remarks?: string
  isSample: boolean
}

export interface GrantFilters {
  query?: string
  status?: GrantStatus | 'all'
  academicYear?: string | 'all'
  semester?: string | 'all'
  studentId?: string
}

/* ------------------------------------------------------------------ */
/* Announcements & notifications                                       */
/* ------------------------------------------------------------------ */

export type AnnouncementAudience = 'all' | 'students' | 'admins'

export interface Announcement {
  id: string
  title: string
  body: string
  audience: AnnouncementAudience
  pinned: boolean
  publishedAt: string
  author: string
  isSample: boolean
}

export interface Notification {
  id: string
  /** `null` means the notification is broadcast to every signed-in user. */
  userId: string | null
  title: string
  body: string
  createdAt: string
  read: boolean
  /** In-app route to open, when relevant. */
  link?: string
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Platform-wide configuration editable on the administrator settings page. */
export interface PlatformSettings {
  currentAcademicYear: string
  currentSemester: string
  /** When false, new scholarship applications are closed platform-wide. */
  applicationsOpen: boolean
  /** Shown as a banner on the public home page when non-empty. */
  maintenanceMessage: string
  contactEmail: string
  updatedAt: string
}

export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string
  municipality: string
  phone: string
}

export interface LoginInput {
  email: string
  password: string
}
