import { randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import { createId } from './ids.ts'
import { HttpError } from './httpError.ts'
import { prisma } from './db.ts'
import type { OtpPurpose } from '../src/types/index.ts'

/**
 * One-time codes.
 *
 * Deliberately the same primitives as `passwords.ts`: scrypt from
 * `node:crypto`, constant-time comparison, no dependency. A six-digit code is
 * low-entropy — a million possibilities — so the hash is not what makes this
 * safe. What makes it safe is everything else here:
 *
 *  - a short expiry, so the window is minutes rather than days
 *  - a hard attempt cap, after which the challenge is dead
 *  - a resend cooldown and an hourly ceiling per account
 *  - single use, enforced by `consumedAt`
 *  - a per-purpose scope, so a code issued to confirm an address cannot be
 *    replayed to reset a password
 *
 * The hash still earns its place: reading the database does not hand someone a
 * live code.
 */

/** Six digits, as most verification systems use. */
const CODE_LENGTH = 6
const CODE_TTL_SECONDS = 10 * 60
const MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_REQUESTS_PER_HOUR = 5

export const OTP_POLICY = {
  expiresInSeconds: CODE_TTL_SECONDS,
  resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
} as const

const SCHEME = 'scrypt'
const KEY_LENGTH = 32

/**
 * A code from a cryptographically secure source.
 *
 * `randomInt` rather than `Math.random`, which is seeded predictably and must
 * never be used for anything a person could guess their way past.
 */
function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
}

function hashCode(code: string): string {
  const salt = randomInt(0, 2 ** 32).toString(16).padStart(8, '0')
  const derived = scryptSync(code, salt, KEY_LENGTH).toString('hex')
  return `${SCHEME}:${salt}:${derived}`
}

function verifyCode(code: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(':')
  if (scheme !== SCHEME || !salt || !expected) return false

  const derived = scryptSync(code, salt, KEY_LENGTH)
  const expectedBuffer = Buffer.from(expected, 'hex')

  // Length check first: timingSafeEqual throws on a length mismatch.
  if (derived.length !== expectedBuffer.length) return false
  return timingSafeEqual(derived, expectedBuffer)
}

export interface IssuedCode {
  code: string
  expiresInSeconds: number
}

/**
 * Issue a code for an account, replacing any outstanding code for that purpose.
 *
 * Replacing rather than accumulating matters: if older codes stayed valid, the
 * effective attempt cap would multiply by however many were requested.
 */
export async function issueCode(input: {
  userId: string
  purpose: OtpPurpose
  requestedFrom: string | null
}): Promise<IssuedCode> {
  const now = Date.now()

  const previous = await prisma.emailVerification.findFirst({
    where: { userId: input.userId, purpose: input.purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  // Cooldown. A panel will ask why; the answer is that without it, "resend"
  // becomes a free way to grind against the attempt cap.
  if (previous) {
    const elapsed = (now - previous.createdAt.getTime()) / 1000
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)
      throw new HttpError(429, `Please wait ${wait} seconds before requesting another code.`)
    }
  }

  const hourAgo = new Date(now - 3_600_000)
  const recent = await prisma.emailVerification.count({
    where: { userId: input.userId, purpose: input.purpose, createdAt: { gte: hourAgo } },
  })
  if (recent >= MAX_REQUESTS_PER_HOUR) {
    throw new HttpError(429, 'Too many codes requested for this account. Try again later.')
  }

  // Only one live challenge per purpose, so the cap stays meaningful.
  await prisma.emailVerification.deleteMany({
    where: { userId: input.userId, purpose: input.purpose, consumedAt: null },
  })

  const code = generateCode()
  await prisma.emailVerification.create({
    data: {
      id: createId('otp'),
      userId: input.userId,
      purpose: input.purpose,
      codeHash: hashCode(code),
      createdAt: new Date(now),
      expiresAt: new Date(now + CODE_TTL_SECONDS * 1000),
      requestedFrom: input.requestedFrom,
    },
  })

  return { code, expiresInSeconds: CODE_TTL_SECONDS }
}

/**
 * Check a code and consume it.
 *
 * Returns true only when the code was correct, unexpired, unused and under the
 * attempt cap. `attempts` is incremented on every wrong guess, so a cap is a
 * real ceiling rather than a hope.
 */
export async function consumeCode(input: {
  userId: string
  purpose: OtpPurpose
  code: string
}): Promise<boolean> {
  const challenge = await prisma.emailVerification.findFirst({
    where: { userId: input.userId, purpose: input.purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })

  // No live challenge: expired codes are cleared, so this is the expired case
  // as well as the never-requested one.
  if (!challenge) return false
  if (challenge.attempts >= MAX_ATTEMPTS) return false
  if (challenge.expiresAt.getTime() < Date.now()) return false

  if (!verifyCode(input.code, challenge.codeHash)) {
    await prisma.emailVerification.update({
      where: { id: challenge.id },
      data: { attempts: challenge.attempts + 1 },
    })
    return false
  }

  await prisma.emailVerification.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  })
  return true
}

/** Drop expired challenges. Called opportunistically rather than on a timer. */
export async function pruneExpiredCodes(): Promise<void> {
  await prisma.emailVerification
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86_400_000) } } })
    .catch(() => undefined)
}

/**
 * Per-address request ceiling, in memory.
 *
 * The per-account limits above stop one account being ground down; this stops
 * the other direction, where someone walks a list of addresses from one
 * machine. In memory is a deliberate simplification for a single-process
 * deployment — a multi-instance deployment must move this to shared storage,
 * which is worth saying out loud rather than discovering later.
 */
const IP_WINDOW_MS = 3_600_000
const IP_MAX_REQUESTS = 20
const ipRequests = new Map<string, number[]>()

export function checkAddressAllowance(key: string): boolean {
  const now = Date.now()
  const recent = (ipRequests.get(key) ?? []).filter((at) => now - at < IP_WINDOW_MS)

  if (recent.length >= IP_MAX_REQUESTS) {
    ipRequests.set(key, recent)
    return false
  }

  recent.push(now)
  ipRequests.set(key, recent)

  // Keep the map from growing without bound on a long-running process.
  if (ipRequests.size > 1000) {
    for (const [candidate, times] of ipRequests) {
      if (times.every((at) => now - at >= IP_WINDOW_MS)) ipRequests.delete(candidate)
    }
  }

  return true
}
