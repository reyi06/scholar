/**
 * Support tickets.
 *
 * A ticket belongs to an account, because the answer comes back through this
 * app. There is no mail transport, so an anonymous ticket would collect a reply
 * nobody could read.
 *
 * Reading is scoped the same way as every other record: a student sees their
 * own tickets, an administrator sees all of them, and the query is built from
 * the session rather than from a client-supplied id.
 */

import { recordAudit } from '../audit.ts'
import { prisma } from '../db.ts'
import { requireOwnerOrAdmin, requireRole, requireUser } from '../http/auth.ts'
import { readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId, nextReference } from '../ids.ts'
import { toSupportTicket } from '../mappers.ts'
import { statusAfterReply } from '../rules.ts'
import type { User } from '../../src/types/index.ts'

const CATEGORIES = ['account', 'application', 'documents', 'grants', 'other'] as const
const STATUSES = ['open', 'answered', 'closed'] as const

const MAX_SUBJECT = 120
const MAX_BODY = 4000

/** The exchange, oldest first, plus the name the office needs to see. */
const ticketInclude = {
  messages: { orderBy: { createdAt: 'asc' } },
  user: { select: { firstName: true, lastName: true } },
} as const

function fullName(user: User): string {
  return `${user.firstName} ${user.lastName}`.trim()
}

route('GET', '/api/support/tickets', async ({ res, query, user }) => {
  const viewer = requireUser(user)
  const where: Record<string, unknown> = viewer.role === 'admin' ? {} : { userId: viewer.id }

  const status = query.get('status')
  if (status && status !== 'all') {
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new HttpError(400, 'Choose a valid ticket status.')
    }
    where.status = status
  }

  const rows = await prisma.supportTicket.findMany({
    where: where as never,
    include: ticketInclude,
    orderBy: { updatedAt: 'desc' },
  })

  send(res, 200, rows.map(toSupportTicket))
})

route('POST', '/api/support/tickets', async ({ req, res, user }) => {
  const author = requireUser(user)
  const body = await readJson(req)

  const category = String(body.category ?? '')
  const subject = String(body.subject ?? '').trim()
  const message = String(body.body ?? '').trim()

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    throw new HttpError(400, 'Choose a valid ticket category.')
  }
  if (subject.length < 5) throw new HttpError(400, 'Give the ticket a longer subject.')
  if (subject.length > MAX_SUBJECT) {
    throw new HttpError(400, `Keep the subject under ${MAX_SUBJECT} characters.`)
  }
  if (message.length < 10) throw new HttpError(400, 'Describe the problem in a sentence or two.')
  if (message.length > MAX_BODY) {
    throw new HttpError(400, `Keep the message under ${MAX_BODY} characters.`)
  }

  const existing = await prisma.supportTicket.findMany({ select: { reference: true } })

  const created = await prisma.supportTicket.create({
    data: {
      id: createId('tkt'),
      reference: nextReference('SUP', existing.map((row) => row.reference)),
      userId: author.id,
      category,
      subject,
      messages: {
        create: {
          id: createId('msg'),
          authorRole: 'student',
          authorName: fullName(author),
          body: message,
        },
      },
    },
    include: ticketInclude,
  })

  await recordAudit({
    actor: author,
    action: 'support.ticket_opened',
    entityType: 'support_ticket',
    entityId: created.id,
    summary: `Opened ticket ${created.reference}`,
  })

  send(res, 201, toSupportTicket(created))
})

route('POST', '/api/support/tickets/:id/messages', async ({ req, res, params, user }) => {
  const author = requireUser(user)
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } })
  if (!ticket) throw new HttpError(404, 'That ticket no longer exists.')
  requireOwnerOrAdmin(author, ticket.userId)

  if (ticket.status === 'closed') {
    throw new HttpError(409, 'This ticket is closed. Open a new one if you need more help.')
  }

  const body = await readJson(req)
  const message = String(body.body ?? '').trim()
  if (message.length < 2) throw new HttpError(400, 'Write a message first.')
  if (message.length > MAX_BODY) {
    throw new HttpError(400, `Keep the message under ${MAX_BODY} characters.`)
  }

  const isStaff = author.role === 'admin'

  // A staff reply marks the ticket answered; a student follow-up puts it back in
  // the queue, because the last word is theirs to wait on.
  const [updated] = await prisma.$transaction([
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: statusAfterReply(isStaff ? 'admin' : 'student') },
      include: ticketInclude,
    }),
    prisma.supportMessage.create({
      data: {
        id: createId('msg'),
        ticketId: ticket.id,
        authorRole: isStaff ? 'staff' : 'student',
        authorName: fullName(author),
        body: message,
      },
    }),
  ])

  send(res, 201, toSupportTicket(updated))
})

route('PATCH', '/api/support/tickets/:id', async ({ req, res, params, user }) => {
  const admin = requireRole(user, 'admin')
  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id } })
  if (!ticket) throw new HttpError(404, 'That ticket no longer exists.')

  const body = await readJson(req)
  const status = String(body.status ?? '')
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    throw new HttpError(400, 'Choose a valid ticket status.')
  }

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status },
    include: ticketInclude,
  })

  await recordAudit({
    actor: admin,
    action: 'support.ticket_status',
    entityType: 'support_ticket',
    entityId: updated.id,
    summary: `Set ticket ${updated.reference} to ${status}`,
  })

  send(res, 200, toSupportTicket(updated))
})
