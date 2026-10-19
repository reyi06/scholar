import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { prisma } from '../server/db.ts'

/**
 * Post-build prerender.
 *
 * The app is a single-page application, so every URL would otherwise serve the
 * same empty shell: search engines index nothing, and sharing a listing to
 * Facebook produces a bare link with no preview. This runs after `vite build`
 * and writes one HTML file per public route with real <title>, description and
 * Open Graph tags, while still shipping the SPA bundle so the page behaves
 * normally once it loads.
 *
 * It also regenerates sitemap.xml and robots.txt with the real domain, draws the
 * PWA icons and Open Graph image (no image dependency), and emits the service
 * worker.
 *
 * Run with: node --env-file=.env scripts/prerender.ts
 */

const DIST = 'dist'
/** Set SITE_URL when building for a real domain. */
const SITE_URL = (process.env.SITE_URL ?? 'https://example.com').replace(/\/$/, '')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error(`No ${DIST}/index.html — run "vite build" first.`)
  process.exit(1)
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8')

/* ------------------------------------------------------------------ */
/* Head injection                                                      */
/* ------------------------------------------------------------------ */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Drop the shell's own title/description so per-page ones can take their place. */
function stripHead(html: string): string {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
    .replace(/<meta\s+property="og:[^"]+"[\s\S]*?\/>\s*/g, '')
    .replace(/<meta\s+name="twitter:[^"]+"[\s\S]*?\/>\s*/g, '')
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>\s*/g, '')
}

interface PageMeta {
  title: string
  description: string
  /** Path beginning with a slash. */
  path: string
  /** Unpublished listings are excluded from social previews and the sitemap. */
  noindex?: boolean
}

function renderPage(meta: PageMeta): string {
  const url = `${SITE_URL}${meta.path === '/' ? '' : meta.path}`
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)

  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    meta.noindex ? '<meta name="robots" content="noindex, follow" />' : '',
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Scholar" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
  ]
    .filter(Boolean)
    .join('\n    ')

  return stripHead(template).replace('</head>', `  ${head}\n  </head>`)
}

function writePage(meta: PageMeta): void {
  // An index.html inside the path directory is served for both "/x" and "/x/"
  // by the common static hosts, so no trailing-slash rewrite is needed.
  const file =
    meta.path === '/' ? join(DIST, 'index.html') : join(DIST, meta.path, 'index.html')

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, renderPage(meta), 'utf8')
}

/* ------------------------------------------------------------------ */
/* Minimal PNG encoder (no image dependency)                            */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = -1
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typed), 0)
  return Buffer.concat([length, typed, crc])
}

/** Canvas of raw RGBA pixels with a couple of primitives, enough for flat brand art. */
function createCanvas(width: number, height: number) {
  const pixels = Buffer.alloc(width * height * 4)
  return {
    width,
    height,
    fill(color: [number, number, number]) {
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = color[0]
        pixels[i + 1] = color[1]
        pixels[i + 2] = color[2]
        pixels[i + 3] = 255
      }
    },
    /** Isosceles diamond, used for the mortarboard. */
    diamond(cx: number, cy: number, halfW: number, halfH: number, color: [number, number, number]) {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (Math.abs(x - cx) / halfW + Math.abs(y - cy) / halfH <= 1) {
            const i = (y * width + x) * 4
            pixels[i] = color[0]
            pixels[i + 1] = color[1]
            pixels[i + 2] = color[2]
          }
        }
      }
    },
    rect(x0: number, y0: number, w: number, h: number, color: [number, number, number]) {
      for (let y = y0; y < y0 + h; y += 1) {
        for (let x = x0; x < x0 + w; x += 1) {
          if (x < 0 || y < 0 || x >= width || y >= height) continue
          const i = (y * width + x) * 4
          pixels[i] = color[0]
          pixels[i + 1] = color[1]
          pixels[i + 2] = color[2]
        }
      }
    },
    toPng(): Buffer {
      const raw = Buffer.alloc(height * (width * 4 + 1))
      for (let y = 0; y < height; y += 1) {
        raw[y * (width * 4 + 1)] = 0 // filter: none
        pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
      }
      const ihdr = Buffer.alloc(13)
      ihdr.writeUInt32BE(width, 0)
      ihdr.writeUInt32BE(height, 4)
      ihdr[8] = 8 // bit depth
      ihdr[9] = 6 // RGBA
      return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', deflateSync(raw, { level: 9 })),
        pngChunk('IEND', Buffer.alloc(0)),
      ])
    },
  }
}

const MAROON: [number, number, number] = [124, 29, 32]
const WHITE: [number, number, number] = [255, 255, 255]
const GOLD: [number, number, number] = [201, 162, 39]

/** Brand mark at any size, drawn from primitives. Full-bleed, maskable-safe. */
function drawIcon(size: number): Buffer {
  const canvas = createCanvas(size, size)
  canvas.fill(MAROON)
  canvas.diamond(size / 2, size * 0.44, size * 0.31, size * 0.17, WHITE)
  canvas.rect(
    Math.round(size * 0.22),
    Math.round(size * 0.7),
    Math.round(size * 0.56),
    Math.max(2, Math.round(size * 0.055)),
    GOLD,
  )
  return canvas.toPng()
}

function drawOgImage(): Buffer {
  const width = 1200
  const height = 630
  const canvas = createCanvas(width, height)
  canvas.fill(MAROON)
  canvas.diamond(width / 2, height * 0.42, width * 0.16, height * 0.24, WHITE)
  canvas.rect(Math.round(width * 0.28), Math.round(height * 0.82), Math.round(width * 0.44), 14, GOLD)
  return canvas.toPng()
}

