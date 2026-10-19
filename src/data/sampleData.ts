import type {
  Announcement,
  Application,
  ApplicationStatus,
  Grant,
  Notification,
  Scholarship,
  SemesterRegistration,
  StudentProfile,
  User,
} from '../types/index.ts'

/**
 * Seed records for the local data store.
 *
 * These entries populate the interface before a backend is connected. Provider
 * names are generic placeholders rather than real organisations, and the terms
 * described are illustrative. Replace this file with verified data, or fetch
 * listings from a backend, before the information is relied upon.
 */

/* ------------------------------------------------------------------ */
/* Date helpers (relative to "now" so the demo never goes stale)       */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000

function daysFromNow(days: number): string {
  const date = new Date(Date.now() + days * DAY_MS)
  date.setHours(9, 0, 0, 0)
  return date.toISOString()
}

function daysAgo(days: number): string {
  return daysFromNow(-days)
}

/** ISO date (yyyy-mm-dd) for a deadline N days from now. */
function dateOnly(days: number): string {
  return daysFromNow(days).slice(0, 10)
}

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export const DEMO_ACCOUNTS = {
  student: { email: 'maria.santos@example.com', password: 'student123' },
  admin: { email: 'admin@example.com', password: 'admin123' },
} as const

export const sampleUsers: User[] = [
  {
    id: 'usr_admin_1',
    email: DEMO_ACCOUNTS.admin.email,
    role: 'admin',
    firstName: 'Liza',
    lastName: 'Mendoza',
    createdAt: daysAgo(320),
    profileComplete: true,
    hasPassword: true,
    usesGoogle: false,
    emailVerified: true,
  },
  {
    id: 'usr_student_1',
    email: DEMO_ACCOUNTS.student.email,
    role: 'student',
    firstName: 'Maria',
    lastName: 'Santos',
    createdAt: daysAgo(210),
    profileComplete: true,
    hasPassword: true,
    usesGoogle: false,
    emailVerified: true,
  },
  {
    id: 'usr_student_2',
    email: 'juan.delacruz@example.com',
    role: 'student',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    createdAt: daysAgo(180),
    profileComplete: true,
    hasPassword: true,
    usesGoogle: false,
    emailVerified: true,
  },
  {
    id: 'usr_student_3',
    email: 'ana.reyes@example.com',
    role: 'student',
    firstName: 'Ana',
    lastName: 'Reyes',
    createdAt: daysAgo(150),
    profileComplete: true,
    hasPassword: true,
    usesGoogle: false,
    emailVerified: true,
  },
  {
    id: 'usr_student_4',
    email: 'paolo.bautista@example.com',
    role: 'student',
    firstName: 'Paolo',
    lastName: 'Bautista',
    createdAt: daysAgo(96),
    profileComplete: true,
    hasPassword: true,
    usesGoogle: false,
    emailVerified: true,
  },
]

/**
 * Local sign-in credentials for the seeded accounts.
 *
 * Stored in plain text because there is no backend yet. This is not
 * authentication and not secure — replace it with server-side verification
 * before deploying.
 */
export const sampleCredentials: { userId: string; email: string; password: string }[] = [
  { userId: 'usr_admin_1', email: DEMO_ACCOUNTS.admin.email, password: DEMO_ACCOUNTS.admin.password },
  { userId: 'usr_student_1', email: DEMO_ACCOUNTS.student.email, password: DEMO_ACCOUNTS.student.password },
  { userId: 'usr_student_2', email: 'juan.delacruz@example.com', password: 'student123' },
  { userId: 'usr_student_3', email: 'ana.reyes@example.com', password: 'student123' },
  { userId: 'usr_student_4', email: 'paolo.bautista@example.com', password: 'student123' },
]

/* ------------------------------------------------------------------ */
/* Student profiles                                                    */
/* ------------------------------------------------------------------ */

