/**
 * Static file serving — release-only addition, not part of the repository.
 *
 * In the repo the built site is served by a host and the API by Node. A
 * Cloudflare tunnel maps one hostname to one local origin, so both have to come
 * out of this process: `/api/*` stays with the router, everything else is a file
 * from `dist/`, with `index.html` as the fallback for client-side routes.
 *
 * The CSP below is copied from `vite.config.ts`, where the preview server sets
 * it. The prerendered HTML carries no policy of its own, so it is set here.
 */

import { createReadStream, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'

const DIST = resolve(process.env.STATIC_DIR ?? 'dist')

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

/** Resolves a URL path to a file inside DIST, or null. Anything outside is refused. */
function fileAt(path: string): string | null {
  const target = resolve(join(DIST, path))
  if (target !== DIST && !target.startsWith(DIST + sep)) return null
  try {
    const stat = statSync(target)
    if (stat.isFile()) return target
    const index = join(target, 'index.html')
    if (statSync(index).isFile()) return index
  } catch {
    // Not a file: fall through to the next candidate.
  }
  return null
}

/** Returns true when the response was written. */
export function serveStatic(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false

  let clean: string
  try {
    clean = decodeURIComponent(pathname)
  } catch {
    return false
  }

  const file = fileAt(clean) ?? fileAt('index.html')
  if (!file) return false

  const ext = extname(file)
  const size = statSync(file).size
  const immutable = clean.startsWith('/assets/')

  res.writeHead(200, {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': size,
    // Hashed asset names can be cached forever; everything else must be
    // revalidated, or a new build keeps serving the old shell.
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...(ext === '.html' ? { 'Content-Security-Policy': CSP } : {}),
  })

  if (req.method === 'HEAD') {
    res.end()
    return true
  }

  createReadStream(file).pipe(res)
  return true
}
