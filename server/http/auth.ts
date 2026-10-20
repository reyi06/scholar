/**
 * auth — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Role, User } from '../../src/types/index.ts'
import { prisma } from '../db.ts'
import { parseCookies } from '../http/responses.ts'
import { HttpError } from '../httpError.ts'
import { toUser } from '../mappers.ts'

export const SESSION_COOKIE = 'pgc_session'
export const SESSION_DAYS = 30

/**
 * `Secure` is set outside development.
 *
 * A local demo is served over plain HTTP, where a Secure cookie would simply be
 * discarded by the browser — the sign-in would appear to succeed and then
 * immediately be forgotten. Rather than special-case the address, one flag says
 * whether the deployment terminates TLS.
 */
export const COOKIE_SECURE =
  process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true'


/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

/** Resolves the signed-in user from the session cookie, or null. */
export async function currentUser(req: IncomingMessage): Promise<User | null> {
  const sessionId = parseCookies(req)[SESSION_COOKIE]
  if (!sessionId) return null

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { user: true } })
  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }

  return toUser(session.user)
}

export async function startSession(res: ServerResponse, userId: string): Promise<void> {
  const id = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000)
  await prisma.session.create({ data: { id, userId, expiresAt } })

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${id}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86_400}${COOKIE_SECURE ? '; Secure' : ''}`,
  )
}

export function endSession(res: ServerResponse): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${COOKIE_SECURE ? '; Secure' : ''}`,
  )
}


/* Authorisation                                                       */
/* ------------------------------------------------------------------ */

export function requireUser(user: User | null): User {
  if (!user) throw new HttpError(401, 'You need to be signed in.')
  return user
}

export function requireRole(user: User | null, role: Role): User {
  const signedIn = requireUser(user)
  if (signedIn.role !== role) throw new HttpError(403, 'You do not have access to this resource.')
  return signedIn
}

/** A student may only ever act on their own records. */
export function requireOwnerOrAdmin(user: User, ownerId: string): void {
  if (user.role !== 'admin' && user.id !== ownerId) {
    throw new HttpError(403, 'You do not have access to this resource.')
  }
}

/**
 * Google OAuth client ids this server accepts tokens for.
 *
 * Comma-separated so a deployment can accept more than one client (for
 * example staging and production) without a code change. Server-side only:
 * a client id is not a secret, but keeping it here means the browser learns it
 * from the API rather than from a bundled `VITE_*` variable.
 */
export function googleClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_ID ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

/* ------------------------------------------------------------------ */