export const sampleProfiles: StudentProfile[] = [
  {
    userId: 'usr_student_1',
    studentNumber: '2023-00145',
    phone: '+63 917 555 0145',
    municipality: 'San Fernando City',
    barangay: 'Barangay Del Pilar',
    address: '12 Rizal Street, Barangay Del Pilar',
    birthDate: '2004-03-18',
    educationLevel: 'college',
    school: 'State University — Pampanga Campus',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    gwa: 1.45,
    householdIncome: 240000,
    guardianName: 'Elena Santos',
    guardianContact: '+63 917 555 0146',
    updatedAt: daysAgo(12),
  },
  {
    userId: 'usr_student_2',
    studentNumber: '2024-00312',
    phone: '+63 926 555 0312',
    municipality: 'Guagua',
    barangay: 'Barangay San Nicolas',
    address: '48 Sto. Niño Street, Barangay San Nicolas',
    birthDate: '2005-07-02',
    educationLevel: 'college',
    school: 'Polytechnic College',
    course: 'BS Accountancy',
    yearLevel: '2nd Year',
    gwa: 1.72,
    householdIncome: 180000,
    guardianName: 'Rodolfo Dela Cruz',
    guardianContact: '+63 926 555 0313',
    updatedAt: daysAgo(40),
  },
  {
    userId: 'usr_student_3',
    studentNumber: '2022-00098',
    phone: '+63 939 555 0098',
    municipality: 'Angeles City',
    barangay: 'Barangay Balibago',
    address: '7 MacArthur Highway, Barangay Balibago',
    birthDate: '2003-11-25',
    educationLevel: 'college',
    school: 'Institute of Technology',
    course: 'BS Civil Engineering',
    yearLevel: '4th Year',
    gwa: 1.90,
    householdIncome: 300000,
    guardianName: 'Teresa Reyes',
    guardianContact: '+63 939 555 0099',
    updatedAt: daysAgo(75),
  },
  {
    userId: 'usr_student_4',
    studentNumber: '2025-00457',
    phone: '+63 915 555 0457',
    municipality: 'Mabalacat City',
    barangay: 'Barangay Dau',
    address: '23 Dau Access Road, Barangay Dau',
    birthDate: '2006-01-09',
    educationLevel: 'senior-high',
    school: 'National High School — Dau',
    course: 'STEM Strand',
    yearLevel: 'Grade 12',
    gwa: 1.30,
    householdIncome: 150000,
    guardianName: 'Marlon Bautista',
    guardianContact: '+63 915 555 0458',
    updatedAt: daysAgo(5),
  },
]

/* ------------------------------------------------------------------ */
/* Scholarships                                                        */
/* ------------------------------------------------------------------ */

interface Seed {
  id: string
  name: string
  provider: string
  type: Scholarship['type']
  municipality: string
  educationLevels: Scholarship['educationLevels']
  description: string
  benefits: string[]
  eligibility: string[]
  requirements: string[]
  deadlineInDays: number
  applicationMode: Scholarship['applicationMode']
  externalUrl?: string
  contact: Scholarship['contact']
  instructions: string[]
  status: Scholarship['status']
  featured: boolean
  tags: string[]
}

