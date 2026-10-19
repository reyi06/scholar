import { createPublicKey, createVerify, type JsonWebKey } from 'node:crypto'

/**
 * Google ID-token verification, without a client library.
 *
 * The project avoids dependencies for things that are small and well
 * understood, and this is a bounded problem: RS256 signatures against a
 * published key set, plus three claim checks. What it is *not* is a general JWT
 * implementation — the algorithm is pinned, so a token cannot ask to be
 * verified with `none` or with a key we chose.
 *
 * Google's own guidance, followed here exactly:
 *  - verify the signature against Google's rotating public keys
 *  - `aud` must equal one of our client ids
 *  - `iss` must be `accounts.google.com` or `https://accounts.google.com`
 *  - `exp` must not have passed
 *  - identify the user by `sub`, never by email
 *
 * https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
 */

const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs'
const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

/** Tolerated clock skew, in seconds. */
const LEEWAY_SECONDS = 60

interface GoogleKey {
  kid: string
  n: string
  e: string
}

interface JwkSet {
  keys: GoogleKey[]
  /** When the set should be refetched, from the response's Cache-Control. */
  expiresAt: number
}

export interface GoogleIdentity {
  /** Google's stable account identifier. The only safe key to store. */
  sub: string
  email: string
  emailVerified: boolean
  givenName: string
  familyName: string
  /** Present only for Google Workspace accounts. */
  hostedDomain: string | null
  picture: string | null
}

let cachedKeys: JwkSet | null = null

/**
 * Google rotates these keys. `max-age` on the response says how long they may
 * be trusted, so honour it rather than guessing a TTL.
 */
async function fetchKeys(): Promise<JwkSet> {
  if (cachedKeys && cachedKeys.expiresAt > Date.now()) return cachedKeys

  const response = await fetch(CERTS_URL)
  if (!response.ok) {
    throw new Error('Could not reach Google to check the sign-in token.')
  }

  const body = (await response.json()) as { keys?: GoogleKey[] }
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get('cache-control') ?? '')?.[1] ?? 0)

  cachedKeys = {
    keys: body.keys ?? [],
    // Fall back to an hour when the header is absent; Google's own keys live
    // for longer than that, so this only costs an extra fetch.
    expiresAt: Date.now() + (maxAge > 0 ? maxAge * 1000 : 3_600_000),
  }
  return cachedKeys
}

/** Refetch once, ignoring the cache — used when a `kid` is unknown. */
async function fetchKeysFresh(): Promise<JwkSet> {
  cachedKeys = null
  return fetchKeys()
}

interface JwtParts {
  header: { alg?: string; kid?: string }
  payload: Record<string, unknown>
  signingInput: string
  signature: Buffer
}

function decodeSegment(segment: string): unknown {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
}

function splitToken(token: string): JwtParts {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('That sign-in token is malformed.')

  return {
    header: decodeSegment(parts[0]) as JwtParts['header'],
    payload: decodeSegment(parts[1]) as Record<string, unknown>,
    signingInput: `${parts[0]}.${parts[1]}`,
    signature: Buffer.from(parts[2], 'base64url'),
  }
}

async function verifySignature(parts: JwtParts): Promise<void> {
  // Pinned: accepting the header's choice would allow `alg: none`.
  if (parts.header.alg !== 'RS256') throw new Error('Unexpected token algorithm.')

  const kid = parts.header.kid
  if (!kid) throw new Error('That sign-in token has no key identifier.')

  let keys = await fetchKeys()
  let key = keys.keys.find((candidate) => candidate.kid === kid)
  if (!key) {
    // Google rotated the key since we cached the set.
    keys = await fetchKeysFresh()
    key = keys.keys.find((candidate) => candidate.kid === kid)
  }
  if (!key) throw new Error('That sign-in token was signed with an unknown key.')

  const publicKey = createPublicKey({
    key: { kty: 'RSA', n: key.n, e: key.e } as JsonWebKey,
    format: 'jwk',
  })

  const verifier = createVerify('RSA-SHA256')
  verifier.update(parts.signingInput)
  verifier.end()
  if (!verifier.verify(publicKey, parts.signature)) {
    throw new Error('That sign-in token failed its signature check.')
  }
}

/**
 * Verify a Google ID token and return the identity it asserts.
 *
 * Throws with a message safe to show a user. Nothing is trusted until the
 * signature, audience, issuer and expiry have all been checked.
 */
export async function verifyGoogleIdToken(
  token: string,
  clientIds: string[],
): Promise<GoogleIdentity> {
  if (clientIds.length === 0) throw new Error('Google sign-in is not configured.')

  const parts = splitToken(token)
  await verifySignature(parts)

  const payload = parts.payload
  const now = Math.floor(Date.now() / 1000)

  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (!audience.some((value) => typeof value === 'string' && clientIds.includes(value))) {
    throw new Error('That sign-in token was issued for another application.')
  }

  if (typeof payload.iss !== 'string' || !VALID_ISSUERS.has(payload.iss)) {
    throw new Error('That sign-in token was not issued by Google.')
  }

  if (typeof payload.exp !== 'number' || payload.exp + LEEWAY_SECONDS < now) {
    throw new Error('That sign-in token has expired. Try again.')
  }

  const sub = payload.sub
  const email = payload.email
  if (typeof sub !== 'string' || !sub) throw new Error('That sign-in token has no account id.')
  if (typeof email !== 'string' || !email) throw new Error('That Google account has no email address.')

  return {
    sub,
    email: email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    givenName: typeof payload.given_name === 'string' ? payload.given_name : '',
    familyName: typeof payload.family_name === 'string' ? payload.family_name : '',
    hostedDomain: typeof payload.hd === 'string' ? payload.hd : null,
    picture: typeof payload.picture === 'string' ? payload.picture : null,
  }
}

/**
 * Whether Google is authoritative for the address.
 *
 * This is the distinction Google draws, and it matters: a `@gmail.com` address,
 * or a Workspace address with `hd` set, is one Google actively vouches for. For
 * any other domain `email_verified` only means Google checked it when the
 * account was created, so the address may since have changed hands — and
 * therefore must not be used to take over an existing password account.
 */
export function googleIsAuthoritative(identity: GoogleIdentity): boolean {
  return identity.email.endsWith('@gmail.com') || (identity.emailVerified && identity.hostedDomain !== null)
}
