import { defineConfig } from 'prisma/config'

/**
 * Prisma configuration.
 *
 * Prisma 7 reads the datasource URL from here rather than from the schema, and
 * no longer loads `.env` automatically. The SQLite path therefore falls back to
 * a sensible local default, and a real `DATABASE_URL` overrides it in any
 * deployment.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  },
})
