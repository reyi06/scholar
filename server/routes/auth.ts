/**
 * auth — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { MUNICIPALITIES_ONLY } from '../../src/lib/constants.ts'
import type { OtpPurpose } from '../../src/types/index.ts'
import { prisma } from '../db.ts'
import { googleIsAuthoritative, verifyGoogleIdToken } from '../googleAuth.ts'
import {
  SESSION_COOKIE,
  endSession,
  googleClientIds,
  requireUser,
  startSession,
} from '../http/auth.ts'
import { parseCookies, readJson, send } from '../http/responses.ts'
import { route } from '../http/router.ts'
import { HttpError } from '../httpError.ts'
import { createId } from '../ids.ts'
import { buildOtpMessage, mailTransport, settleDeliveryDelay } from '../mailer.ts'
import { toUser } from '../mappers.ts'
import { OTP_POLICY, checkAddressAllowance, consumeCode, issueCode, pruneExpiredCodes } from '../otp.ts'
import { hashPassword, verifyPassword } from '../passwords.ts'
import { clearLoginFailures, loginThrottle, recordLoginFailure } from '../throttle.ts'
import type { IncomingMessage } from 'node:http'

/* ================================================================== */
/* Auth                                                                */
/* ================================================================== */

route('GET', '/api/health', async ({ res }) => {
  send(res, 200, { ok: true, time: new Date().toISOString() })
})

route('GET', '/api/auth/session', async ({ res, user }) => {
  send(res, 200, { user })
})

