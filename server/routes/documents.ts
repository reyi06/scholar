/**
 * documents — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { DOCUMENT_CLASSIFICATIONS } from '../../src/lib/constants.ts'
import { classifyDocument, suggestDocumentTitle, validateDocumentFile } from '../../src/lib/documents.ts'
import type { DocumentClassification, User } from '../../src/types/index.ts'
import { recordAudit } from '../audit.ts'
import { prisma } from '../db.ts'
import { requireOwnerOrAdmin, requireRole, requireUser } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId } from '../ids.ts'
import { toDocument, toUser } from '../mappers.ts'
import { deleteUpload, readMultipart, readUpload, saveUpload, storedNameFor } from '../uploads.ts'

/* ================================================================== */
/* Documents                                                           */
/* ================================================================== */

/**
 * Build the filter an administrator asked for, and enforce the ownership rule
 * at the same time: a student's list is pinned to their own id, so no query
 * string can widen it.
 */
function documentWhere(query: URLSearchParams, user: User): Record<string, unknown> {
  const where: Record<string, unknown> = {}

  if (user.role !== 'admin') where.studentId = user.id
  else if (query.get('studentId')) where.studentId = query.get('studentId')

  const classification = query.get('classification')
  if (classification && classification !== 'all') where.classification = classification

  const status = query.get('status')
  if (status && status !== 'all') where.status = status

  const applicationId = query.get('applicationId')
  if (applicationId) where.applicationId = applicationId

  const search = (query.get('query') ?? '').trim()
  if (search) {
    where.OR = [{ title: { contains: search } }, { fileName: { contains: search } }]
  }

  return where
}

route('GET', '/api/documents', async ({ res, query, user }) => {
  const signedIn = requireUser(user)
  const rows = await prisma.studentDocument.findMany({
    where: documentWhere(query, signedIn) as never,
    orderBy: { uploadedAt: 'desc' },
  })
  send(res, 200, rows.map(toDocument))
})

/** As above, with the owner attached. Administrator screens only. */
route('GET', '/api/documents/records', async ({ res, query, user }) => {
  const signedIn = requireRole(user, 'admin')
  const rows = await prisma.studentDocument.findMany({
    where: documentWhere(query, signedIn) as never,
    include: { student: true },
    orderBy: { uploadedAt: 'desc' },
  })
  send(
    res,
    200,
    rows.map((row) => ({ document: toDocument(row), student: toUser(row.student) })),
  )
})

route('POST', '/api/documents', async ({ req, res, user }) => {
  const signedIn = requireRole(user, 'student')

  const { fields, files } = await readMultipart(req)
  const file = files[0]
  if (!file) throw new HttpError(400, 'Choose a file to upload.')

  // Checked in the browser too, so the student hears about it immediately —
  // but a request can always be crafted by hand, so it is checked again here.
  const problem = validateDocumentFile({
    name: file.fileName,
    type: file.mimeType,
    size: file.data.length,
  })
  if (problem) throw new HttpError(400, problem)

  // An unrecognised or absent classification falls back to the same guess the
  // browser was shown, so the two can only ever agree.
  const requested = fields.classification
  const classification = DOCUMENT_CLASSIFICATIONS.some((option) => option.value === requested)
    ? (requested as DocumentClassification)
    : classifyDocument(file.fileName, file.mimeType)

  const applicationId = (fields.applicationId ?? '').trim() || null
  if (applicationId) {
    const owned = await prisma.application.findFirst({
      where: { id: applicationId, studentId: signedIn.id },
    })
    if (!owned) throw new HttpError(404, 'That application no longer exists.')
  }

  const id = createId('doc')
  const storedName = storedNameFor(id, file.mimeType)
  await saveUpload(storedName, file.data)

  try {
    const row = await prisma.studentDocument.create({
      data: {
        id,
        studentId: signedIn.id,
        applicationId,
        title: (fields.title ?? '').trim() || suggestDocumentTitle(file.fileName),
        classification,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.data.length,
        storedName,
        status: 'submitted',
      },
    })
    send(res, 201, toDocument(row))
  } catch (error) {
    // The bytes are written before the row, so a failure here would otherwise
    // leave a file on disk that nothing points at.
    await deleteUpload(storedName)
    throw error
  }
})