const seeds: Seed[] = [
  {
    id: 'sch_001',
    name: 'Provincial Merit Scholarship',
    provider: 'Provincial Scholarship Office',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A general merit-based assistance programme for academically strong students enrolled in colleges and universities within the province.',
    benefits: [
      'Tuition assistance per semester',
      'Fixed monthly stipend for the duration of the academic year',
      'Book and learning material allowance',
    ],
    eligibility: [
      'Enrolled in a recognised college or university programme',
      'General weighted average within the programme cutoff',
      'Household income within the programme threshold',
    ],
    requirements: [
      'Certificate of enrolment for the current semester',
      'Copy of grades or transcript for the previous semester',
      'Certificate of indigency or proof of household income',
      'Barangay certification of residency',
    ],
    deadlineInDays: 45,
    applicationMode: 'internal',
    contact: {
      person: 'Scholarship Desk',
      email: 'scholarships@example.gov.ph',
      phone: '(045) 555 0100',
      address: 'Provincial Capitol Compound, San Fernando City, Pampanga',
    },
    instructions: [
      'Complete the online application form and attach the listed requirements.',
      'Submit the printed copy to the scholarship desk before the deadline.',
      'Wait for the review outcome notification in this system.',
    ],
    status: 'open',
    featured: true,
    tags: ['merit', 'tuition', 'stipend'],
  },
  {
    id: 'sch_002',
    name: 'Provincial STEM Excellence Grant',
    provider: 'Provincial Scholarship Office',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'Assistance aimed at students in science, technology, engineering and mathematics programmes.',
    benefits: ['Full tuition coverage per semester', 'Laboratory fee subsidy', 'Research allowance'],
    eligibility: [
      'Enrolled in a STEM degree programme',
      'Documented academic distinction in the previous semester',
    ],
    requirements: [
      'Certificate of enrolment',
      'Copy of grades',
      'Recommendation letter from the programme chair',
    ],
    deadlineInDays: 60,
    applicationMode: 'internal',
    contact: {
      email: 'stem-grants@example.gov.ph',
      phone: '(045) 555 0111',
    },
    instructions: [
      'Submit the online form together with the recommendation letter.',
      'Attend the panel interview if shortlisted.',
    ],
    status: 'open',
    featured: true,
    tags: ['stem', 'tuition', 'research'],
  },
  {
    id: 'sch_003',
    name: 'Municipal Education Assistance Program',
    provider: 'Municipal Scholarship Desk',
    type: 'municipal',
    municipality: 'Guagua',
    educationLevels: ['senior-high', 'college'],
    description:
      'Local education assistance for residents of the municipality, covering both senior high school and college levels.',
    benefits: ['Semestral financial assistance', 'Priority access to local review programmes'],
    eligibility: ['Resident of the municipality', 'Enrolled in a recognised institution'],
    requirements: ['Barangay certification of residency', 'Certificate of enrolment', 'Report card or grades'],
    deadlineInDays: 20,
    applicationMode: 'internal',
    contact: {
      phone: '(045) 555 0202',
      address: 'Municipal Hall, Guagua, Pampanga',
    },
    instructions: [
      'Fill out the online application form.',
      'Present original documents at the municipal hall for verification.',
    ],
    status: 'open',
    featured: false,
    tags: ['municipal', 'residency'],
  },
  {
    id: 'sch_004',
    name: 'City Youth Scholarship Program',
    provider: 'City Scholarship Office',
    type: 'municipal',
    municipality: 'San Fernando City',
    educationLevels: ['senior-high', 'college'],
    description:
      'Youth-focused assistance for city residents, prioritising applicants from low-income households.',
    benefits: ['Fixed semestral grant', 'Free access to city learning hubs'],
    eligibility: ['Resident of the city', 'Household income within the programme threshold'],
    requirements: ['Certificate of residency', 'Certificate of enrolment', 'Proof of household income'],
    deadlineInDays: 12,
    applicationMode: 'internal',
    contact: {
      person: 'Youth Development Office',
      email: 'youth@example.gov.ph',
    },
    instructions: [
      'Submit the online form before the deadline.',
      'Keep the reference number for follow-up.',
    ],
    status: 'open',
    featured: true,
    tags: ['youth', 'residency', 'household-income'],
  },
  {
    id: 'sch_005',
    name: 'National Government Study Grant',
    provider: 'National Government Agency',
    type: 'national',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A nationwide study grant administered directly by a national agency. Applications are handled on the agency website, not in this system.',
    benefits: ['Subsidised tuition', 'Book allowance', 'Graduation incentive'],
    eligibility: [
      'Filipino citizen enrolled in an accredited programme',
      'Household income within the national threshold',
    ],
    requirements: [
      'Completed agency application form',
      'Income tax return or certificate of low income',
      'Certificate of good moral character',
    ],
    deadlineInDays: 90,
    applicationMode: 'external',
    externalUrl: 'https://example.gov.ph/study-grant',
    contact: {
      email: 'grants@example.gov.ph',
      phone: '1-800-555-0100',
    },
    instructions: [
      'Applications are processed entirely on the agency website.',
      'This system only lists the opportunity and cannot track your submission.',
    ],
    status: 'open',
    featured: true,
    tags: ['national', 'external-application'],
  },
  {
    id: 'sch_006',
    name: 'National Vocational Skills Grant',
    provider: 'National Skills Authority',
    type: 'national',
    municipality: 'Province-wide',
    educationLevels: ['vocational'],
    description:
      'Skills training vouchers for technical and vocational programmes. Applications are handled externally.',
    benefits: ['Training fee voucher', 'Assessment fee coverage', 'Toolkit allowance'],
    eligibility: ['At least 15 years old', 'Not currently enrolled in a formal degree programme'],
    requirements: ['Valid government-issued ID', 'Completed agency registration'],
    deadlineInDays: 30,
    applicationMode: 'external',
    externalUrl: 'https://example.gov.ph/skills-voucher',
    contact: { phone: '1-800-555-0121' },
    instructions: ['Register on the skills authority website to receive a voucher number.'],
    status: 'open',
    featured: false,
    tags: ['vocational', 'skills', 'external-application'],
  },
  {
    id: 'sch_007',
    name: 'University Partner Tuition Discount',
    provider: 'State University Financial Aid Office',
    type: 'educational',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'An institution-level tuition discount for students with strong academic standing.',
    benefits: ['Percentage discount on tuition per semester'],
    eligibility: ['Enrolled in the partner institution', 'Maintaining the required academic standing'],
    requirements: ['Certificate of enrolment', 'Previous semester grades'],
    deadlineInDays: 15,
    applicationMode: 'internal',
    contact: {
      person: 'Financial Aid Office',
      email: 'finaid@example.edu.ph',
    },
    instructions: [
      'Apply through this system.',
      'Await the financial aid office assessment.',
    ],
    status: 'open',
    featured: false,
    tags: ['tuition', 'academic-standing'],
  },
  {
    id: 'sch_008',
    name: "College Dean's List Award",
    provider: 'College Financial Aid Office',
    type: 'educational',
    municipality: 'Mabalacat City',
    educationLevels: ['college'],
    description:
      'Recognition award with a cash incentive for students on the academic honours list.',
    benefits: ['One-time cash incentive', 'Certificate of recognition'],
    eligibility: ['Listed on the honours roll for the previous semester'],
    requirements: ['Copy of grades', 'Certificate of enrolment'],
    deadlineInDays: 5,
    applicationMode: 'internal',
    contact: { email: 'honors@example.edu.ph' },
    instructions: ['Submit the form before the deadline. Late submissions are not accepted.'],
    status: 'open',
    featured: false,
    tags: ['honors', 'cash-incentive'],
  },
  {
    id: 'sch_009',
    name: 'Community Foundation Scholarship',
    provider: 'Community Foundation',
    type: 'private',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'Privately funded assistance with an external application process managed by the foundation.',
    benefits: ['Semestral allowance', 'Mentorship programme'],
    eligibility: ['Enrolled in any recognised college programme', 'Demonstrated financial need'],
    requirements: ['Foundation application form', 'Essays', 'Certificate of enrolment'],
    deadlineInDays: 40,
    applicationMode: 'external',
    externalUrl: 'https://example.org/foundation-scholarship',
    contact: {
      email: 'apply@example.org',
      phone: '(02) 8555 0199',
    },
    instructions: [
      'Submit your application through the foundation website.',
      'This system does not receive or track foundation applications.',
    ],
    status: 'open',
    featured: false,
    tags: ['private', 'external-application', 'mentorship'],
  },
  {
    id: 'sch_010',
    name: 'Barangay Scholars Program',
    provider: 'Barangay Council',
    type: 'municipal',
    municipality: 'Apalit',
    educationLevels: ['college'],
    description:
      'Barangay-level assistance for residents. The application window for the current cycle has already closed.',
    benefits: ['Semestral barangay allowance'],
    eligibility: ['Resident of the barangay'],
    requirements: ['Barangay certification', 'Certificate of enrolment'],
    deadlineInDays: -5,
    applicationMode: 'internal',
    contact: { phone: '(045) 555 0303' },
    instructions: ['Watch for the next application cycle announcement.'],
    status: 'closed',
    featured: false,
    tags: ['barangay', 'closed'],
  },
  {
    id: 'sch_011',
    name: 'Indigenous Peoples Education Grant',
    provider: 'Provincial Indigenous Peoples Office',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['senior-high', 'college'],
    description:
      'Education support for members of indigenous cultural communities.',
    benefits: ['Tuition and allowance support', 'Cultural support programme'],
    eligibility: ['Member of an indigenous cultural community', 'Enrolled in a recognised institution'],
    requirements: ['Certificate of tribal membership', 'Certificate of enrolment'],
    deadlineInDays: 50,
    applicationMode: 'internal',
    contact: {
      person: 'IP Affairs Desk',
      email: 'ipaffairs@example.gov.ph',
    },
    instructions: ['Submit the online form and present the tribal certification for validation.'],
    status: 'open',
    featured: false,
    tags: ['indigenous-peoples', 'tuition'],
  },
  {
    id: 'sch_012',
    name: 'Solo Parent Dependent Scholarship',
    provider: 'Municipal Social Welfare Office',
    type: 'municipal',
    municipality: 'Lubao',
    educationLevels: ['college', 'vocational'],
    description:
      'Assistance for dependents of registered solo parents residing in the municipality.',
    benefits: ['Semestral grant', 'Priority referral to welfare programmes'],
    eligibility: ['Dependent of a registered solo parent', 'Resident of the municipality'],
    requirements: ['Solo parent identification', 'Certificate of residency', 'Certificate of enrolment'],
    deadlineInDays: 25,
    applicationMode: 'internal',
    contact: { phone: '(045) 555 0404' },
    instructions: ['Submit the online form, then present the solo parent ID for verification.'],
    status: 'open',
    featured: false,
    tags: ['solo-parent', 'welfare'],
  },
  {
    id: 'sch_013',
    name: 'Graduate Studies Fellowship',
    provider: 'Provincial Scholarship Office',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['graduate'],
    description:
      'Fellowship support for graduate-level study and research relevant to local development.',
    benefits: ['Tuition support', 'Research grant', 'Conference travel subsidy'],
    eligibility: ['Accepted into a graduate programme', 'Research topic relevant to local development'],
    requirements: ['Letter of acceptance', 'Research proposal', 'Recommendation letters'],
    deadlineInDays: 70,
    applicationMode: 'internal',
    contact: { email: 'fellowships@example.gov.ph' },
    instructions: ['Submit the form together with your research proposal.'],
    status: 'open',
    featured: false,
    tags: ['graduate', 'research'],
  },
  {
    id: 'sch_014',
    name: 'Technical Skills Training Voucher',
    provider: 'Technical Skills Center',
    type: 'educational',
    municipality: 'Angeles City',
    educationLevels: ['vocational'],
    description:
      'Voucher programme for short technical courses delivered by a local training centre. Applications are handled externally.',
    benefits: ['Course fee voucher', 'Assessment and certification fees'],
    eligibility: ['At least 18 years old', 'Resident of the province'],
    requirements: ['Valid ID', 'Completed training centre registration'],
    deadlineInDays: 10,
    applicationMode: 'external',
    externalUrl: 'https://example.com/skills-training',
    contact: {
      phone: '(045) 555 0505',
      address: 'Technical Skills Center, Angeles City',
    },
    instructions: ['Enrol directly with the training centre to claim a voucher slot.'],
    status: 'open',
    featured: false,
    tags: ['vocational', 'voucher', 'external-application'],
  },
  {
    id: 'sch_015',
    name: 'Provincial Alumni Legacy Scholarship',
    provider: 'Provincial Scholarship Office',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A draft listing that is still being prepared and is not yet visible to the public.',
    benefits: ['Tuition support'],
    eligibility: ['To be finalised'],
    requirements: ['To be finalised'],
    deadlineInDays: 120,
    applicationMode: 'internal',
    contact: { email: 'alumni@example.gov.ph' },
    instructions: ['Not yet open for applications.'],
    status: 'draft',
    featured: false,
    tags: ['draft'],
  },
]

