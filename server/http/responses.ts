/**
 * responses — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { COOKIE_SECURE } from '../http/auth.ts'
import { HttpError } from '../httpError.ts'

/* Small HTTP helpers                                                  */
/* ------------------------------------------------------------------ */

export function send(res: ServerResponse, status: number, body: unknown): void {
  const payload = body === undefined ? '' : JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  })
  res.end(payload)
}

export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  if (chunks.length === 0) return {}
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    throw new HttpError(400, 'Request body was not valid JSON.')
  }
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=')
    if (index > 0) acc[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    return acc
  }, {})
}

/**
 * Headers applied to every response.
 *
 * Kept in one place so a new route cannot accidentally omit them. This server
 * only answers the API — the interface is served statically, and carries its own
 * policy at the host — but an API response is still worth hardening: it should
 * not be framed, sniffed as another type, or leak the referring page.
 */
export function applySecurityHeaders(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // HSTS only when the request already arrived over TLS: sending it over plain
  // HTTP would lock a developer out of localhost for a year.
  const forwarded = String(req.headers['x-forwarded-proto'] ?? '')
    .split(',')[0]
    .trim()
  if (forwarded === 'https' || COOKIE_SECURE) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
}
