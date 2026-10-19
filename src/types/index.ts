/**
 * Domain models for Scholar.
 *
 * These types are the single source of truth for the shape of data flowing
 * between the UI and the data-access layer (`src/lib/api.ts`). When a real
 * backend is added, keep these types and swap the API implementation.
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
  /**
   * False for an account created through Google sign-in that has not yet
   * supplied the details Google cannot provide. Route guards send these
   * accounts to the profile step before anything else.
   */
  profileComplete: boolean
  /** Whether a password is set. False for Google-only accounts. */
  hasPassword: boolean
  /** Whether this account can be entered with Google. */
  usesGoogle: boolean
  /**
   * Whether the address has been confirmed.
   *
   * Google accounts arrive already confirmed, because Google is the authority
   * for those addresses. Defaults to true in the schema so the records that
   * predate this feature are not retroactively treated as unverified.
   */
  emailVerified: boolean
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
   * File names the student indicates they will submit, ticked from the
   * listing's requirements. These are labels, not uploads — the actual files
   * live in `StudentDocument`, which is why uploading is separate from
   * answering the checklist.
   */
  documentNames: string[]
  reviewNotes?: string
  reviewedBy?: string
  timeline: ApplicationTimelineEntry[]
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
}

export interface GrantFilters {
  query?: string
  status?: GrantStatus | 'all'
  academicYear?: string | 'all'
  semester?: string | 'all'
  studentId?: string
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

/**
 * How a submitted document is filed.
 *
 * This is the "classification" the student picks (or accepts from the
 * suggestion) and an administrator can correct. It decides which group the
 * document sits in on the student's profile, and which requirement on a
 * listing it is evidence for.
 */
export type DocumentClassification =
  | 'enrollment'
  | 'grades'
  | 'indigency'
  | 'identification'
  | 'residency'
  | 'good-moral'
  | 'other'

export type DocumentStatus = 'submitted' | 'verified' | 'rejected'

/**
 * A file held against a student's profile.
 *
 * Documents belong to the student, not to a single application, because the
 * same certificate of enrolment is evidence for every listing the student
 * applies to. `applicationId` is set only when the student attached it to one
 * particular application.
 */
export interface StudentDocument {
  id: string
  studentId: string
  /** Set when uploaded against a specific application rather than the profile. */
  applicationId: string | null
  /** Human label, defaulted from the file name and editable by the student. */
  title: string
  classification: DocumentClassification
  fileName: string
  mimeType: string
  /** Size in bytes. */
  size: number
  uploadedAt: string
  status: DocumentStatus
  /** Administrator note. Required in practice when `status` is `rejected`. */
  note: string | null
}

/**
 * One file as it arrives from a file input, before the API stores it. The
 * local data layer keeps the bytes as a data URL; the HTTP layer sends them
 * as multipart form data.
 */
export interface DocumentUpload {
  file: File
  title: string
  classification: DocumentClassification
  /** Set when the file is attached to one application rather than the profile. */
  applicationId?: string | null
}

export interface DocumentFilters {
  query?: string
  classification?: DocumentClassification | 'all'
  status?: DocumentStatus | 'all'
  studentId?: string
  applicationId?: string
}

/** A document plus the student it belongs to, for administrator list views. */
export interface DocumentRecord {
  document: StudentDocument
  student: User
}

/* ------------------------------------------------------------------ */
/* Announcements & notifications                                       */
/* ------------------------------------------------------------------ */

export type AnnouncementAudience = 'all' | 'students' | 'admins'

/**
 * What kind of notice this is.
 *
 * The distinction earns its place: a deadline and a result are acted on
 * differently, and a channel that mixes them forces every reader to parse the
 * body to find out which it is.
 */
export type AnnouncementCategory = 'advisory' | 'deadline' | 'result' | 'general'

export interface Announcement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  pinned: boolean
  publishedAt: string
  author: string
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

/**
 * What registration collects.
 *
 * The student details are part of sign-up rather than a later profile edit,
 * because eligibility depends on them: a municipal scholarship needs a
 * barangay, an age-limited one needs a birth date, and a listing for college
 * students is noise to a senior-high applicant. Collecting them once, up front,
 * means the account is useful from its first page rather than after a second
 * visit to the profile screen.
 */
export interface RegisterInput {
  email: string
  password: string
  firstName: string
  lastName: string

  /* Student details */
  phone: string
  municipality: string
  barangay: string
  /** ISO date (yyyy-mm-dd). */
  birthDate: string
  educationLevel: EducationLevel
  school: string
  course: string
  yearLevel: string

  /* Optional: not every applicant knows these yet. */
  address?: string
  gwa?: number | null
  householdIncome?: number | null
  guardianName?: string
  guardianContact?: string
}

export interface LoginInput {
  email: string
  password: string
}

/**
 * Details Google cannot supply, collected once for a Google-created account.
 *
 * Carries the same student details registration collects, so both sign-up
 * paths produce the same shape of record.
 */
export interface CompleteProfileInput {
  firstName: string
  lastName: string
  phone: string
  municipality: string
  barangay: string
  birthDate: string
  educationLevel: EducationLevel
  school: string
  course: string
  yearLevel: string
  address: string
  gwa: number | null
  householdIncome: number | null
  guardianName: string
  guardianContact: string
}

/**
 * The student details every sign-up path collects, as raw form strings.
 *
 * Shared by the registration form and the Google profile step so the two
 * cannot drift into asking for different things. Numbers and dates stay as
 * strings because that is what form controls produce; the API converts.
 */
export interface StudentDetailsValues {
  phone: string
  municipality: string
  barangay: string
  birthDate: string
  educationLevel: string
  school: string
  course: string
  yearLevel: string
  address: string
  gwa: string
  householdIncome: string
  guardianName: string
  guardianContact: string
}

/* ------------------------------------------------------------------ */
/* One-time codes                                                      */
/* ------------------------------------------------------------------ */

/**
 * Why a code was issued.
 *
 * Scoped on purpose: a code sent to confirm an email address must not be
 * replayable to reset a password, so a challenge is only ever valid for the
 * purpose it was created for.
 */
export type OtpPurpose = 'verify-email' | 'reset-password'

/**
 * What the browser learns when a code is requested. Deliberately carries no
 * information about whether the address exists, and never the code itself.
 */
export interface OtpChallenge {
  expiresInSeconds: number
  resendAfterSeconds: number
}

export interface OtpRequestResult extends OtpChallenge {
  submitted: boolean
  /**
   * Where the message actually went. The interface reports this rather than
   * assuming an email was sent, which is why a development server can say the
   * code went to the log and mean it.
   */
  delivery: 'log' | 'email' | 'none'
}