route('POST', '/api/auth/login', async ({ req, res }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const origin = requestOrigin(req)

  // Checked before the password is looked at, so a locked-out caller learns
  // nothing about whether the account exists or the guess was close.
  const throttle = loginThrottle(email, origin)
  if (throttle.blocked) {
    res.setHeader('Retry-After', String(throttle.retryAfterSeconds))
    const minutes = Math.max(1, Math.ceil(throttle.retryAfterSeconds / 60))
    throw new HttpError(429, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`)
  }

  const found = await prisma.user.findUnique({ where: { email } })
  // One message for both failure modes, so the response cannot be used to
  // discover which email addresses exist.
  //
  // An account created through Google has an empty hash, and must never be
  // enterable with a password: verifyPassword would be asked to check against
  // nothing at all.
  if (!found || !found.passwordHash || !verifyPassword(password, found.passwordHash)) {
    recordLoginFailure(email, origin)
    throw new HttpError(401, 'Those credentials did not match any account.')
  }

  // A legitimate sign-in clears the account's counter, so earlier typos do not
  // accumulate into a lockout.
  clearLoginFailures(email)
  await startSession(res, found.id)
  send(res, 200, { user: toUser(found) })
})

/* ------------------------------------------------------------------ */
/* Google sign-in                                                      */
/* ------------------------------------------------------------------ */

/**
 * What the browser needs to start Google sign-in, or `configured: false` so
 * the button can stay hidden rather than fail when pressed.
 */
route('GET', '/api/auth/google/config', async ({ res }) => {
  const clientId = googleClientIds()[0] ?? ''
  send(res, 200, { configured: clientId !== '', clientId })
})

/**
 * Exchange a Google ID token for a session.
 *
 * Three account states, as Google's own guide sets out:
 *  - a returning Google account → sign in
 *  - an existing password account with the same address → refuse, and say so;
 *    linking an existing account must prove ownership of it, which is a
 *    separate flow and not something to shortcut here
 *  - no account → create one, marked incomplete, and send the student to the
 *    profile step Google cannot fill in
 *
 * A new account is created with `profileComplete: false`. Everything that
 * depends on a student profile — matching, applying, semester registration —
 * is therefore behind the completion step, rather than rendering half a
 * dashboard for an account that has only an email address.
 */
route('POST', '/api/auth/google', async ({ req, res }) => {
  const clientIds = googleClientIds()
  if (clientIds.length === 0) {
    throw new HttpError(503, 'Google sign-in has not been configured on this server.')
  }

  const body = await readJson(req)
  const credential = String(body.credential ?? '')
  if (!credential) throw new HttpError(400, 'No Google credential was supplied.')

  let identity
  try {
    identity = await verifyGoogleIdToken(credential, clientIds)
  } catch (cause: unknown) {
    const message = cause instanceof Error ? cause.message : 'That Google sign-in could not be verified.'
    throw new HttpError(401, message)
  }

  // `sub` is the identity. Email is only used to find an account to refuse.
  const bySub = await prisma.user.findUnique({ where: { googleSub: identity.sub } })
  if (bySub) {
    await startSession(res, bySub.id)
    send(res, 200, { user: toUser(bySub) })
    return
  }

  const byEmail = await prisma.user.findUnique({ where: { email: identity.email } })
  if (byEmail) {
    // Deliberately not an automatic merge. Linking Google to an existing
    // password account without proving control of it would let anyone who
    // creates a Google account with that address take the account over.
    throw new HttpError(
      409,
      googleIsAuthoritative(identity)
        ? 'An account already exists for this email address. Sign in with your password, then connect Google from your profile.'
        : 'An account already exists for this email address. Sign in with your password to continue.',
    )
  }

  const id = createId('usr')
  const created = await prisma.user.create({
    data: {
      id,
      email: identity.email,
      // No password: this account can only be entered through Google.
      passwordHash: '',
      googleSub: identity.sub,
      role: 'student',
      firstName: identity.givenName || 'Student',
      lastName: identity.familyName || '',
      profileComplete: false,
      // Google is authoritative for the address it just asserted, so there is
      // nothing left to confirm.
      emailVerified: true,
    },
  })

  await prisma.studentProfile.create({ data: { userId: id } })

  await startSession(res, created.id)
  send(res, 201, { user: toUser(created), needsProfile: true })
})

/**
 * Complete the profile of a Google-created account.
 *
 * Separate from `PATCH /api/profile` because that route edits an existing
 * student's details, whereas this is the one-time step that turns a bare
 * Google account into a student record. It accepts the details Google cannot
 * supply and flips `profileComplete` so the route guard releases the student.
 */
route('POST', '/api/auth/google/complete', async ({ req, res, user }) => {
  const signedIn = requireUser(user)
  const body = await readJson(req)

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  if (!firstName || !lastName) throw new HttpError(400, 'Enter your first and last name.')

  // The same prerequisites as registration, so a Google account ends up with
  // the same shape of record as a password account.
  const details = readStudentDetails(body)

  const updated = await prisma.user.update({
    where: { id: signedIn.id },
    data: { firstName, lastName, profileComplete: true },
  })

  await prisma.studentProfile.upsert({
    where: { userId: signedIn.id },
    update: details,
    create: { userId: signedIn.id, ...details },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: signedIn.id,
      title: 'Profile complete',
      body: 'Add your school, course and year level so listings can be matched to you.',
      createdAt: new Date(),
      link: '/student/profile',
    },
  })

  send(res, 200, { user: toUser(updated) })
})

route('POST', '/api/auth/logout', async ({ req, res }) => {
  const sessionId = parseCookies(req)[SESSION_COOKIE]
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined)
  }
  endSession(res)
  send(res, 200, { ok: true })
})

/** Education levels the student profile accepts, mirroring src/lib/constants.ts. */
const EDUCATION_LEVEL_VALUES = ['senior-high', 'college', 'vocational', 'graduate']

interface StudentDetails {
  phone: string
  municipality: string
  barangay: string
  birthDate: string
  educationLevel: string
  school: string
  course: string
  yearLevel: string
  address: string
  gwa: number | null
  householdIncome: number | null
  guardianName: string
  guardianContact: string
}

/**
 * Read and validate the student details that registration and Google sign-up
 * both collect.
 *
 * One definition, because the two routes must not accept different things —
 * otherwise two students would have differently-shaped records depending on
 * how they signed in. Everything required here is required because eligibility
 * is decided on it; the optional fields are only optional because a first-year
 * student has no GWA yet and not everyone knows the household income.
 */
function readStudentDetails(body: Record<string, unknown>): StudentDetails {
  const phone = String(body.phone ?? '').trim()
  const municipality = String(body.municipality ?? '').trim()
  const barangay = String(body.barangay ?? '').trim()
  const birthDate = String(body.birthDate ?? '').trim()
  const educationLevel = String(body.educationLevel ?? '').trim()
  const school = String(body.school ?? '').trim()
  const course = String(body.course ?? '').trim()
  const yearLevel = String(body.yearLevel ?? '').trim()

  if (!phone || !/^[\d\s+()-]{7,20}$/.test(phone)) {
    throw new HttpError(400, 'Enter a valid contact number.')
  }
  if (!MUNICIPALITIES_ONLY.includes(municipality)) {
    throw new HttpError(400, 'Choose the municipality you live in.')
  }
  if (!barangay) throw new HttpError(400, 'Enter your barangay.')
  if (!EDUCATION_LEVEL_VALUES.includes(educationLevel)) {
    throw new HttpError(400, 'Choose your education level.')
  }
  if (!school) throw new HttpError(400, 'Enter the school you attend.')
  if (!course) throw new HttpError(400, 'Enter your course or strand.')
  if (!yearLevel) throw new HttpError(400, 'Choose your year level.')

  const born = new Date(birthDate)
  if (!birthDate || Number.isNaN(born.getTime())) {
    throw new HttpError(400, 'Enter your birth date.')
  }
  if (born.getTime() > Date.now()) {
    throw new HttpError(400, 'Your birth date cannot be in the future.')
  }

  const optionalNumber = (value: unknown, max: number): number | null => {
    if (value === undefined || value === null || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null
  }

  return {
    phone,
    municipality,
    barangay,
    birthDate,
    educationLevel,
    school,
    course,
    yearLevel,
    address: String(body.address ?? '').trim(),
    gwa: optionalNumber(body.gwa, 5),
    householdIncome: optionalNumber(body.householdIncome, 100_000_000),
    guardianName: String(body.guardianName ?? '').trim(),
    guardianContact: String(body.guardianContact ?? '').trim(),
  }
}

route('POST', '/api/auth/register', async ({ req, res }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()

  if (!email || !password || password.length < 8 || !firstName || !lastName) {
    throw new HttpError(400, 'Please complete every required field.')
  }

  // The student details are a prerequisite, not a later profile edit, so they
  // are validated here rather than trusted from the form.
  const details = readStudentDetails(body)

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) throw new HttpError(409, 'An account with that email address already exists.')

  const id = createId('usr')
  const created = await prisma.user.create({
    data: {
      id,
      email,
      passwordHash: hashPassword(password),
      role: 'student',
      firstName,
      lastName,
      // A self-registered account starts unconfirmed. The Google route sets
      // this true, because Google is the authority for the addresses it issues.
      emailVerified: false,
    },
  })

  await prisma.studentProfile.create({
    data: { userId: id, ...details },
  })

  await prisma.notification.create({
    data: {
      id: createId('ntf'),
      userId: id,
      title: 'Welcome to Scholar',
      body: 'Complete your student profile to improve your scholarship matches.',
      createdAt: new Date(),
      link: '/student/profile',
    },
  })

  await startSession(res, id)
  send(res, 201, { user: toUser(created) })
})

/* Test credentials live in the client (src/lib/testAccounts.ts) rather than
   behind an endpoint, so the server never serves passwords. */

/* ------------------------------------------------------------------ */
/* One-time codes                                                      */
/* ------------------------------------------------------------------ */

/** The address a request came from, for throttling and the audit trail. */
function requestOrigin(req: IncomingMessage): string | null {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? null
}

/**
 * Request a one-time code.
 *
 * The response is deliberately identical whether or not the address belongs to
 * an account: a different answer here would turn this endpoint into a way to
 * discover which students are registered. That is also why the delivery
 * message is worded the same either way.
 */
route('POST', '/api/auth/otp/request', async ({ req, res }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim().toLowerCase()
  const purpose = String(body.purpose ?? 'verify-email') as OtpPurpose

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, 'Enter a valid email address.')
  }
  if (purpose !== 'verify-email' && purpose !== 'reset-password') {
    throw new HttpError(400, 'That is not a valid verification purpose.')
  }

  const origin = requestOrigin(req)
  if (origin && !checkAddressAllowance(origin)) {
    throw new HttpError(429, 'Too many codes requested. Try again later.')
  }

  const account = await prisma.user.findUnique({ where: { email } })
  const transport = mailTransport()

  // A code is only ever issued to a real account, but the caller cannot tell:
  // the same work is done and the same reply returned when the address is
  // unknown, so timing and wording both stay flat.
  if (account && !(purpose === 'verify-email' && account.emailVerified)) {
    try {
      const issued = await issueCode({ userId: account.id, purpose, requestedFrom: origin })
      const settings = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })

      await transport.send(
        buildOtpMessage({
          to: account.email,
          code: issued.code,
          purpose,
          expiresInSeconds: issued.expiresInSeconds,
          contactEmail: settings?.contactEmail ?? 'the scholarship office',
        }),
      )
    } catch (cause: unknown) {
      // A throttle is the caller's business and is reported; a delivery failure
      // is not, so it is logged and swallowed to keep the reply uniform.
      if (cause instanceof HttpError) throw cause
      console.error('[otp] delivery failed:', cause instanceof Error ? cause.message : cause)
    }
  }

  await settleDeliveryDelay()
  await pruneExpiredCodes()

  send(res, 200, {
    submitted: true,
    ...OTP_POLICY,
    // Says where the message actually went, so the interface never claims an
    // email was sent when the console transport handled it.
    delivery: transport.delivery,
  })
})

/**
 * Check a code.
 *
 * `verify-email` marks the address confirmed. `reset-password` also sets a new
 * password in the same request, so a verified code is never left sitting
 * around as a bearer token for a later call.
 */
route('POST', '/api/auth/otp/verify', async ({ req, res, user }) => {
  const body = await readJson(req)
  const email = String(body.email ?? '').trim().toLowerCase()
  const code = String(body.code ?? '').trim()
  const purpose = String(body.purpose ?? 'verify-email') as OtpPurpose

  if (!email || !code) throw new HttpError(400, 'Enter the code we sent you.')
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'The code is six digits.')

  const account = await prisma.user.findUnique({ where: { email } })
  // One message for an unknown address and a wrong code alike.
  if (!account) throw new HttpError(400, 'That code is not valid or has expired.')

  const accepted = await consumeCode({ userId: account.id, purpose, code })
  if (!accepted) throw new HttpError(400, 'That code is not valid or has expired.')

  if (purpose === 'verify-email') {
    const updated = await prisma.user.update({
      where: { id: account.id },
      data: { emailVerified: true },
    })
    if (user?.id === account.id) {
      send(res, 200, { user: toUser(updated) })
      return
    }
    send(res, 200, { verified: true })
    return
  }

  // reset-password
  const password = String(body.password ?? '')
  if (password.length < 8) {
    throw new HttpError(400, 'Choose a password of at least 8 characters.')
  }

  // An account created through Google has no password to reset; setting one is
  // a different action, so it is refused rather than silently allowed.
  if (!account.passwordHash) {
    throw new HttpError(409, 'This account signs in with Google, so it has no password to reset.')
  }

  await prisma.user.update({
    where: { id: account.id },
    data: { passwordHash: hashPassword(password) },
  })

  // A password change invalidates every existing session, including any that
  // belonged to whoever prompted the reset.
  await prisma.session.deleteMany({ where: { userId: account.id } })

  send(res, 200, { reset: true })
})
