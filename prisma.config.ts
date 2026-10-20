import { defineConfig } from 'prisma/config'

/**
 * Prisma configuration.
 *
 * Prisma 7 reads the datasource URL from here rather than from the schema, and
 * no longer loads `.env` automatically — which is why `npm run server` uses
 * `node --env-file=.env` and the `prisma` CLI commands used to fall back to a
 * hard-coded SQLite path. Node can load the file natively, so the CLI and the
 * server now read the same `.env` and cannot disagree about which database they
 * are pointing at.
 *
 * A missing URL is a configuration error, not a default: falling back to a local
 * file when the schema says PostgreSQL would run migrations against the wrong
 * database, quietly.
 */

try {
  process.loadEnvFile()
} catch {
  // `.env` is optional in CI, where the variable is provided by the platform.
}

const url = process.env.DATABASE_URL

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database.',
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: { url },
})
