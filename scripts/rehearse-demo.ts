import { chromium, type BrowserContext, type Page } from 'playwright-core'

/**
 * Demo rehearsal.
 *
 * Walks the scripted demonstration in order, against a running build, and
 * reports how long each step takes and whether it actually happened. The point
 * is not a test suite — it is to find out, before an audience, which step is
 * slow, which control has moved, and where a click lands on nothing.
 *
 * Run against the production preview so timings mean something:
 *
 *   npm run build && npm run preview      # in one terminal
 *   npm run server                        # in another
 *   npm run rehearse                      # in a third
 *
 * By default it creates a throwaway student account, submits an application and
 * confirms a grant. Back up `prisma/dev.db` first if the demonstration data
 * matters.
 */

const BASE = process.env.REHEARSE_BASE ?? 'http://localhost:4173'
const API = process.env.REHEARSE_API ?? 'http://localhost:8787'

const STAMP = Date.now().toString().slice(-6)
const STUDENT = {
  email: `rehearsal.${STAMP}@example.com`,
  password: 'defense123',
  firstName: 'Rehearsal',
  lastName: 'Demo',
}

interface Result {
  step: string
  ms: number
  ok: boolean
  note: string
}

const results: Result[] = []

/** Captured at registration, so later steps act on this student's records only. */
let rehearsalStudentId = ''

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

async function step(name: string, run: () => Promise<string>): Promise<void> {
  const started = Date.now()
  try {
    const note = await run()
    results.push({ step: name, ms: Date.now() - started, ok: true, note })
  } catch (cause: unknown) {
    results.push({
      step: name,
      ms: Date.now() - started,
      ok: false,
      note: cause instanceof Error ? cause.message.split('\n')[0] : 'unknown failure',
    })
  }
}

/** Wait for the client-rendered page to have painted its heading. */
async function heading(page: Page, expected?: RegExp): Promise<string> {
  await page.waitForSelector('h1', { timeout: 25_000 })
  const text = ((await page.textContent('h1')) ?? '').trim()
  if (expected) expect(expected.test(text), `heading was "${text}"`)
  return text
}

