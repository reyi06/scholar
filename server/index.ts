import { createServer } from 'node:http'
import { applySecurityHeaders, send } from './http/responses.ts'
import { currentUser } from './http/auth.ts'
import { match, routes, type Route } from './http/router.ts'
import { HttpError } from './httpError.ts'

/**
 * API entry point.
 *
 * Routes live in `server/routes/`, grouped by resource, and register themselves
 * on import. This file owns only the HTTP server: dispatch, error handling and
 * the listen call.
 *
 * Run with: npm run server
 */

const PORT = Number(process.env.API_PORT ?? 8787)

import './routes/announcements.ts'
import './routes/applications.ts'
import './routes/audit.ts'
import './routes/auth.ts'
import './routes/documents.ts'
import './routes/grants.ts'
import './routes/maintenance.ts'
import './routes/me.ts'
import './routes/notifications.ts'
import './routes/profile.ts'
import './routes/registrations.ts'
import './routes/reports.ts'
import './routes/scholarships.ts'
import './routes/settings.ts'
import './routes/students.ts'

export const __routes = routes

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Server                                                              */
/* ------------------------------------------------------------------ */

const server = createServer((req, res) => {
  void (async () => {
    applySecurityHeaders(req, res)
    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
      const segments = url.pathname.split('/').filter(Boolean)
      const method = req.method ?? 'GET'

      // Collect every match, then prefer the one with the fewest parameter
      // segments. Without this, registration order decides, and a static path
      // such as /api/applications/counts gets swallowed by /api/applications/:id.
      const candidates: { params: Record<string, string>; score: number; handler: Route['handler'] }[] = []

      for (const candidate of routes) {
        const params = match(candidate, method, segments)
        if (params) {
          candidates.push({ params, score: Object.keys(params).length, handler: candidate.handler })
        }
      }

      if (candidates.length === 0) {
        send(res, 404, { error: `No route for ${method} ${url.pathname}` })
        return
      }

      candidates.sort((a, b) => a.score - b.score)
      const chosen = candidates[0]

      const user = await currentUser(req)
      await chosen.handler({ req, res, params: chosen.params, query: url.searchParams, user })
    } catch (error: unknown) {
      if (error instanceof HttpError) {
        send(res, error.status, { error: error.message })
        return
      }
      const message = error instanceof Error ? error.message : 'Unexpected server error.'
      console.error('[api]', message)
      send(res, 500, { error: 'Something went wrong on the server.' })
    }
  })()
})

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

export { server }
export { safeEqual } from './http/router.ts'
