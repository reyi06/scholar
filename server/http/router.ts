/**
 * router — extracted from server/index.ts.
 *
 * Moved verbatim; behaviour is unchanged.
 */

import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { User } from '../../src/types/index.ts'

/* Router                                                              */
/* ------------------------------------------------------------------ */

export interface Route {
  method: string
  /** Path segments; a segment starting with ':' captures. */
  pattern: string[]
  handler: (ctx: {
    req: IncomingMessage
    res: ServerResponse
    params: Record<string, string>
    query: URLSearchParams
    user: User | null
  }) => Promise<void>
}

export const routes: Route[] = []
export const route = (
  method: string,
  path: string,
  handler: Route['handler'],
): void => {
  routes.push({ method, pattern: path.split('/').filter(Boolean), handler })
}

export function match(route: Route, method: string, segments: string[]): Record<string, string> | null {
  if (route.method !== method) return null
  if (route.pattern.length !== segments.length) return null

  const params: Record<string, string> = {}
  for (let i = 0; i < route.pattern.length; i += 1) {
    const expected = route.pattern[i]
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(segments[i])
    else if (expected !== segments[i]) return null
  }
  return params
}

/** Constant-time comparison so logout cannot be used to probe session ids. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}
