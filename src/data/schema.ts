import type {
  Announcement,
  Application,
  Grant,
  Notification,
  PlatformSettings,
  Scholarship,
  SemesterRegistration,
  StudentProfile,
  User,
} from '../types/index.ts'
import {
  sampleAnnouncements,
  sampleApplications,
  sampleCredentials,
  sampleGrants,
  sampleNotifications,
  sampleProfiles,
  sampleRegistrations,
  sampleSaved,
  sampleScholarships,
  sampleUsers,
} from './sampleData.ts'

/** Bump when the shape below changes so stale localStorage is discarded. */
export const DB_VERSION = 1

export interface DemoCredential {
  userId: string
  email: string
  /** DEMO ONLY — plain text, never do this in a real application. */
  password: string
}

export interface SavedEntry {
  studentId: string
  scholarshipId: string
  savedAt: string
}

/**
 * The complete demo store. It is serialised to localStorage wholesale, which
 * is acceptable at this size (hundreds of records) and not at any larger scale.
 *
 * This exists purely so the frontend can be exercised without a backend. See
 * the README "Demo mode" section for the limitations.
 */
export interface DemoDatabase {
  version: number
  /** User id of the signed-in session, or null. */
  sessionUserId: string | null
  users: User[]
  credentials: DemoCredential[]
  profiles: StudentProfile[]
  scholarships: Scholarship[]
  applications: Application[]
  registrations: SemesterRegistration[]
  grants: Grant[]
  announcements: Announcement[]
  notifications: Notification[]
  saved: SavedEntry[]
  settings: PlatformSettings
}

function seedSettings(): PlatformSettings {
  return {
    currentAcademicYear: '2026-2027',
    currentSemester: '1st Semester',
    applicationsOpen: true,
    maintenanceMessage: '',
    contactEmail: 'scholarships@example.gov.ph',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Build a fresh database from the sample data.
 * `structuredClone` keeps the exported sample arrays pristine so repeated
 * resets produce identical starting state.
 */
export function createSeedDatabase(): DemoDatabase {
  return {
    version: DB_VERSION,
    sessionUserId: null,
    users: structuredClone(sampleUsers),
    credentials: structuredClone(sampleCredentials),
    profiles: structuredClone(sampleProfiles),
    scholarships: structuredClone(sampleScholarships),
    applications: structuredClone(sampleApplications),
    registrations: structuredClone(sampleRegistrations),
    grants: structuredClone(sampleGrants),
    announcements: structuredClone(sampleAnnouncements),
    notifications: structuredClone(sampleNotifications),
    saved: structuredClone(sampleSaved),
    settings: seedSettings(),
  }
}