async function signIn(page: Page, role: 'student' | 'admin'): Promise<void> {
  const credentials =
    role === 'admin'
      ? { email: 'admin@example.com', password: 'admin123' }
      : { email: 'maria.santos@example.com', password: 'student123' }

  const response = await page.request.post(`${API}/api/auth/login`, { data: credentials })
  expect(response.ok(), `sign-in as ${role} returned ${response.status()}`)
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const guest: BrowserContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await guest.newPage()

  try {
    // 1 — The directory is the first thing the panel sees.
    await step('1  Home', async () => {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
      const h1 = await heading(page)
      expect(/find a scholarship/i.test(h1), `unexpected heading "${h1}"`)
      return h1
    })

    await step('2  Directory filter', async () => {
      await page.goto(`${BASE}/scholarships`, { waitUntil: 'domcontentloaded' })
      await heading(page, /scholarships/i)
      await page.waitForSelector('#directory-type')
      await page.selectOption('#directory-type', 'provincial')
      await page.waitForFunction(() => /filtered/i.test(document.body.innerText), undefined, {
        timeout: 15_000,
      })
      return 'type filter applied and results updated'
    })

    await step('3  Listing detail and share', async () => {
      await page.click("a[href^='/scholarships/']")
      await page.waitForURL(/\/scholarships\/.+/)
      await heading(page)
      await page.getByRole('button', { name: 'Share', exact: true }).click()
      // The encoder is a lazy chunk, so the SVG appears a moment after opening.
      await page.waitForSelector('[role=dialog] path', { timeout: 15_000 })
      const path = (await page.getAttribute('[role=dialog] path', 'd')) ?? ''
      expect(/h1v1h-1z/.test(path), 'QR path did not render')
      await page.keyboard.press('Escape')
      return `QR rendered, ${(path.match(/h1v1h-1z/g) ?? []).length} modules`
    })

    // 4 — Sign-up, as the paper describes it: account, then student details.
    await step('4  Register (two steps)', async () => {
      await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' })
      await heading(page, /create a student account/i)

      await page.fill('#register-first-name', STUDENT.firstName)
      await page.fill('#register-last-name', STUDENT.lastName)
      await page.fill('#register-email', STUDENT.email)
      await page.fill('#register-password', STUDENT.password)
      await page.fill('#register-confirm-password', STUDENT.password)
      await page.check('#register-privacy')
      await page.getByRole('button', { name: /continue/i }).click()

      await page.waitForSelector('#register-school', { timeout: 15_000 })
      await page.fill('#register-phone', '09171234567')
      await page.fill('#register-birthDate', '2004-05-12')
      await page.selectOption('#register-municipality', 'Apalit')
      await page.fill('#register-barangay', 'San Juan')
      await page.selectOption('#register-educationLevel', 'college')
      await page.fill('#register-school', 'Pampanga State University')
      await page.fill('#register-course', 'BS Information Technology')
      await page.selectOption('#register-yearLevel', '2nd Year')
      await page.getByRole('button', { name: /create account/i }).click()

      await page.waitForURL(/\/student\//, { timeout: 20_000 })

      const session = await page.request.get(`${API}/api/auth/session`)
      const payload = (await session.json()) as { user: { id: string } | null }
      rehearsalStudentId = payload.user?.id ?? ''
      expect(Boolean(rehearsalStudentId), 'could not read the new account id')

      return `signed in as ${STUDENT.email}`
    })

    await step('5  Profile and verification prompt', async () => {
      await page.goto(`${BASE}/student/profile`, { waitUntil: 'domcontentloaded' })
      await heading(page, /my profile/i)
      const body = (await page.textContent('body')) ?? ''
      expect(/not confirmed/i.test(body), 'email verification prompt missing')
      expect(/download my records/i.test(body), 'data-rights actions missing')
      return 'verification prompt and records actions present'
    })

    await step('6  Submit an application', async () => {
      const listing = await page.request.get(
        `${API}/api/scholarships?pageSize=100&status=open`,
      )
      const payload = (await listing.json()) as {
        items: { id: string; name: string; applicationMode: string }[]
      }
      const target = payload.items.find((item) => item.applicationMode === 'internal')
      expect(Boolean(target), 'no internally handled listing available')

      await page.goto(`${BASE}/scholarships/${target!.id}`, { waitUntil: 'domcontentloaded' })
      await heading(page)
      await page.getByRole('button', { name: /start application/i }).click()
      await page.fill('#application-motivation', 'I am applying to support my studies and to keep my grades up this semester.')
      await page.check('#application-confirm')
      await page.getByRole('button', { name: /submit application/i }).click()

      // Submitting closes the dialog and updates this page in place; it does not
      // navigate. Assert the outcome the presenter will point at.
      await page.waitForSelector('[role=dialog]', { state: 'detached', timeout: 20_000 })
      await page.waitForFunction(
        () => /you already have an application/i.test(document.body.innerText),
        undefined,
        { timeout: 20_000 },
      )
      return `applied to ${target!.name}`
    })

    // 7 — The headline rule, exercised through the interface.
    await step('7  Admin approves (no grant created)', async () => {
      await signIn(page, 'admin')
      await page.goto(`${BASE}/admin/applications?status=submitted`, { waitUntil: 'domcontentloaded' })
      await heading(page, /applications/i)

      const before = await page.request.get(`${API}/api/grants?pageSize=1`)
      const beforeCount = ((await before.json()) as { total: number }).total

      const row = page.locator('tr', { hasText: 'Rehearsal Demo' }).first()
      await row.getByRole('button', { name: /^review$/i }).click()
      await page.getByRole('button', { name: /^approve$/i }).click()
      await page.fill('#application-decision-note', 'Requirements complete and verified during the rehearsal.')
      await page.getByRole('button', { name: /apply decision/i }).click()

      await page.waitForTimeout(1500)
      const after = await page.request.get(`${API}/api/grants?pageSize=1`)
      const afterCount = ((await after.json()) as { total: number }).total

      expect(afterCount === beforeCount, `a grant was created by approval (${beforeCount} → ${afterCount})`)
      return `grants unchanged at ${afterCount}`
    })

    await step('8  Grant confirmation', async () => {
      const awaiting = await page.request.get(`${API}/api/applications/awaiting-grant`)
      const rows = (await awaiting.json()) as { id: string; referenceNo: string; studentId: string }[]
      const mine = rows.filter((row) => row.studentId === rehearsalStudentId)
      expect(mine.length > 0, 'the approved application did not appear as awaiting a grant')

      const target = mine[0]
      const response = await page.request.post(`${API}/api/grants/confirm`, {
        data: {
          applicationId: target.id,
          amount: 9500,
          academicYear: '2026-2027',
          semester: '2nd Semester',
          remarks: 'Confirmed during the rehearsal.',
        },
      })
      expect(response.status() === 201, `confirmation returned ${response.status()}`)
      return `confirmed ${target.referenceNo} for ₱9,500`
    })

    await step('9  Student sees the grant and can register', async () => {
      const login = await page.request.post(`${API}/api/auth/login`, {
        data: { email: STUDENT.email, password: STUDENT.password },
      })
      expect(login.ok(), `sign-in as the new student returned ${login.status()}`)

      await page.goto(`${BASE}/student/grants`, { waitUntil: 'domcontentloaded' })
      await heading(page, /my grants/i)
      const body = (await page.textContent('body')) ?? ''
      expect(/9,500/.test(body), 'the new grant is not shown to the student')

      await page.goto(`${BASE}/student/semester-registration`, {
        waitUntil: 'domcontentloaded',
      })
      await heading(page, /semester registration/i)
      const form = (await page.textContent('body')) ?? ''
      expect(!/only available to students with a confirmed grant/i.test(form), 'registration is still blocked')
      return 'grant visible, semester registration unlocked'
    })

    await step('10 Reports', async () => {
      await signIn(page, 'admin')
      await page.goto(`${BASE}/admin/reports`, { waitUntil: 'domcontentloaded' })
      await heading(page, /reports/i)
      // The breakdowns arrive after the report request resolves.
      await page.waitForFunction(
        () => /applications by status/i.test(document.body.innerText),
        undefined,
        { timeout: 20_000 },
      )
      const body = (await page.textContent('body')) ?? ''
      expect(/download csv/i.test(body), 'CSV export missing')
      return 'breakdowns and CSV export present'
    })

    // Bonus check the panel may ask for: the trail recorded the decision.
    await step('11 Activity trail', async () => {
      await page.goto(`${BASE}/admin/activity`, { waitUntil: 'domcontentloaded' })
      await heading(page, /activity/i)
      const body = (await page.textContent('body')) ?? ''
      expect(/application\.decided/i.test(body), 'the decision is not in the trail')
      expect(/grant\.confirmed/i.test(body), 'the grant confirmation is not in the trail')
      return 'decision and confirmation both recorded'
    })
  } finally {
    await guest.close()
    await browser.close()
  }

  const failed = results.filter((result) => !result.ok)
  const total = results.reduce((sum, result) => sum + result.ms, 0)

  console.log('')
  console.log('  Step                                    Time   Result')
  console.log('  ' + '-'.repeat(66))
  for (const result of results) {
    const seconds = `${(result.ms / 1000).toFixed(1)}s`.padStart(6)
    console.log(`  ${result.step.padEnd(38)} ${seconds}   ${result.ok ? 'ok' : 'FAILED'}`)
    if (result.note) console.log(`      ${result.note}`)
  }
  console.log('  ' + '-'.repeat(66))
  console.log(`  ${String(results.length)} steps, ${(total / 1000).toFixed(1)}s total`)

  if (failed.length > 0) {
    console.log(`\n  ${failed.length} step(s) failed.`)
    process.exitCode = 1
  } else {
    console.log('\n  The scripted demonstration ran end to end.')
  }
}

await main()