export const sampleScholarships: Scholarship[] = seeds.map((seed, index) => {
  const { deadlineInDays, ...rest } = seed
  return {
    ...rest,
    deadline: dateOnly(deadlineInDays),
    createdAt: daysAgo(120 - index * 3),
    updatedAt: daysAgo(20 - Math.min(index, 18)),
  }
})

/* ------------------------------------------------------------------ */
/* Applications                                                        */
/* ------------------------------------------------------------------ */

interface ApplicationSeed {
  id: string
  referenceNo: string
  scholarshipId: string
  studentId: string
  status: ApplicationStatus
  submittedDaysAgo: number
  motivation: string
  reviewNotes?: string
  reviewedBy?: string
  timeline: { status: ApplicationStatus; daysAgo: number; note?: string; actor?: string }[]
}

const applicationSeeds: ApplicationSeed[] = [
  {
    id: 'app_001',
    referenceNo: 'SCH-APP-2026-0001',
    scholarshipId: 'sch_001',
    studentId: 'usr_student_1',
    status: 'approved',
    submittedDaysAgo: 48,
    motivation:
      'I am applying so that I can continue my computer science studies without additional burden on my family.',
    reviewNotes:
      'Documents complete and verified. Approved for the current academic year. A grant record must still be confirmed separately.',
    reviewedBy: 'Liza Mendoza',
    timeline: [
      { status: 'submitted', daysAgo: 48, note: 'Application submitted through the portal.' },
      { status: 'under-review', daysAgo: 42, note: 'Documents received and queued for review.' },
      { status: 'approved', daysAgo: 30, note: 'Approved after document verification.', actor: 'Liza Mendoza' },
    ],
  },
  {
    id: 'app_002',
    referenceNo: 'SCH-APP-2026-0002',
    scholarshipId: 'sch_003',
    studentId: 'usr_student_1',
    status: 'under-review',
    submittedDaysAgo: 18,
    motivation: 'Requesting municipal assistance to cover laboratory and miscellaneous fees.',
    timeline: [
      { status: 'submitted', daysAgo: 18, note: 'Application submitted through the portal.' },
      { status: 'under-review', daysAgo: 11, note: 'Forwarded to the municipal scholarship desk.' },
    ],
  },
  {
    id: 'app_003',
    referenceNo: 'SCH-APP-2026-0003',
    scholarshipId: 'sch_008',
    studentId: 'usr_student_1',
    status: 'submitted',
    submittedDaysAgo: 3,
    motivation: 'Applying for the honours recognition award for the previous semester.',
    timeline: [{ status: 'submitted', daysAgo: 3, note: 'Application submitted through the portal.' }],
  },
  {
    id: 'app_004',
    referenceNo: 'SCH-APP-2026-0004',
    scholarshipId: 'sch_010',
    studentId: 'usr_student_1',
    status: 'rejected',
    submittedDaysAgo: 62,
    motivation: 'Applying for barangay assistance.',
    reviewNotes: 'Barangay residency requirement not met. Applicant may reapply in the next cycle.',
    reviewedBy: 'Liza Mendoza',
    timeline: [
      { status: 'submitted', daysAgo: 62, note: 'Application submitted through the portal.' },
      { status: 'under-review', daysAgo: 55 },
      { status: 'rejected', daysAgo: 50, note: 'Residency requirement not met.', actor: 'Liza Mendoza' },
    ],
  },
  {
    id: 'app_005',
    referenceNo: 'SCH-APP-2026-0005',
    scholarshipId: 'sch_002',
    studentId: 'usr_student_1',
    status: 'needs-info',
    submittedDaysAgo: 22,
    motivation: 'Applying for the STEM excellence grant to support thesis research costs.',
    reviewNotes: 'Please upload the updated recommendation letter from your programme chair.',
    reviewedBy: 'Liza Mendoza',
    timeline: [
      { status: 'submitted', daysAgo: 22, note: 'Application submitted through the portal.' },
      { status: 'under-review', daysAgo: 16 },
      {
        status: 'needs-info',
        daysAgo: 9,
        note: 'Recommendation letter on file is outdated.',
        actor: 'Liza Mendoza',
      },
    ],
  },
  {
    id: 'app_006',
    referenceNo: 'SCH-APP-2026-0006',
    scholarshipId: 'sch_007',
    studentId: 'usr_student_1',
    status: 'draft',
    submittedDaysAgo: 1,
    motivation: '',
    timeline: [],
  },
  {
    id: 'app_007',
    referenceNo: 'SCH-APP-2026-0007',
    scholarshipId: 'sch_001',
    studentId: 'usr_student_2',
    status: 'under-review',
    submittedDaysAgo: 14,
    motivation: 'Seeking tuition assistance to continue my accountancy degree.',
    timeline: [
      { status: 'submitted', daysAgo: 14, note: 'Application submitted through the portal.' },
      { status: 'under-review', daysAgo: 8 },
    ],
  },
  {
    id: 'app_008',
    referenceNo: 'SCH-APP-2026-0008',
    scholarshipId: 'sch_004',
    studentId: 'usr_student_2',
    status: 'approved',
    submittedDaysAgo: 70,
    motivation: 'Applying for the city youth scholarship programme.',
    reviewNotes: 'Approved. Grant record pending confirmation.',
    reviewedBy: 'Liza Mendoza',
    timeline: [
      { status: 'submitted', daysAgo: 70 },
      { status: 'under-review', daysAgo: 64 },
      { status: 'approved', daysAgo: 58, actor: 'Liza Mendoza' },
    ],
  },
  {
    id: 'app_009',
    referenceNo: 'SCH-APP-2026-0009',
    scholarshipId: 'sch_011',
    studentId: 'usr_student_3',
    status: 'submitted',
    submittedDaysAgo: 6,
    motivation: 'Applying for education support as a member of an indigenous cultural community.',
    timeline: [{ status: 'submitted', daysAgo: 6 }],
  },
  {
    id: 'app_010',
    referenceNo: 'SCH-APP-2026-0010',
    scholarshipId: 'sch_012',
    studentId: 'usr_student_4',
    status: 'under-review',
    submittedDaysAgo: 10,
    motivation: 'Applying as a dependent of a registered solo parent.',
    timeline: [
      { status: 'submitted', daysAgo: 10 },
      { status: 'under-review', daysAgo: 4 },
    ],
  },
]

