import { prisma } from './db.ts'
import { createId } from './ids.ts'
import type { User } from '../src/types/index.ts'

/**
 * The audit trail.
 *
 * One function, called from the routes that change or disclose something worth
 * being able to account for later. It is intentionally fire-and-forget: an audit
 * write must never be the reason a legitimate action fails, but a failure is
 * logged loudly so a gap in the trail is visible rather than silent.
 *
 * `action` is a dotted verb so the trail can be filtered by family:
 * `document.viewed`, `grant.confirmed`, `student.deleted`.
 */

export type AuditAction =
  | 'document.viewed'
  | 'document.downloaded'
  | 'document.verified'
  | 'document.rejected'
  | 'application.decided'
  | 'grant.confirmed'
  | 'grant.updated'
  | 'scholarship.created'
  | 'scholarship.updated'
  | 'scholarship.deleted'
  | 'student.updated'
  | 'student.deleted'
  | 'settings.updated'
  | 'announcement.published'
  | 'announcement.deleted'
  | 'data.exported'
  | 'data.erasure_requested'

export interface AuditInput {
  actor: User
  action: AuditAction
  entityType: string
  entityId?: string | null
  summary: string
  detail?: Record<string, unknown>
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEntry.create({
      data: {
        id: createId('aud'),
        actorId: input.actor.id,
        actorName: `${input.actor.firstName} ${input.actor.lastName}`.trim(),
        actorRole: input.actor.role,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        detail: JSON.stringify(input.detail ?? {}),
      },
    })
  } catch (cause: unknown) {
    // A failed audit write is a compliance problem, so it is never swallowed
    // quietly — but it must not roll back the action the user asked for.
    console.error('[audit] could not record', input.action, cause instanceof Error ? cause.message : cause)
  }
}
