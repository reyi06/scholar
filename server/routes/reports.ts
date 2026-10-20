/**
 * reports — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { APPLICATION_STATUS_LABELS, REGISTRATION_STATUS_LABELS } from '../../src/lib/constants.ts'
import { prisma } from '../db.ts'
import { requireRole } from '../http/auth.ts'
import { send } from '../http/responses.ts'
import { route } from '../http/router.ts'

/* ================================================================== */
/* Reports                                                             */
/* ================================================================== */

route('GET', '/api/reports', async ({ res, user }) => {
  requireRole(user, 'admin')

  const [scholarships, applications, registrations, grants, students] = await Promise.all([
    prisma.scholarship.findMany({ select: { id: true, status: true } }),
    prisma.application.findMany({ select: { id: true, status: true, scholarshipId: true, submittedAt: true } }),
    prisma.semesterRegistration.findMany({ select: { id: true, status: true } }),
    prisma.grant.findMany({ select: { id: true, status: true, amountCentavos: true, studentId: true } }),
    prisma.user.findMany({ where: { role: 'student' }, select: { id: true } }),
  ])

  const profiles = await prisma.studentProfile.findMany({ select: { userId: true, municipality: true } })
  const municipalityByStudent = new Map(profiles.map((row) => [row.userId, row.municipality || 'Not provided']))
  const scholarshipNames = new Map(
    (await prisma.scholarship.findMany({ select: { id: true, name: true } })).map((row) => [row.id, row.name]),
  )

  const tally = <T>(rows: T[], key: (row: T) => string) =>
    rows.reduce<Record<string, number>>((acc, row) => {
      const k = key(row)
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {})

  const byStatus = tally(applications, (row) => row.status)
  const byScholarship = tally(applications, (row) => row.scholarshipId)
  const byMonth = tally(applications, (row) => row.submittedAt.toISOString().slice(0, 7))
  const registrationsByStatus = tally(registrations, (row) => row.status)

  // Accumulated in centavos and divided once, so the municipality totals add up
  // to exactly the same figure as the overall total.
  const grantsByMunicipality = grants.reduce<Record<string, { count: number; centavos: number }>>(
    (acc, row) => {
      const key = municipalityByStudent.get(row.studentId) ?? 'Not provided'
      const current = acc[key] ?? { count: 0, centavos: 0 }
      acc[key] = { count: current.count + 1, centavos: current.centavos + row.amountCentavos }
      return acc
    },
    {},
  )

  // Status keys are machine values; the labels come from the same maps the rest
  // of the interface uses, so a report cannot disagree with a badge.
  const toRows = (record: Record<string, number>, labels: Record<string, string>) =>
    Object.entries(record)
      .map(([key, count]) => ({ label: labels[key] ?? key.replace(/-/g, ' '), count, amount: 0 }))
      .sort((a, b) => b.count - a.count)

  send(res, 200, {
    overview: {
      totalScholarships: scholarships.length,
      openScholarships: scholarships.filter((row) => row.status === 'open').length,
      draftScholarships: scholarships.filter((row) => row.status === 'draft').length,
      totalStudents: students.length,
      totalApplications: applications.length,
      pendingApplications: applications.filter((row) =>
        ['submitted', 'under-review', 'needs-info'].includes(row.status),
      ).length,
      totalRegistrations: registrations.length,
      pendingRegistrations: registrations.filter((row) => row.status === 'pending').length,
      totalGrants: grants.length,
      activeGrants: grants.filter((row) => row.status === 'active').length,
      totalAmountReleased: grants.reduce((sum, row) => sum + row.amountCentavos, 0) / 100,
    },
    byStatus: toRows(byStatus, APPLICATION_STATUS_LABELS),
    byScholarship: Object.entries(byScholarship)
      .map(([id, count]) => ({ label: scholarshipNames.get(id) ?? 'Removed listing', count, amount: 0 }))
      .sort((a, b) => b.count - a.count),
    byMonth: Object.entries(byMonth)
      .map(([label, count]) => ({ label, count, amount: 0 }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    registrationsByStatus: toRows(registrationsByStatus, REGISTRATION_STATUS_LABELS),
    grantsByMunicipality: Object.entries(grantsByMunicipality)
      .map(([label, value]) => ({ label, count: value.count, amount: value.centavos / 100 }))
      .sort((a, b) => b.amount - a.amount),
  })
})
