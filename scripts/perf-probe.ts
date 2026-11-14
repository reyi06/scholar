import { chromium } from 'playwright-core'

/**
 * Performance probe for a deployed origin.
 *
 * Reports the numbers Core Web Vitals are graded on, plus the payload that
 * causes them. It is a lab measurement from this machine, not field data: the
 * field equivalents (CrUX) only exist for sites with enough Chrome traffic.
 *
 * Run with: node scripts/perf-probe.ts https://your-site.example
 */

const target = process.argv[2]
if (!target) {
  console.error('Usage: node scripts/perf-probe.ts <url>')
  process.exit(1)
}

const routes = ['/', '/scholarships', '/scholarships/sch_001', '/faqs']

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results: string[] = []

for (const route of routes) {
  const context = await browser.newContext({
    // A mid-range Android over a slow connection, which is what the audience
    // actually uses, not this laptop.
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  // Unthrottled numbers flatter the site; the audience is on mid-range Android
  // over 3G, so measure that. 4x CPU slowdown approximates a mid-range phone.
  const cdp = await context.newCDPSession(page)
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  const bytes = { js: 0, css: 0, img: 0, other: 0 }
  page.on('response', async (response) => {
    const type = response.request().resourceType()
    const length = Number(response.headers()['content-length'] ?? 0)
    if (type === 'script') bytes.js += length
    else if (type === 'stylesheet') bytes.css += length
    else if (type === 'image') bytes.img += length
    else bytes.other += length
  })

  const started = Date.now()
  await page.goto(target + route, { waitUntil: 'networkidle', timeout: 60_000 })
  const loadMs = Date.now() - started

  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const paint = performance.getEntriesByType('paint')
    const fcp = paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null

    // LCP is only exposed through a buffered observer; reading the entry list
    // directly returns nothing.
    const lcp = await new Promise<number | null>((resolve) => {
      const seen: number[] = []
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) seen.push(entry.startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {
        resolve(null)
        return
      }
      setTimeout(() => resolve(seen.length > 0 ? seen[seen.length - 1] : null), 400)
    })

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const sum = (predicate: (entry: PerformanceResourceTiming) => boolean) =>
      Math.round(resources.filter(predicate).reduce((total, entry) => total + entry.transferSize, 0) / 1024)
    const isScript = (entry: PerformanceResourceTiming) => entry.initiatorType === 'script' || entry.name.endsWith('.js')

    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      fcp: fcp === null ? null : Math.round(fcp),
      lcp: lcp === null ? null : Math.round(lcp),
      domNodes: document.querySelectorAll('*').length,
      jsKb: sum(isScript),
      imgKb: sum((entry) => entry.initiatorType === 'img' || entry.name.endsWith('.png') || entry.name.endsWith('.svg')),
      transfers: Math.round(resources.reduce((total, entry) => total + entry.transferSize, 0) / 1024),
    }
  })

  results.push(
    [
      route.padEnd(24),
      `ttfb ${metrics.ttfb}ms`.padEnd(13),
      `fcp ${metrics.fcp}ms`.padEnd(12),
      `lcp ${metrics.lcp}ms`.padEnd(12),
      `wall ${loadMs}ms`.padEnd(13),
      `transfer ${metrics.transfers}KB`.padEnd(18),
      `js ${metrics.jsKb}KB`.padEnd(12),
      `dom ${metrics.domNodes}`,
    ].join(' '),
  )

  await context.close()
}

await browser.close()
console.log(results.join('\n'))
