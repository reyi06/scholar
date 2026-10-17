import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

/**
 * Password hashing.
 *
 * Uses scrypt from `node:crypto`, so there is no hashing dependency to audit
 * and no native build step. This replaces the plaintext demo credentials that
 * previously sat in the browser's localStorage.
 */

const KEY_LENGTH = 64
const SCHEME = 'scrypt'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, KEY_LENGTH).toString('hex')
  return `${SCHEME}:${salt}:${derived}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split(':')
  if (scheme !== SCHEME || !salt || !expected) return false

  const derived = scryptSync(password, salt, KEY_LENGTH)
  const expectedBuffer = Buffer.from(expected, 'hex')

  // Length check first: timingSafeEqual throws on a length mismatch.
  if (derived.length !== expectedBuffer.length) return false
  return timingSafeEqual(derived, expectedBuffer)
}
