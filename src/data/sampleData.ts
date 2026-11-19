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

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

export const DEMO_ACCOUNTS = {
  student: { email: 'maria.santos@gmail.com', password: 'student123' },
  admin: { email: 'admin@gmail.com', password: 'admin123' },
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
    email: 'juan.delacruz@gmail.com',
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
    email: 'ana.reyes@gmail.com',
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
    email: 'paolo.bautista@gmail.com',
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
  { userId: 'usr_student_2', email: 'juan.delacruz@gmail.com', password: 'student123' },
  { userId: 'usr_student_3', email: 'ana.reyes@gmail.com', password: 'student123' },
  { userId: 'usr_student_4', email: 'paolo.bautista@gmail.com', password: 'student123' },
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
  /** ISO date, or an empty string when the provider runs a rolling intake. */
  deadline: string
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
    name: 'Educational Financial Assistance Program (EFAP)',
    provider: 'Provincial Government of Pampanga',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['college', 'senior-high'],
    description:
      'The Capitol\'s main educational assistance programme for indigent college and senior high school students, released by town in batches each semester.',
    benefits: [
      'PHP 4,000 cash assistance per semester for college scholars',
      'PHP 4,000 assistance per semester for Grade 12 scholars',
      'PHP 10,000 incentive for scholars who pass their licensure examinations',
    ],
    eligibility: [
      'Resident of Pampanga',
      'Enrolled in a college, university or senior high school in the province',
      'Indigent household, as certified by the barangay',
    ],
    requirements: [
      'Accomplished assistance form from the scholarship desk',
      'Certificate of enrolment or registration for the current semester',
      'Barangay certificate of indigency',
      'Valid school identification',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Provincial Scholarship Desk',
      address: 'Provincial Capitol, City of San Fernando, Pampanga',
    },
    instructions: [
      'Inquire at the Mayor\'s Office or the municipal hall of your town for the current distribution schedule.',
      'Submit the requirements through this system and keep the printed copies for the Capitol batch release.',
      'Assistance is released per town; watch the announcement board for the date and venue.',
    ],
    status: 'open',
    featured: true,
    tags: ['provincial', 'educational assistance', 'indigent', 'per semester'],
  },
  {
    id: 'sch_002',
    name: 'Bawat Bayan Makikinabang Scholarship',
    provider: 'Provincial Government of Pampanga, through barangays',
    type: 'provincial',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A barangay-administered education component funded through the Local Government Support Fund, granting five college students in every Pampanga barangay.',
    benefits: ['PHP 20,000 per scholar, released once through the barangay'],
    eligibility: [
      'Resident of a participating barangay in Pampanga',
      'Enrolled college student',
      'Selected by the barangay from residents in need of assistance',
    ],
    requirements: [
      'Barangay endorsement and selection record',
      'Certificate of enrolment for the current semester',
      'Valid school identification',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Barangay Scholarship Contact',
      address: 'Your barangay hall',
    },
    instructions: [
      'Ask your barangay secretary whether your barangay has received its allocation.',
      'Submit your enrolment documents to the barangay for its selection.',
      'The barangay releases the assistance directly to the selected scholars.',
    ],
    status: 'open',
    featured: false,
    tags: ['barangay', 'one-time', 'lgsf'],
  },
  {
    id: 'sch_003',
    name: 'Tulong Dunong Program (TDP)',
    provider: 'Commission on Higher Education, through the congressional district offices',
    type: 'national',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A CHED subsidy that is taken up through the office of the congressional representative for your district, and closes as soon as the district quota is filled.',
    benefits: [
      'PHP 7,500 per semester',
      'PHP 15,000 per academic year',
    ],
    eligibility: [
      'Filipino citizen',
      'Enrolled in a first undergraduate degree in a SUC, LUC or private higher education institution',
      'Not a recipient of CHED scholarship programmes, DOST, SMART or another national government Student Financial Assistance Program',
      'No existing scholarship assisted by the school scholarship office',
    ],
    requirements: [
      'TDP Annex 2 application form with a 2x2 photograph',
      'Certificate of registration or certificate of enrolment, certified by the registrar',
      'Original certificate of indigency with dry seal',
      'Certificate of tax exemption or a social case study report, where indigency cannot be secured',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Congressional District Office',
      address: 'District offices: 1st Lazatin, 2nd Arroyo, 3rd Gonzales, 4th Bondoc',
    },
    instructions: [
      'Check which district your municipality belongs to before applying.',
      'The e-application closes once the district quota is reached; there are no extensions.',
      'Submit every requirement as a merged PDF, named SCHOOL ACRONYM - SURNAME, GIVEN NAME MIDDLE NAME.',
    ],
    status: 'closed',
    featured: false,
    tags: ['ched', 'subsidy', 'district office', 'quota'],
  },
  {
    id: 'sch_004',
    name: 'Lubao Educational Financial Assistance Program',
    provider: 'Municipal Government of Lubao',
    type: 'municipal',
    municipality: 'Lubao',
    educationLevels: ['college'],
    description:
      'Municipal assistance for bona fide Lubao residents enrolled in college, awarded first come, first served and excluded for students already holding a national or provincial award.',
    benefits: ['Cash educational assistance, amount set by the municipal government per call'],
    eligibility: [
      'Bona fide resident of Lubao',
      'Currently enrolled college student',
      'Not a recipient of SPES, the provincial EFAP, a CHED scholarship or a DOST scholarship',
    ],
    requirements: [
      'Original biodata with a 2x2 photograph',
      'Photocopy of the certificate of registration for the current semester',
      'Photocopy of the school identification, front and back',
      'Original certificate of indigency from your barangay',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Office of the Mayor, Lubao',
      address: 'KM 85, Santa Catalina, Lubao, Pampanga 2005',
    },
    instructions: [
      'Bring the complete set to the Mayor\'s Office; the previous call accepted 2,500 slots on a first come, first served basis.',
      "Confirm the current call with the Mayor's Office. The published announcement was for an earlier academic year.",
    ],
    status: 'closed',
    featured: false,
    tags: ['municipal', 'first come first served', 'lubao'],
  },
  {
    id: 'sch_005',
    name: 'College Educational Assistance Program',
    provider: 'Municipal Government of Mexico',
    type: 'municipal',
    municipality: 'Mexico',
    educationLevels: ['college'],
    description:
      'Educational assistance for bona fide residents of Mexico who are currently enrolled in college, released through the Municipal Government of Mexico.',
    benefits: ['Educational assistance, amount set by the municipal government per call'],
    eligibility: [
      'Bona fide resident of Mexico, Pampanga',
      'Currently enrolled in college',
    ],
    requirements: [
      'Two sets of documentary requirements, one original and one photocopy',
      'Certificate of enrolment for the current semester',
      'Any additional documents the Municipal Government requires for the current call',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Municipal Government of Mexico',
      address: 'Municipal Hall, Mexico, Pampanga',
    },
    instructions: [
      'Submit two complete sets, one original and one photocopy.',
      'Confirm the current call and the amount with the municipal hall before travelling.',
    ],
    status: 'open',
    featured: false,
    tags: ['municipal', 'mexico', 'college'],
  },
  {
    id: 'sch_006',
    name: 'Mica Gonzales Scholarship',
    provider: 'Office of Rep. Mica Gonzales, 3rd District of Pampanga',
    type: 'provincial',
    municipality: 'San Fernando City',
    educationLevels: ['college'],
    description:
      'Educational assistance from the congressional office for students of the 3rd District, covering Arayat, Bacolor, Mexico, City of San Fernando and Santa Ana.',
    benefits: ['Educational assistance, amount set by the district office per call'],
    eligibility: [
      'Resident of Arayat, Bacolor, Mexico, City of San Fernando or Santa Ana',
      'Currently enrolled college student',
    ],
    requirements: [
      'Certificate of registration or certificate of enrolment',
      'Barangay certificate of indigency',
      'National identification card with three specimen signatures and a contact number',
      'Printed copy of grades',
      'Written application form with three signatures',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'District Office of Rep. Mica Gonzales',
      address: '3rd District, Pampanga',
    },
    instructions: [
      'The amount, deadline and number of slots for the current call were not published; confirm with the district office first.',
    ],
    status: 'closed',
    featured: false,
    tags: ['district office', '3rd district', 'educational assistance'],
  },
  {
    id: 'sch_007',
    name: 'University Scholarship Programs (Scholarship Affairs Unit)',
    provider: 'Pampanga State University',
    type: 'educational',
    municipality: 'Bacolor',
    educationLevels: ['college'],
    description:
      'Pampanga State University administers about twenty scholarship programmes through its Scholarship Affairs Unit, and publishes the available slots for each one.',
    benefits: [
      'Tuition subsidy, stipend or service grant depending on the programme',
      'University-funded assistance for academic, sports and cultural achievers',
    ],
    eligibility: [
      'Enrolled student of Pampanga State University and its campuses',
      'Programme-specific academic, income and service requirements',
    ],
    requirements: [
      'Scholarship application form for the chosen programme',
      'Certificate of registration for the current semester',
      'Programme-specific supporting documents',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://scholarship.pampangastateu.edu.ph/scholarships',
    contact: {
      person: 'Scholarship Affairs Unit',
      email: '',
      phone: '(045) 649 8050 local 143',
      address: '2/F Student Affairs and Services Building, Pampanga State University, Bacolor',
    },
    instructions: [
      'Check the Scholarship Affairs Unit page for which programmes currently show available slots.',
      'The unit reports that no programme had open slots at the time this listing was written.',
    ],
    status: 'closed',
    featured: false,
    tags: ['university', 'pamsu', 'slot based'],
  },
  {
    id: 'sch_008',
    name: 'City College of San Fernando Scholarships (RA 10931)',
    provider: 'City College of San Fernando',
    type: 'educational',
    municipality: 'San Fernando City',
    educationLevels: ['college'],
    description:
      'Free Higher Education, Tertiary Education Subsidy and Tulong Dunong support for students of the city college, under the Universal Access to Quality Tertiary Education Act.',
    benefits: [
      'Free tuition and other school fees under Free Higher Education',
      'Tertiary Education Subsidy grant for priority students',
      'Tulong Dunong subsidy for eligible students',
    ],
    eligibility: [
      'Filipino citizen',
      'Meets the admission and retention policies of the college',
      'No previous undergraduate degree',
      'Not overstaying in the programme',
    ],
    requirements: [
      'Certificate of registration or certificate of enrolment',
      'Certificate of indigency from your barangay',
      'PWD identification, where applicable',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://citycollegeofsanfernando.edu.ph/scholarship-and-grants',
    contact: {
      person: 'Scholarship and Grants Desk',
      phone: '(045) 961-8957',
      address: 'City College Building, Heroes Hall, Magdalena Street, San Juan, City of San Fernando',
    },
    instructions: [
      'Apply through the college scholarship desk at the start of the semester.',
      'Keep your certificate of registration; it is required for every programme under the Act.',
    ],
    status: 'open',
    featured: false,
    tags: ['university', 'ra 10931', 'tuition'],
  },
  {
    id: 'sch_009',
    name: 'Mabalacat City College Scholarship and Grants',
    provider: 'Mabalacat City College',
    type: 'educational',
    municipality: 'Mabalacat City',
    educationLevels: ['college'],
    description:
      'Institutional and partner scholarships administered by the college Scholarship and Grants Office for enrolled MCC students.',
    benefits: ['Scholarship or grant support depending on the programme'],
    eligibility: [
      'Incoming or currently enrolled Mabalacat City College student',
      'Must meet the academic or other requirements of the specific programme',
    ],
    requirements: [
      'Scholarship application form',
      'Academic records',
      'School identification or proof of enrolment',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://mcc.edu.ph/admission-and-aid/scholarship-program',
    contact: {
      email: 'scholarshipsandgrants@mcc.edu.ph',
      phone: '0928-504-0087',
      address: 'MB 121 Internationalization Office, Mabalacat City College, Rizal Street, Barangay Dolores, Mabalacat City',
    },
    instructions: [
      'Visit the Scholarship and Grants Office for the programme list and its current requirements.',
    ],
    status: 'open',
    featured: false,
    tags: ['university', 'mcc', 'mabalacat'],
  },
  {
    id: 'sch_010',
    name: 'SM Foundation College Scholarship',
    provider: 'SM Foundation, Inc.',
    type: 'private',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A full college scholarship for incoming freshmen from low-income households in covered areas including Pampanga, with an online application window each January.',
    benefits: [
      'Full tuition for the degree programme',
      'Monthly allowance for the duration of the course',
      'Support for set courses such as accountancy, information technology, engineering and education at partner schools',
    ],
    eligibility: [
      'Incoming freshman, Grade 12 graduate or ALS completer, from a covered area including Pampanga',
      'Completed Grade 10 in a public high school, or holds a DepEd voucher from a private school',
      'General weighted average of at least 92% in the Grade 12 first semester',
      'Total household income of at most PHP 250,000 per year',
    ],
    requirements: [
      'Accomplished online application form',
      'Parent or guardian latest income tax return, certificate of non-filing, or certificate of indigency',
      'Parent or guardian cedula',
      'Grade 12 report card for the first semester',
      'Birth certificate and a 2x2 identification photograph',
      'Sketch of the home to the nearest SM Mall',
    ],
    deadline: '2027-01-31',
    applicationMode: 'external',
    externalUrl: 'https://www.sm-foundation.org/what_we_do/college-scholarship-program/',
    contact: {
      person: 'SM Foundation College Scholarship',
      address: 'Applications are online only',
    },
    instructions: [
      'The online application period opens on 1 January and closes on 31 January 2027.',
      'Prepare the income documents before the window opens; the form cannot be saved partially.',
    ],
    status: 'closed',
    featured: true,
    tags: ['private foundation', 'full tuition', 'january window'],
  },
  {
    id: 'sch_011',
    name: 'Jenra Foundation Scholarship Program',
    provider: 'Jenra Foundation',
    type: 'private',
    municipality: 'Angeles City',
    educationLevels: ['college'],
    description:
      'A full tuition scholarship with an apprenticeship and a job offer within the Jenra Group of Companies after graduation, open to students from covered areas.',
    benefits: [
      'Full tuition for the degree programme',
      'Apprenticeship with the Jenra Group during the course',
      'Job offer within the group after graduation',
    ],
    eligibility: [
      'Grade 12 graduate from a public or private school in the covered areas',
      'General weighted average of at least 88%',
      'Total household income of at most PHP 180,000 per year',
      'Priority courses: business, accountancy, management, marketing, electrical and mechanical engineering, nursing, medical technology, radiologic technology, pharmacy and information technology',
    ],
    requirements: [
      'Parent or guardian latest income tax return, certificate of non-filing or certificate of indigency',
      'Resume or bio data',
      'Latest Grade 12 report card, or the most recent report card if already in college',
      'Birth certificate and a 2x2 identification photograph',
      '500-word essay on why the applicant deserves to be a Jenra scholar',
      'Sketch of the home showing its location relative to the nearest Jenra Group branch',
    ],
    deadline: '2026-05-15',
    applicationMode: 'internal',
    contact: {
      person: 'Jenra Foundation Scholarship Committee',
      address: 'Angeles City, Pampanga',
    },
    instructions: [
      'The 2026 application period ran from 15 April to 15 May and is closed.',
      'Endorsed partner schools include Holy Angel University, Angeles University Foundation, Republic Central Colleges, University of the Assumption, College of Our Lady of Mt. Carmel, Systems Plus College Foundation and Our Lady of Fatima University.',
    ],
    status: 'closed',
    featured: false,
    tags: ['private foundation', 'angeles', 'apprenticeship', 'full tuition'],
  },
  {
    id: 'sch_012',
    name: 'Social Action Center of Pampanga Educational Assistance',
    provider: 'Social Action Center of Pampanga (SACOP)',
    type: 'private',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'Educational assistance for students from families in need, administered by the social action arm of the Archdiocese and paired with community service.',
    benefits: ['Educational assistance for tuition and school expenses'],
    eligibility: [
      'Student from a family in need, as assessed by the center',
      'Willing to take part in the service activities of the center',
    ],
    requirements: [
      'Application form and requirements issued by the center',
      'Certificate of enrolment or registration',
      'Proof of household income or a certificate of indigency',
    ],
    deadline: '',
    applicationMode: 'internal',
    contact: {
      person: 'Social Action Center of Pampanga',
      address: 'Archdiocese of San Fernando, City of San Fernando, Pampanga',
    },
    instructions: [
      'Inquire at the center for the current intake and its requirements; intake is not announced on a fixed schedule.',
    ],
    status: 'open',
    featured: false,
    tags: ['church', 'service', 'educational assistance'],
  },
  {
    id: 'sch_013',
    name: 'Tzu Chi Pampanga Scholarship',
    provider: 'Tzu Chi Foundation, Pampanga liaison office',
    type: 'private',
    municipality: 'Angeles City',
    educationLevels: ['college'],
    description:
      'College scholarships for students from low-income families in Pampanga, paired with a values and life-skills class, with partner schools that include Pampanga State Agricultural University.',
    benefits: [
      'Financial assistance toward tuition and school expenses',
      'Values and life-skills class for scholars',
    ],
    eligibility: [
      'College student from a low-income family in Pampanga',
      'Enrolled in, or accepted by, a partner school',
      'Willing to join the values and life-skills class',
    ],
    requirements: [
      'Application form issued by the liaison office',
      'Certificate of enrolment and report of grades',
      'Proof of household income or a certificate of indigency',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://tzuchi.org.ph/apply',
    contact: {
      person: 'Tzu Chi Pampanga liaison office',
      address: 'Angeles City, Pampanga',
    },
    instructions: [
      'The national page reported the 2026 to 2027 intake as closed; ask the liaison office about the next call.',
    ],
    status: 'closed',
    featured: false,
    tags: ['private foundation', 'angeles', 'values class'],
  },
  {
    id: 'sch_014',
    name: 'Tertiary Education Subsidy (TES)',
    provider: 'UniFAST, Commission on Higher Education',
    type: 'national',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A grant-in-aid programme under the Universal Access to Quality Tertiary Education Act that covers the full or partial cost of tertiary education for priority students.',
    benefits: [
      'Grant-in-aid for tuition and other school fees',
      'Allowance for books, transportation and other education-related expenses',
    ],
    eligibility: [
      'Filipino citizen',
      'Meets the admission and retention policies of the SUC or LUC',
      'No previous undergraduate degree',
      'Not overstaying in the programme',
      'Enrolled in a CHED-recognised programme',
      'Not a recipient of another national government Student Financial Assistance Program',
    ],
    requirements: [
      'TES application form',
      'Certificate of registration or certificate of enrolment, authenticated by the registrar',
      'Certificate of indigency, or a social case study report',
      'Landbank account details for the release of the grant',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://unifast.gov.ph/tes.html',
    contact: {
      person: 'Scholarship office of your school',
      address: 'UniFAST, Commission on Higher Education',
    },
    instructions: [
      'Apply through your school scholarship office while the CHED portal is open.',
      'Applications are cross-matched nationwide; duplicates from another school will be rejected.',
      'Submitting an application does not guarantee a slot.',
    ],
    status: 'open',
    featured: false,
    tags: ['national', 'unifast', 'grant in aid', 'ra 10931'],
  },
  {
    id: 'sch_015',
    name: 'DOST-SEI Undergraduate Scholarship',
    provider: 'Department of Science and Technology, Science Education Institute',
    type: 'national',
    municipality: 'Province-wide',
    educationLevels: ['college'],
    description:
      'A scholarship for students entering science, technology, engineering and mathematics courses, awarded after the DOST-SEI national examination.',
    benefits: [
      'Tuition and other school fees up to the approved ceiling',
      'Monthly living allowance',
      'Book allowance and transportation allowance',
    ],
    eligibility: [
      'Filipino citizen',
      'Graduating senior high school student or college freshman',
      'Enrolled in a science, mathematics or engineering priority course',
      'Must pass the DOST-SEI scholarship examination',
    ],
    requirements: [
      'Accomplished DOST-SEI application form',
      'PSA birth certificate',
      'Form 138 or SF9 senior high school report card',
      'Certificate of good moral character',
      'Proof of household income',
    ],
    deadline: '',
    applicationMode: 'external',
    externalUrl: 'https://region3.dost.gov.ph/contact-us',
    contact: {
      person: 'DOST Region 3 Scholarship Office',
      email: 'iskolars3.undergrad@ro3.dost.gov.ph',
      phone: '0920-280-0569',
      address: 'Diosdado Macapagal Government Center, Maimpis, City of San Fernando, Pampanga',
    },
    instructions: [
      'Watch for the examination call from DOST Region 3; applications open well before the school year.',
      'Pampanga enquiries: 2/F DOST Building, Capitol Compound, Barangay Santo Niño, City of San Fernando, (045) 961-0967.',
    ],
    status: 'closed',
    featured: false,
    tags: ['national', 'dost', 'science', 'examination'],
  },
]

export const sampleScholarships: Scholarship[] = seeds.map((seed, index) => ({
  ...seed,
  // Every listing below was checked against its provider's published page on
  // this date. Bump per listing when it is rechecked; do not bump the whole set
  // without looking at each one.
  verifiedAt: '2026-11-14T00:00:00.000Z',
  createdAt: daysAgo(120 - index * 3),
  updatedAt: daysAgo(20 - Math.min(index, 18)),
}))

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
