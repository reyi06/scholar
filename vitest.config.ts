import { defineConfig } from 'vitest/config'

/**
 * Unit and component tests.
 *
 * Kept separate from `vite.config.ts` so the app build never loads test
 * configuration. `jsdom` covers component tests; the server-side modules under
 * test here (`passwords`, `throttle`, `ids`) are pure or in-memory and do not
 * touch the database, which is what keeps the suite fast and deterministic.
 *
 * Workflow rules that span the database and HTTP — approval must not create a
 * grant, ownership checks, upload handling — are covered by
 * `npm run rehearse` and the recorded HTTP checks rather than here.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
