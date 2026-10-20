/**
 * me — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { recordAudit } from '../audit.ts'
import { prisma } from '../db.ts'
import { requireUser } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { createId } from '../ids.ts'
import { toApplication, toDocument, toGrant, toProfile, toRegistration } from '../mappers.ts'

/* Data-subject requests                                               */
/* ------------------------------------------------------------------ */

/**
 * Everything the system holds about the signed-in user, as one JSON document.
 *
 * The Data Privacy Act gives a data subject the right of access. The most
 * useful form of that here is a file the student can keep, so this returns the
 * whole record rather than a summary of it.
 *
 * The export itself is audited: bulk access to a student's own file is still
 * access worth being able to account for.
 */
route('GET', '/api/me/export', async ({ res, user }) => {
  const signedIn = requireUser(user)
  const me = await prisma.user.findUnique({ where: { id: signedIn.id } })

  const [profile, applications, registrations, grants, documents, saved] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: signedIn.id } }),
    prisma.application.findMany({
      where: { studentId: signedIn.id },
      include: { timeline: { orderBy: { at: 'asc' } } },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.semesterRegistration.findMany({
      where: { studentId: signedIn.id },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.grant.findMany({ where: { studentId: signedIn.id }, orderBy: { releasedAt: 'desc' } }),
    prisma.studentDocument.findMany({
      where: { studentId: signedIn.id },
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.savedScholarship.count({ where: { studentId: signedIn.id } }),
  ])

  await recordAudit({
    actor: signedIn,
    action: 'data.exported',
    entityType: 'user',
    entityId: signedIn.id,
    summary: 'Downloaded a copy of their own records',
    detail: { applications: applications.length, documents: documents.length },
  })

  send(res, 200, {
    exportedAt: new Date().toISOString(),
    note:
      'A copy of the records held about you by Scholar. Uploaded files themselves are not included, only their descriptions; download those from My Documents.',
    account: me
      ? {
          id: me.id,
          email: me.email,
          firstName: me.firstName,
          lastName: me.lastName,
          createdAt: me.createdAt,
          emailVerified: me.emailVerified,
        }
      : null,
    profile: profile ? toProfile(profile) : null,
    applications: applications.map(toApplication),
    registrations: registrations.map(toRegistration),
    grants: grants.map(toGrant),
    documents: documents.map(toDocument),
    savedScholarships: saved,
  })
})

/**
 * Ask the office to erase your records.
 *
 * Deliberately a request rather than an immediate delete. A confirmed grant is
 * evidence of the use of public funds and of a decision made about a person;
 * erasing it on a button press would destroy the record that explains it. The
 * request is recorded and the administrators are notified, so a human decides
 * scope against the office's retention obligations.
 */
route('POST', '/api/me/erasure-request', async ({ req, res, user }) => {
  const signedIn = requireUser(user)
  const body = await readJson(req)
  const reason = String(body.reason ?? '').trim()

  const name = `${signedIn.firstName} ${signedIn.lastName}`.trim()

  await recordAudit({
    actor: signedIn,
    action: 'data.erasure_requested',
    entityType: 'user',
    entityId: signedIn.id,
    summary: `${name} requested erasure of their records`,
    detail: { reason: reason || null, email: signedIn.email },
  })

  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
  await Promise.all(
    admins.map((admin) =>
      prisma.notification.create({
        data: {
          id: createId('ntf'),
          userId: admin.id,
          title: 'Erasure request received',
          body: `${name} has asked for their records to be erased. Review the request before acting.`,
          createdAt: new Date(),
          link: '/admin/activity',
        },
      }),
    ),
  )

  send(res, 201, { requested: true })
})