export const sampleApplications: Application[] = applicationSeeds.map((seed) => {
  const last = seed.timeline[seed.timeline.length - 1]
  const updatedDaysAgo = last ? last.daysAgo : seed.submittedDaysAgo
  return {
    id: seed.id,
    referenceNo: seed.referenceNo,
    scholarshipId: seed.scholarshipId,
    studentId: seed.studentId,
    status: seed.status,
    submittedAt: daysAgo(seed.submittedDaysAgo),
    updatedAt: daysAgo(updatedDaysAgo),
    motivation: seed.motivation,
    responses: [
      { label: 'Enrolled This Semester', value: 'Yes' },
      { label: 'Documents Ready for Submission', value: seed.status === 'draft' ? 'Not yet' : 'Yes' },
    ],
    documentNames: seed.status === 'draft' ? [] : ['Certificate of enrolment (PDF)', 'Copy of grades (PDF)'],
    reviewNotes: seed.reviewNotes,
    reviewedBy: seed.reviewedBy,
    timeline: seed.timeline.map((entry) => ({
      status: entry.status,
      at: daysAgo(entry.daysAgo),
      note: entry.note,
      actor: entry.actor,
    })),
  }
})

/* ------------------------------------------------------------------ */
/* Semester registrations (existing grantees)                          */
/* ------------------------------------------------------------------ */

