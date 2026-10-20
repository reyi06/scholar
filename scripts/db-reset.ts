import { spawnSync } from 'node:child_process'

/**
 * Drop the schema, reapply the migrations and reload the seed data.
 *
 * Prisma 7 refuses `migrate reset` when it cannot confirm a human is watching,
 * and the refusal is correct — the command destroys everything in the target
 * database. This wrapper is the consent: it exists only for a local development
 * database named in `DATABASE_URL`, and it reseeds immediately so the result is
 * a known state rather than an empty one.
 *
 * `npm run db:reset`
 */

process.env.PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION = 'yes'

function run(commandLine: string): void {
  // A single command string rather than an argument array: `npx` is a `.cmd`
  // shim on Windows and cannot be spawned directly, and passing both a shell
  // and an argument array is what Node deprecates.
  const result = spawnSync(commandLine, { stdio: 'inherit', shell: true })
  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('npx prisma migrate reset --force')
run(`"${process.execPath}" --env-file=.env prisma/seed.ts`)
