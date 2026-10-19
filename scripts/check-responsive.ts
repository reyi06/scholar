import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium, type Browser, type Page } from 'playwright-core'

/**
 * Responsive check.
 *
 * Drives the locally installed Chrome at three widths and reports, per route,
 * whether the document overflows horizontally and whether the expected heading
 * rendered. Screenshots are written to `tmp/responsive/` for a visual pass.
 *
 * No browser is downloaded: `playwright-core` and an existing Chrome are used,
 * so this stays a dev-only tool with no runtime footprint.
 *
 * Usage:
 *   npm run check:responsive                 # public routes, signed out
 *   npm run check:responsive -- --role=student
 *
 * Requires the dev server (`npm run dev`) and the API (`npm run server`).
 */

const BASE = process.env.CHECK_BASE ?? 'http://localhost:5173'
const API = process.env.CHECK_API ?? 'http://localhost:8787'
const OUT = join(process.cwd(), 'tmp', 'responsive')

/** 390 is a common phone width; 768 a tablet; 1280 a laptop. */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
]

const PUBLIC_ROUTES = [
  '/',
  '/scholarships',
  '/announcements',
  '/about',
  '/faqs',
  '/login',
  '/register',
  '/forgot-password',
]

const STUDENT_ROUTES = [
  '/student/dashboard',
  '/student/profile',
  '/student/saved',
  '/student/applications',
  '/student/documents',
  '/student/semester-registration',
  '/student/grants',
  '/student/notifications',
]

const ADMIN_ROUTES = [
  '/admin/dashboard',
  '/admin/scholarships',
  '/admin/students',
  '/admin/applications',
  '/admin/registrations',
  '/admin/grants',
  '/admin/documents',
  '/admin/announcements',
  '/admin/reports',
  '/admin/settings',
]

const ACCOUNTS = {
  student: { email: 'maria.santos@example.com', password: 'student123' },
  admin: { email: 'admin@example.com', password: 'admin123' },
} as const

type Role = keyof typeof ACCOUNTS

function roleFromArgs(): Role | null {
  const flag = process.argv.find((arg) => arg.startsWith('--role='))
  if (!flag) return null
  const value = flag.slice('--role='.length)
  return value in ACCOUNTS ? (value as Role) : null
}

interface Result {
  viewport: string
  route: string
  heading: string | null
  /** Horizontal overflow in CSS pixels; 0 means the layout fits. */
  overflow: number
  /** Elements wider than the viewport, which usually names the culprit. */
  culprits: string[]
  error?: string
}

async function measure(page: Page): Promise<Omit<Result, 'viewport' | 'route'>> {
  return page.evaluate(() => {
    const viewport = window.innerWidth
    const overflow = Math.max(0, document.documentElement.scrollWidth - viewport)

    // A short list of offenders makes the report actionable rather than a number.
    // Testing `right` rather than `width` catches elements pushed past the edge
    // by negative margins or a fixed minimum width, which is the usual cause.
    const culprits: string[] = []
    if (overflow > 1) {
      for (const element of Array.from(document.querySelectorAll('body *'))) {
        const rect = element.getBoundingClientRect()
        if (rect.right > viewport + 1 && rect.height > 0) {
          const label = `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ').slice(0, 2).join('.')}` : ''}`
          if (!culprits.includes(label)) culprits.push(label)
          if (culprits.length >= 4) break
        }
      }
    }

    return {
      heading: document.querySelector('h1')?.textContent?.trim() ?? null,
      overflow,
      culprits,
    }
  })
}

async function signIn(page: Page, role: Role): Promise<void> {
  const response = await page.request.post(`${API}/api/auth/login`, {
    data: ACCOUNTS[role],
  })
  if (!response.ok()) {
    throw new Error(`Could not sign in as ${role}: ${response.status()}`)
  }
}

async function run(): Promise<void> {
  mkdirSync(OUT, { recursive: true })

  const role = roleFromArgs()
  const routes = role === 'student' ? STUDENT_ROUTES : role === 'admin' ? ADMIN_ROUTES : PUBLIC_ROUTES

  const browser: Browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  })

  const results: Result[] = []

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()

      if (role) await signIn(page, role)

      for (const route of routes) {
        const result: Result = {
          viewport: viewport.name,
          route,
          heading: null,
          overflow: 0,
          culprits: [],
        }

        try {
          await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
          // The app renders client-side; wait for a heading rather than a load event.
          await page.waitForSelector('h1', { timeout: 20_000 }).catch(() => undefined)
          await page.waitForTimeout(600)

          Object.assign(result, await measure(page))

          const file = join(OUT, `${viewport.name}-${route.replace(/[^a-z0-9]+/gi, '_') || 'home'}.png`)
          await page.screenshot({ path: file, fullPage: true })
        } catch (cause: unknown) {
          result.error = cause instanceof Error ? cause.message.split('\n')[0] : 'unknown error'
        }

        results.push(result)
      }

      await context.close()
    }
  } finally {
    await browser.close()
  }

  const failures = results.filter((r) => r.error || r.overflow > 1 || !r.heading)

  console.log(`\n${results.length} page loads across ${VIEWPORTS.length} viewports`)
  console.log(`screenshots: ${OUT}\n`)

  if (failures.length === 0) {
    console.log('ok — no horizontal overflow, every route rendered a heading')
    return
  }

  for (const failure of failures) {
    const problems = [
      failure.error ? `error: ${failure.error}` : '',
      failure.overflow > 1 ? `overflow ${failure.overflow}px (${failure.culprits.join(', ')})` : '',
      !failure.heading ? 'no heading' : '',
    ].filter(Boolean)

    console.log(`FAIL ${failure.viewport.padEnd(7)} ${failure.route.padEnd(34)} ${problems.join('; ')}`)
  }

  process.exitCode = 1
}

await run()