export const sampleRegistrations: SemesterRegistration[] = [
  {
    id: 'reg_001',
    referenceNo: 'SCH-REG-2026-0001',
    studentId: 'usr_student_1',
    academicYear: '2025-2026',
    semester: '2nd Semester',
    school: 'State University — Pampanga Campus',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    unitsEnrolled: 21,
    gwa: 1.45,
    status: 'verified',
    submittedAt: daysAgo(150),
    updatedAt: daysAgo(143),
    remarks: 'Verified against the registrar record.',
    verifiedBy: 'Liza Mendoza',
  },
  {
    id: 'reg_002',
    referenceNo: 'SCH-REG-2026-0002',
    studentId: 'usr_student_1',
    academicYear: '2026-2027',
    semester: '1st Semester',
    school: 'State University — Pampanga Campus',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
    unitsEnrolled: 18,
    gwa: 1.52,
    status: 'pending',
    submittedAt: daysAgo(9),
    updatedAt: daysAgo(9),
  },
  {
    id: 'reg_003',
    referenceNo: 'SCH-REG-2026-0003',
    studentId: 'usr_student_2',
    academicYear: '2026-2027',
    semester: '1st Semester',
    school: 'Polytechnic College',
    course: 'BS Accountancy',
    yearLevel: '2nd Year',
    unitsEnrolled: 24,
    gwa: 1.72,
    status: 'pending',
    submittedAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: 'reg_004',
    referenceNo: 'SCH-REG-2026-0004',
    studentId: 'usr_student_3',
    academicYear: '2026-2027',
    semester: '1st Semester',
    school: 'Institute of Technology',
    course: 'BS Civil Engineering',
    yearLevel: '4th Year',
    unitsEnrolled: 15,
    gwa: 2.10,
    status: 'rejected',
    submittedAt: daysAgo(30),
    updatedAt: daysAgo(24),
    remarks: 'Units enrolled fall below the minimum required to maintain the grant.',
    verifiedBy: 'Liza Mendoza',
  },
]