/** Strip anything that could break out of a Content-Disposition header. */
function safeHeaderFileName(fileName: string): string {
  const cleaned = fileName.replace(/[^\w.\- ]+/g, '_').slice(0, 120).trim()
  return cleaned || 'document'
}

route('GET', '/api/documents/:id/file', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const row = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!row) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, row.studentId)

  // Disclosing a student's file is precisely the act an audit trail exists for.
  // A student opening their own file is not an administrative disclosure, so
  // only staff access is recorded.
  if (signedIn.role === 'admin') {
    await recordAudit({
      actor: signedIn,
      action: 'document.downloaded',
      entityType: 'document',
      entityId: row.id,
      summary: `Opened “${row.title}”`,
      detail: { studentId: row.studentId, fileName: row.fileName, classification: row.classification },
    })
  }

  const data = await readUpload(row.storedName)
  if (!data) throw new HttpError(410, 'The stored copy of this file is no longer available.')

  res.writeHead(200, {
    'Content-Type': row.mimeType,
    'Content-Length': data.length,
    // Always an attachment: an uploaded file is untrusted content and must
    // never be rendered inline on this origin.
    'Content-Disposition': `attachment; filename="${safeHeaderFileName(row.fileName)}"`,
    'Cache-Control': 'private, no-store',
  })
  res.end(data)
})

route('PATCH', '/api/documents/:id', async ({ req, res, params, user }) => {
  const signedIn = requireUser(user)
  const body = await readJson(req)
  const existing = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, existing.studentId)

  const update: Record<string, unknown> = {}

  // The student may correct how their own file is filed. Deciding whether it is
  // acceptable is a different act, and stays with the scholarship office —
  // otherwise a student could verify their own document.
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) throw new HttpError(400, 'Give the document a title.')
    update.title = title
  }

  if (body.classification !== undefined) {
    const next = String(body.classification)
    if (!DOCUMENT_CLASSIFICATIONS.some((option) => option.value === next)) {
      throw new HttpError(400, 'That is not a valid classification.')
    }
    update.classification = next
  }

  if (body.status !== undefined || body.note !== undefined) {
    requireRole(signedIn, 'admin')
    const status = body.status === undefined ? existing.status : String(body.status)
    if (!['submitted', 'verified', 'rejected'].includes(status)) {
      throw new HttpError(400, 'That is not a valid decision.')
    }
    const note = body.note === undefined ? (existing.note ?? '') : String(body.note).trim()
    if (status === 'rejected' && !note) {
      throw new HttpError(400, 'Give a reason for rejecting the document.')
    }
    update.status = status
    update.note = note || null
  }

  if (Object.keys(update).length === 0) throw new HttpError(400, 'Nothing to update.')

  const updated = await prisma.studentDocument.update({
    where: { id: existing.id },
    data: update as never,
  })

  // Only a decision changes the evidentiary state of a document, so only a
  // decision is worth a trail entry — not a student renaming their own file.
  if (update.status !== undefined) {
    await recordAudit({
      actor: signedIn,
      action: updated.status === 'verified' ? 'document.verified' : 'document.rejected',
      entityType: 'document',
      entityId: updated.id,
      summary:
        updated.status === 'verified'
          ? `Verified “${updated.title}”`
          : `Returned “${updated.title}” to the student`,
      detail: { studentId: updated.studentId, from: existing.status, to: updated.status, note: updated.note },
    })
  }

  send(res, 200, toDocument(updated))
})

route('DELETE', '/api/documents/:id', async ({ res, params, user }) => {
  const signedIn = requireUser(user)
  const existing = await prisma.studentDocument.findUnique({ where: { id: params.id } })
  if (!existing) throw new HttpError(404, 'That document no longer exists.')
  requireOwnerOrAdmin(signedIn, existing.studentId)

  // A verified document is evidence that a decision was made on it. A student
  // removing one after the fact would quietly change the record behind that
  // decision, so it takes an administrator.
  if (signedIn.role !== 'admin' && existing.status === 'verified') {
    throw new HttpError(
      409,
      'A verified document cannot be removed. Ask the scholarship office if it is wrong.',
    )
  }

  await prisma.studentDocument.delete({ where: { id: existing.id } })
  await deleteUpload(existing.storedName)
  send(res, 200, { ok: true })
})
