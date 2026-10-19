import type {
  AnnouncementAudience,
  AnnouncementCategory,
  ApplicationStatus,
  DocumentClassification,
  DocumentStatus,
  EducationLevel,
  GrantStatus,
  RegistrationStatus,
  ScholarshipStatus,
  ScholarshipType,
} from '../types/index.ts'

/** Label + description for an option in a filter or form control. */
export interface Option<T extends string> {
  value: T
  label: string
}

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

/** Every LGU in Pampanga, plus the province-wide pseudo-location. */
export const MUNICIPALITIES: string[] = [
  'Province-wide',
  'Angeles City',
  'Apalit',
  'Arayat',
  'Bacolor',
  'Candaba',
  'Floridablanca',
  'Guagua',
  'Lubao',
  'Mabalacat City',
  'Macabebe',
  'Magalang',
  'Masantol',
  'Mexico',
  'Minalin',
  'Porac',
  'San Fernando City',
  'San Luis',
  'San Simon',
  'Santa Ana',
  'Santa Rita',
  'Santo Tomas',
  'Sasmuan',
]

/** Municipalities only — use when a city-specific answer makes no sense. */
export const MUNICIPALITIES_ONLY: string[] = MUNICIPALITIES.filter(
  (name) => name !== 'Province-wide',
)

/* ------------------------------------------------------------------ */
/* Scholarship vocabulary                                              */
/* ------------------------------------------------------------------ */

export const SCHOLARSHIP_TYPES: Option<ScholarshipType>[] = [
  { value: 'provincial', label: 'Provincial' },
  { value: 'municipal', label: 'Municipal / City' },
  { value: 'national', label: 'National' },
  { value: 'educational', label: 'Educational Institution' },
  { value: 'private', label: 'Private Organization' },
]

export const EDUCATION_LEVELS: Option<EducationLevel>[] = [
  { value: 'senior-high', label: 'Senior High School' },
  { value: 'college', label: 'College' },
  { value: 'vocational', label: 'Vocational / TESDA' },
  { value: 'graduate', label: 'Graduate Studies' },
]

export const SCHOLARSHIP_STATUSES: Option<ScholarshipStatus>[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'draft', label: 'Draft' },
]

export const APPLICATION_STATUSES: Option<ApplicationStatus>[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'needs-info', label: 'Needs Information' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export const REGISTRATION_STATUSES: Option<RegistrationStatus>[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
]

export const GRANT_STATUSES: Option<GrantStatus>[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'suspended', label: 'Suspended' },
]

export const ANNOUNCEMENT_AUDIENCES: Option<AnnouncementAudience>[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'admins', label: 'Administrators' },
]

export const ANNOUNCEMENT_CATEGORIES: Option<AnnouncementCategory>[] = [
  { value: 'advisory', label: 'Advisory' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'result', label: 'Result' },
  { value: 'general', label: 'General' },
]

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

/**
 * The filing categories a document can be saved under. These follow the
 * requirements listings actually ask for, so a student uploads a file once and
 * it answers that requirement everywhere.
 */
export const DOCUMENT_CLASSIFICATIONS: Option<DocumentClassification>[] = [
  { value: 'enrollment', label: 'Certificate of Enrolment' },
  { value: 'grades', label: 'Grades or Transcript' },
  { value: 'indigency', label: 'Certificate of Indigency' },
  { value: 'identification', label: 'Valid Identification' },
  { value: 'residency', label: 'Proof of Residency' },
  { value: 'good-moral', label: 'Good Moral Character' },
  { value: 'other', label: 'Other Supporting Document' },
]

export const DOCUMENT_STATUSES: Option<DocumentStatus>[] = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Needs Attention' },
]

/* ------------------------------------------------------------------ */
/* Academic terms                                                      */
/* ------------------------------------------------------------------ */

export const ACADEMIC_YEARS: string[] = [
  '2024-2025',
  '2025-2026',
  '2026-2027',
]

export const SEMESTERS: string[] = ['1st Semester', '2nd Semester', 'Summer']

export const YEAR_LEVELS: string[] = [
  'Grade 11',
  'Grade 12',
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
]

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

/** Build a `value -> label` record from an option list. */
export function labelMap<T extends string>(options: Option<T>[]): Record<T, string> {
  return options.reduce(
    (acc, option) => {
      acc[option.value] = option.label
      return acc
    },
    {} as Record<T, string>,
  )
}

export const SCHOLARSHIP_TYPE_LABELS = labelMap(SCHOLARSHIP_TYPES)
export const EDUCATION_LEVEL_LABELS = labelMap(EDUCATION_LEVELS)
export const SCHOLARSHIP_STATUS_LABELS = labelMap(SCHOLARSHIP_STATUSES)
export const APPLICATION_STATUS_LABELS = labelMap(APPLICATION_STATUSES)
export const REGISTRATION_STATUS_LABELS = labelMap(REGISTRATION_STATUSES)
export const GRANT_STATUS_LABELS = labelMap(GRANT_STATUSES)
export const ANNOUNCEMENT_AUDIENCE_LABELS = labelMap(ANNOUNCEMENT_AUDIENCES)
export const ANNOUNCEMENT_CATEGORY_LABELS = labelMap(ANNOUNCEMENT_CATEGORIES)
export const DOCUMENT_CLASSIFICATION_LABELS = labelMap(DOCUMENT_CLASSIFICATIONS)
export const DOCUMENT_STATUS_LABELS = labelMap(DOCUMENT_STATUSES)