/* ------------------------------------------------------------------ */
/* Confirmed grants                                                    */
/* ------------------------------------------------------------------ */

export const sampleGrants: Grant[] = [
  {
    id: 'grt_001',
    referenceNo: 'SCH-GRT-2026-0001',
    studentId: 'usr_student_1',
    scholarshipId: 'sch_001',
    applicationId: 'app_001',
    academicYear: '2026-2027',
    semester: '1st Semester',
    amount: 15000,
    status: 'active',
    releasedAt: daysAgo(28),
    confirmedBy: 'Liza Mendoza',
    remarks: 'First release for the academic year.',
  },
  {
    id: 'grt_002',
    referenceNo: 'SCH-GRT-2025-0002',
    studentId: 'usr_student_1',
    scholarshipId: 'sch_001',
    academicYear: '2025-2026',
    semester: '2nd Semester',
    amount: 15000,
    status: 'completed',
    releasedAt: daysAgo(140),
    confirmedBy: 'Liza Mendoza',
  },
  {
    id: 'grt_003',
    referenceNo: 'SCH-GRT-2026-0003',
    studentId: 'usr_student_2',
    scholarshipId: 'sch_004',
    applicationId: 'app_008',
    academicYear: '2026-2027',
    semester: '1st Semester',
    amount: 12500,
    status: 'active',
    releasedAt: daysAgo(52),
    confirmedBy: 'Liza Mendoza',
  },
  {
    id: 'grt_004',
    referenceNo: 'SCH-GRT-2026-0004',
    studentId: 'usr_student_3',
    scholarshipId: 'sch_009',
    academicYear: '2026-2027',
    semester: '1st Semester',
    amount: 10000,
    status: 'suspended',
    releasedAt: daysAgo(90),
    confirmedBy: 'Liza Mendoza',
    remarks: 'Suspended pending verification of the current enrolment.',
  },
  {
    id: 'grt_005',
    referenceNo: 'SCH-GRT-2026-0005',
    studentId: 'usr_student_4',
    scholarshipId: 'sch_007',
    academicYear: '2026-2027',
    semester: '1st Semester',
    amount: 8000,
    status: 'active',
    releasedAt: daysAgo(20),
    confirmedBy: 'Liza Mendoza',
  },
]

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export const sampleAnnouncements: Announcement[] = [
  {
    id: 'ann_001',
    title: 'Application window now open',
    category: 'deadline',
    body: 'Several scholarship listings are currently accepting applications. Check the directory for listings marked as open, and submit before each individual deadline.',
    audience: 'all',
    pinned: true,
    publishedAt: daysAgo(4),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_002',
    title: 'Semester registration for existing grantees',
    category: 'deadline',
    body: 'Grantees re-enrolling this term should file their semester registration before the end of the enrolment period for the term to be verified.',
    audience: 'students',
    pinned: true,
    publishedAt: daysAgo(12),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_003',
    title: 'Document checklist reminder',
    category: 'advisory',
    body: 'Prepare your certificate of enrolment and a copy of your grades before starting an application. Incomplete submissions take longer to review.',
    audience: 'students',
    pinned: false,
    publishedAt: daysAgo(26),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_004',
    title: 'Review schedule for administrators',
    category: 'advisory',
    body: 'Clear the review queue weekly so that applicants receive a decision promptly and grant confirmation is not delayed.',
    audience: 'admins',
    pinned: false,
    publishedAt: daysAgo(33),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_005',
    title: 'Grant release schedule',
    category: 'advisory',
    body: 'Grant releases follow the confirmation of grant records by an administrator. Confirmed releases appear on the grant records page with the amount and term.',
    audience: 'all',
    pinned: false,
    publishedAt: daysAgo(48),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_006',
    title: 'Welcome to the scholarship portal',
    category: 'general',
    body: 'Browse listings from provincial, municipal, national, educational and private providers, and track your applications, semester registration and grants in one place.',
    audience: 'all',
    pinned: false,
    publishedAt: daysAgo(60),
    author: 'Liza Mendoza',
  },
  {
    id: 'ann_007',
    title: 'First-semester grants confirmed',
    body: 'Grant records for the first semester have been confirmed and now appear under My grants. Students whose records are not yet listed should check the status of their semester registration.',
    category: 'result',
    audience: 'students',
    pinned: false,
    publishedAt: daysAgo(18),
    author: 'Liza Mendoza',
  },

]

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export const sampleNotifications: Notification[] = [
  {
    id: 'ntf_001',
    userId: 'usr_student_1',
    title: 'Application approved',
    body: 'Your application SCH-APP-2026-0001 passed review. A grant record must still be confirmed by an administrator before funds are released.',
    createdAt: daysAgo(30),
    read: false,
    link: '/student/applications/app_001',
  },
  {
    id: 'ntf_002',
    userId: 'usr_student_1',
    title: 'Additional information needed',
    body: 'Application SCH-APP-2026-0005 needs an updated recommendation letter.',
    createdAt: daysAgo(9),
    read: false,
    link: '/student/applications/app_005',
  },
  {
    id: 'ntf_003',
    userId: 'usr_student_1',
    title: 'Semester registration submitted',
    body: 'Your registration SCH-REG-2026-0002 is pending verification.',
    createdAt: daysAgo(9),
    read: true,
    link: '/student/semester-registration',
  },
  {
    id: 'ntf_004',
    userId: 'usr_student_1',
    title: 'Grant record confirmed',
    body: 'A grant of ₱15,000 was confirmed for the 1st Semester of AY 2026-2027.',
    createdAt: daysAgo(28),
    read: true,
    link: '/student/grants',
  },
  {
    id: 'ntf_005',
    userId: null,
    title: 'New listings added',
    body: 'Three scholarship listings were added to the directory this week.',
    createdAt: daysAgo(4),
    read: false,
    link: '/scholarships',
  },
  {
    id: 'ntf_006',
    userId: 'usr_admin_1',
    title: 'Applications awaiting review',
    body: 'Applications are waiting in the review queue.',
    createdAt: daysAgo(2),
    read: false,
    link: '/admin/applications',
  },
  {
    id: 'ntf_007',
    userId: 'usr_admin_1',
    title: 'Semester registrations pending verification',
    body: 'Two semester registrations are waiting for verification.',
    createdAt: daysAgo(3),
    read: false,
    link: '/admin/registrations',
  },
]

/* ------------------------------------------------------------------ */
/* Saved scholarships                                                  */
/* ------------------------------------------------------------------ */

export const sampleSaved: { studentId: string; scholarshipId: string; savedAt: string }[] = [
  { studentId: 'usr_student_1', scholarshipId: 'sch_002', savedAt: daysAgo(15) },
  { studentId: 'usr_student_1', scholarshipId: 'sch_005', savedAt: daysAgo(21) },
  { studentId: 'usr_student_1', scholarshipId: 'sch_009', savedAt: daysAgo(6) },
  { studentId: 'usr_student_1', scholarshipId: 'sch_013', savedAt: daysAgo(2) },
  { studentId: 'usr_student_2', scholarshipId: 'sch_001', savedAt: daysAgo(30) },
  { studentId: 'usr_student_4', scholarshipId: 'sch_004', savedAt: daysAgo(8) },
]
