import { prisma } from '../server/db.ts'
import { stringifyArray, stringifyObject } from '../server/mappers.ts'
import { hashPassword } from '../server/passwords.ts'
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
} from '../src/data/sampleData.ts'

/**
 * Seeds the database from the same records the frontend ships with, so there is
 * one source of truth for the placeholder content.
 *
 * Passwords are taken from the demo credentials and stored as scrypt hashes.
 *
 * Run with: npm run db:seed
 */

async function reset(): Promise<void> {
  // Child rows first: SQLite enforces the foreign keys.
  await prisma.grant.deleteMany()
  await prisma.applicationTimelineEntry.deleteMany()
  await prisma.application.deleteMany()
  await prisma.semesterRegistration.deleteMany()
  await prisma.savedScholarship.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.session.deleteMany()
  await prisma.studentProfile.deleteMany()
  await prisma.scholarship.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.platformSettings.deleteMany()
  await prisma.user.deleteMany()
}

async function seed(): Promise<void> {
  await reset()

  const passwordByUserId = new Map(sampleCredentials.map((c) => [c.userId, c.password]))

  for (const user of sampleUsers) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        passwordHash: hashPassword(passwordByUserId.get(user.id) ?? 'changeme123'),
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: new Date(user.createdAt),
      },
    })
  }

  for (const profile of sampleProfiles) {
    await prisma.studentProfile.create({
      data: {
        userId: profile.userId,
        studentNumber: profile.studentNumber,
        phone: profile.phone,
        municipality: profile.municipality,
        barangay: profile.barangay,
        address: profile.address,
        birthDate: profile.birthDate,
        educationLevel: profile.educationLevel,
        school: profile.school,
        course: profile.course,
        yearLevel: profile.yearLevel,
        gwa: profile.gwa,
        householdIncome: profile.householdIncome,
        guardianName: profile.guardianName,
        guardianContact: profile.guardianContact,
        updatedAt: new Date(profile.updatedAt),
      },
    })
  }

  for (const scholarship of sampleScholarships) {
    await prisma.scholarship.create({
      data: {
        id: scholarship.id,
        name: scholarship.name,
        provider: scholarship.provider,
        type: scholarship.type,
        municipality: scholarship.municipality,
        educationLevels: stringifyArray(scholarship.educationLevels),
        description: scholarship.description,
        benefits: stringifyArray(scholarship.benefits),
        eligibility: stringifyArray(scholarship.eligibility),
        requirements: stringifyArray(scholarship.requirements),
        deadline: scholarship.deadline,
        applicationMode: scholarship.applicationMode,
        externalUrl: scholarship.externalUrl ?? null,
        contact: stringifyObject(scholarship.contact),
        instructions: stringifyArray(scholarship.instructions),
        status: scholarship.status,
        featured: scholarship.featured,
        tags: stringifyArray(scholarship.tags),
        createdAt: new Date(scholarship.createdAt),
        updatedAt: new Date(scholarship.updatedAt),
      },
    })
  }

  for (const application of sampleApplications) {
    await prisma.application.create({
      data: {
        id: application.id,
        referenceNo: application.referenceNo,
        scholarshipId: application.scholarshipId,
        studentId: application.studentId,
        status: application.status,
        submittedAt: new Date(application.submittedAt),
        updatedAt: new Date(application.updatedAt),
        motivation: application.motivation,
        responses: stringifyObject(application.responses),
        documentNames: stringifyArray(application.documentNames),
        reviewNotes: application.reviewNotes ?? null,
        reviewedBy: application.reviewedBy ?? null,
        timeline: {
          create: application.timeline.map((entry) => ({
            id: `${application.id}_t${Math.random().toString(36).slice(2, 8)}`,
            status: entry.status,
            at: new Date(entry.at),
            note: entry.note ?? null,
            actor: entry.actor ?? null,
          })),
        },
      },
    })
  }

  for (const registration of sampleRegistrations) {
    await prisma.semesterRegistration.create({
      data: {
        id: registration.id,
        referenceNo: registration.referenceNo,
        studentId: registration.studentId,
        academicYear: registration.academicYear,
        semester: registration.semester,
        school: registration.school,
        course: registration.course,
        yearLevel: registration.yearLevel,
        unitsEnrolled: registration.unitsEnrolled,
        gwa: registration.gwa,
        status: registration.status,
        submittedAt: new Date(registration.submittedAt),
        updatedAt: new Date(registration.updatedAt),
        remarks: registration.remarks ?? null,
        verifiedBy: registration.verifiedBy ?? null,
      },
    })
  }

  for (const grant of sampleGrants) {
    await prisma.grant.create({
      data: {
        id: grant.id,
        referenceNo: grant.referenceNo,
        studentId: grant.studentId,
        scholarshipId: grant.scholarshipId,
        applicationId: grant.applicationId ?? null,
        registrationId: grant.registrationId ?? null,
        academicYear: grant.academicYear,
        semester: grant.semester,
        amount: grant.amount,
        status: grant.status,
        releasedAt: new Date(grant.releasedAt),
        confirmedBy: grant.confirmedBy,
        remarks: grant.remarks ?? null,
      },
    })
  }

  for (const announcement of sampleAnnouncements) {
    await prisma.announcement.create({
      data: {
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        audience: announcement.audience,
        pinned: announcement.pinned,
        publishedAt: new Date(announcement.publishedAt),
        author: announcement.author,
      },
    })
  }

  for (const notification of sampleNotifications) {
    await prisma.notification.create({
      data: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
        createdAt: new Date(notification.createdAt),
        read: notification.read,
        link: notification.link ?? null,
      },
    })
  }

  for (const saved of sampleSaved) {
    await prisma.savedScholarship.create({
      data: {
        studentId: saved.studentId,
        scholarshipId: saved.scholarshipId,
        savedAt: new Date(saved.savedAt),
      },
    })
  }

  await prisma.platformSettings.create({
    data: {
      id: 'singleton',
      currentAcademicYear: '2026-2027',
      currentSemester: '1st Semester',
      applicationsOpen: true,
      maintenanceMessage: '',
      contactEmail: 'scholarships@example.gov.ph',
    },
  })
}

await seed()

const counts = {
  users: await prisma.user.count(),
  scholarships: await prisma.scholarship.count(),
  applications: await prisma.application.count(),
  timeline: await prisma.applicationTimelineEntry.count(),
  registrations: await prisma.semesterRegistration.count(),
  grants: await prisma.grant.count(),
  announcements: await prisma.announcement.count(),
  notifications: await prisma.notification.count(),
  saved: await prisma.savedScholarship.count(),
}

console.log('Seeded:')
for (const [table, count] of Object.entries(counts)) {
  console.log(`  ${table.padEnd(14)} ${count}`)
}

process.exit(0)
