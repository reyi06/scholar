import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

/**
 * Shared Prisma client.
 *
 * Prisma 7 requires a driver adapter. `better-sqlite3` is synchronous and
 * in-process, which suits a local database; the same code shape works against
 * Postgres later by swapping the adapter.
 */
const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'

const adapter = new PrismaBetterSqlite3({ url })

export const prisma = new PrismaClient({ adapter })
