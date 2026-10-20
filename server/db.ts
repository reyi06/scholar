import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Shared Prisma client.
 *
 * Prisma 7 requires a driver adapter. PostgreSQL is the deployment target and
 * the local database, so the same adapter serves both — Supabase included, since
 * it is PostgreSQL with a connection string.
 *
 * `DATABASE_URL` is read from `.env` by the `--env-file` flag on every npm script
 * that touches the database. A direct (port 5432) URL is preferred over a pooler
 * for migrations; the pooler is for application traffic at scale.
 */
const url = process.env.DATABASE_URL

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database.',
  )
}

const adapter = new PrismaPg({ connectionString: url })

export const prisma = new PrismaClient({ adapter })
