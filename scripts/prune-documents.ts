import { prisma } from '../server/db.ts'
import { deleteUpload } from '../server/uploads.ts'

/**
 * Retention enforcement for uploaded documents.
 *
 * A privacy notice that promises a retention period has to be matched by
 * something that enforces it, or the promise is decoration. This script removes
 * documents that are no longer needed for the purpose they were collected for.
 *
 * What it targets, and what it deliberately leaves alone:
 *
 *  - **Removed:** documents attached to an application that was **declined** and
 *    has been closed for longer than the retention period. Nobody is waiting on
 *    them, and they will never support a decision.
 *  - **Removed:** documents an administrator **returned** and that the student
 *    never replaced, once they are older than the period.
 *  - **Kept:** anything attached to an application that is still in progress, or
 *    that was approved, because it is the evidence the decision rested on.
 *  - **Kept:** everything belonging to a student who holds a confirmed grant,
 *    because profile documents are reused across terms.
 *
 * Dry run by default. Pass `--apply` to delete, and `--months=N` to change the
 * period. This is a deliberate two-step: a retention job that deletes on its
 * first run is a retention job nobody will dare schedule.
 *
 * Usage:
 *   npm run db:prune-documents                 # report only
 *   npm run db:prune-documents -- --apply
 */

const APPLY = process.argv.includes('--apply')
const monthsFlag = process.argv.find((arg) => arg.startsWith('--months='))
const MONTHS = monthsFlag ? Number(monthsFlag.slice('--months='.length)) : 6

if (!Number.isFinite(MONTHS) || MONTHS <= 0) {
  console.error('--months must be a positive number.')
  process.exit(1)
}

const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - MONTHS)

async function main(): Promise<void> {
  // Students holding a confirmed grant are exempt entirely: their documents are
  // still serving their purpose across terms.
  const grantees = await prisma.grant.findMany({
    where: { status: 'active' },
    select: { studentId: true },
    distinct: ['studentId'],
  })
  const protectedStudents = new Set(grantees.map((row) => row.studentId))

  const candidates = await prisma.studentDocument.findMany({
    include: { application: { select: { status: true, referenceNo: true } } },
  })

  const removable = candidates.filter((document) => {
    if (protectedStudents.has(document.studentId)) return false
    if (document.uploadedAt >= cutoff) return false

    // Never touch anything still under review or already approved.
    if (document.application?.status === 'rejected') return true
    if (document.application) return false

    // A profile document the office returned and the student never fixed.
    return document.status === 'rejected'
  })

  console.log(`\nRetention: ${MONTHS} month(s); cutoff ${cutoff.toISOString().slice(0, 10)}`)
  console.log(`${candidates.length} document(s) held; ${removable.length} eligible for removal`)
  console.log(`${protectedStudents.size} student(s) exempt (holding a confirmed grant)\n`)

  for (const document of removable) {
    const reason = document.application
      ? `application ${document.application.referenceNo} was declined`
      : 'returned by the office and never replaced'
    console.log(`  - ${document.id}  ${document.title}  (${reason})`)
  }

  if (removable.length === 0) {
    console.log('\nNothing to do.')
    return
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to delete these records and their files.')
    return
  }

  for (const document of removable) {
    // The row first: an orphaned file is recoverable, a row pointing at a
    // missing file is a broken link for whoever opens it next.
    await prisma.studentDocument.delete({ where: { id: document.id } })
    await deleteUpload(document.storedName)
  }

  console.log(`\nRemoved ${removable.length} document(s).`)
}

main()
  .catch((cause: unknown) => {
    console.error('Retention run failed:', cause instanceof Error ? cause.message : cause)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