/* ------------------------------------------------------------------ */
/* Crawler files                                                       */
/* ------------------------------------------------------------------ */

async function writeSitemap(): Promise<number> {
  const listings = await prisma.scholarship.findMany({
    where: { status: { not: 'draft' } },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  const entries: { loc: string; changefreq: string; priority: string; lastmod?: string }[] = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/scholarships', changefreq: 'daily', priority: '0.9' },
    { loc: '/announcements', changefreq: 'daily', priority: '0.7' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
    { loc: '/faqs', changefreq: 'monthly', priority: '0.5' },
    { loc: '/register', changefreq: 'monthly', priority: '0.4' },
    { loc: '/login', changefreq: 'yearly', priority: '0.2' },
    ...listings.map((listing) => ({
      loc: `/scholarships/${listing.id}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: listing.updatedAt.toISOString().slice(0, 10),
    })),
  ]

  const body = entries
    .map(
      (entry) =>
        `  <url>\n    <loc>${SITE_URL}${entry.loc === '/' ? '/' : entry.loc}</loc>\n` +
        (entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>\n` : '') +
        `    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`,
    )
    .join('\n')

  writeFileSync(
    join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
    'utf8',
  )

  return listings.length
}

function writeRobots(): void {
  writeFileSync(
    join(DIST, 'robots.txt'),
    `# Generated by scripts/prerender.ts — edit that file, not this one.\n\nUser-agent: *\nAllow: /\nDisallow: /student/\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    'utf8',
  )
}

/**
 * Runtime-caching service worker.
 *
 * Asset filenames are content-hashed, so a static precache list would go stale
 * on every build; caching them on first use avoids that. Navigations are
 * network-first with a cached-shell fallback so the app still opens offline,
 * and the API is never cached — stale application data would be worse than an
 * honest error.
 */
function writeServiceWorker(): void {
  const source = `const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png']
const SHELL_CACHE = 'pgc-shell-v1'
const ASSET_CACHE = 'pgc-assets-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never cache the API: a stale response could show the wrong application state.
  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html').then((cached) => cached ?? Response.error())),
    )
    return
  }

  if (url.pathname.startsWith('/assets/') || /\\.(png|svg|webmanifest|woff2?|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
  }
})
`
  writeFileSync(join(DIST, 'sw.js'), source, 'utf8')
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

const listings = await prisma.scholarship.findMany({
  where: { status: { not: 'draft' } },
  orderBy: { deadline: 'asc' },
})

let written = 0

for (const listing of listings) {
  const summary = listing.description.replace(/\s+/g, ' ').trim()
  writePage({
    title: `${listing.name} — ${listing.provider} | Scholar`,
    description: summary.length > 155 ? `${summary.slice(0, 152).trimEnd()}...` : summary,
    path: `/scholarships/${listing.id}`,
  })
  written += 1
}

writePage({
  title: 'Scholar - Scholarships in Pampanga',
  description:
    'Search scholarship listings across Pampanga, keep a shortlist and track your applications, semester registration and confirmed grants in one place.',
  path: '/',
})
writePage({
  title: 'Scholarships in Pampanga | Scholar',
  description:
    'Search scholarship listings from provincial, municipal, national, educational and private providers across Pampanga. Filter by municipality, education level and deadline.',
  path: '/scholarships',
})
writePage({
  title: 'About Scholar',
  description:
    'How scholarship applications, semester registration and confirmed grants work on Scholar.',
  path: '/about',
})
writePage({
  title: 'Announcements | Scholar',
  description:
    'Deadlines, advisories and results from the Pampanga scholarship office.',
  path: '/announcements',
})
writePage({
  title: 'Privacy Notice | Scholar',
  description:
    'What Scholar collects, why, who can see it, how long it is kept, and the rights of a data subject under the Data Privacy Act.',
  path: '/privacy',
})
writePage({
  title: 'Frequently Asked Questions | Scholar',
  description:
    'How scholarships, applications, semester registration and confirmed grants work on Scholar.',
  path: '/faqs',
})
writePage({
  title: 'Create a Student Account | Scholar',
  description: 'Save listings, submit applications and follow their progress.',
  path: '/register',
})
writePage({
  title: 'Sign In | Scholar',
  description: 'Access your applications, semester registration and grants.',
  path: '/login',
  // Auth screens have nothing to offer a search result.
  noindex: true,
})
written += 8

/**
 * Brand images are written to public/ (so the dev server serves them and they
 * are the committed source of truth) *and* into dist/ — because Vite has
 * already copied public/ by the time this script runs, so writing only to
 * public/ would leave them out of the current build.
 */
function writeAsset(name: string, bytes: Buffer): void {
  writeFileSync(join('public', name), bytes)
  writeFileSync(join(DIST, name), bytes)
}

writeAsset('og-image.png', drawOgImage())
writeAsset('icon-192.png', drawIcon(192))
writeAsset('icon-512.png', drawIcon(512))
writeAsset('apple-touch-icon.png', drawIcon(180))
const sitemapListings = await writeSitemap()
writeRobots()
writeServiceWorker()

console.log(`Prerendered ${written} pages (${listings.length} listings)`)
console.log(`  sitemap.xml          ${sitemapListings + 8} urls`)
console.log('  robots.txt           regenerated')
console.log('  og-image.png         1200x630')
console.log('  icon-192/512, apple-touch-icon')
console.log('  sw.js                offline shell + asset caching')
console.log(`  site url             ${SITE_URL}`)

process.exit(0)
