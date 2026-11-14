import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

/**
 * Accessibility probe for a deployed origin.
 *
 * Runs axe-core against real pages and reports violations grouped by rule, so a
 * regression is caught the day it lands rather than in a yearly audit.
 *
 * axe finds roughly a third of WCAG issues and none of the judgment calls —
 * reading order, whether a keyboard user can finish a flow, whether alt text is
 * actually descriptive. A clean run is not a conformance claim.
 *
 * Runs without @playwright/test on purpose: the project already has a Vitest
 * suite, and a second test runner for one check is a maintenance cost that
 * usually ends with the check switched off.
 *
 * Run with: node scripts/a11y-probe.ts https://your-site.example
 */

const target = process.argv[2]
if (!target) {
  console.error('Usage: node scripts/a11y-probe.ts <url>')
  process.exit(1)
}

const routes = ['/', '/scholarships', '/scholarships/sch_001', '/faqs', '/login', '/register']

// WCAG 2.2 AA is what DESIGN.md claims, so that is what is scanned.
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js')
const axeSource = (await import('node:fs')).readFileSync(axePath, 'utf8')

interface Violation {
  id: string
  impact: string | null
  help: string
  nodes: { target: string[]; failureSummary?: string }[]
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const found = new Map<string, { impact: string; help: string; pages: Set<string>; nodes: number; sample: string }>()
let scanned = 0

for (const route of routes) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  try {
    const response = await page.goto(target + route, { waitUntil: 'networkidle', timeout: 60_000 })

    // A dead tunnel serves a Cloudflare error page with a 200-ish shape, and
    // scanning that reports someone else's contrast bugs as yours. Refuse to
    // score a page that is not the app.
    const looksLikeErrorPage = await page.evaluate(() => {
      const text = document.body.innerText.slice(0, 400)
      return /Cloudflare Tunnel|Error 1033|Error 1020|Just a moment/i.test(text)
    })
    if (looksLikeErrorPage || (response && response.status() >= 400)) {
      throw new Error(`origin is not serving the app (HTTP ${response?.status()})`)
    }

    await page.addScriptTag({ content: axeSource })
    const violations: Violation[] = await page.evaluate(async (tags) => {
      const result = await (window as unknown as { axe: { run: (context: Document, options: unknown) => Promise<{ violations: Violation[] }> } }).axe.run(
        document,
        { runOnly: { type: 'tag', values: tags } },
      )
      return result.violations
    }, TAGS)

    scanned += 1
    for (const violation of violations) {
      const existing = found.get(violation.id)
      if (existing) {
        existing.pages.add(route)
        existing.nodes += violation.nodes.length
      } else {
        found.set(violation.id, {
          impact: violation.impact ?? 'unknown',
          help: violation.help,
          pages: new Set([route]),
          nodes: violation.nodes.length,
          sample: `${violation.nodes[0]?.target.join(' ')} — ${(violation.nodes[0]?.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 180)}`,
        })
      }
    }
    console.log(`${route.padEnd(24)} ${violations.length === 0 ? 'clean' : `${violations.length} rule(s)`}`)
  } catch (error) {
    console.log(`${route.padEnd(24)} FAILED ${String(error).slice(0, 80)}`)
  } finally {
    await context.close()
  }
}

await browser.close()

if (found.size === 0) {
  console.log(`\nNo automatically detectable WCAG A/AA violations across ${scanned} pages.`)
  process.exit(0)
}

const ranked = [...found.entries()].sort((a, b) => b[1].nodes - a[1].nodes)
console.log(`\n${found.size} rule(s) violated across ${scanned} pages:\n`)
for (const [id, detail] of ranked) {
  console.log(`[${detail.impact}] ${id} — ${detail.help}`)
  console.log(`   ${detail.nodes} node(s) on: ${[...detail.pages].join(', ')}`)
  console.log(`   e.g. ${detail.sample}\n`)
}

// Fail the run on anything a user would notice, so this can gate a release.
const blocking = ranked.filter(([, detail]) => detail.impact === 'critical' || detail.impact === 'serious')
if (blocking.length > 0) process.exitCode = 1
