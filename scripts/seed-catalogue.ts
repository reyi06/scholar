import { prisma } from '../server/db.ts'
import { stringifyArray, stringifyObject } from '../server/mappers.ts'
import { sampleScholarships } from '../src/data/sampleData.ts'

/**
 * Writes the scholarship catalogue into the database without touching accounts,
 * applications, grants or saved listings.
 *
 * `npm run db:seed` resets every table and is meant for a fresh demo database.
 * This script is the safe one to re-run on a database that already has real
 * people in it: it upserts the fifteen listings by id, so applications that
 * point at them stay intact.
 *
 * Run with: npm run db:catalogue
 */

for (const scholarship of sampleScholarships) {
  const fields = {
    name: scholarship.name,
    provider: scholarship.provider,
    type: scholarship.type,
    municipality: scholarship.municipality,
    educationLevels: stringifyArray(scholarship.educationLevels),
    description: scholarship.description,
    benefits: stringifyArray(scholarship.benefits),
    eligibility: stringifyArray(scholarship.eligibility),
    requirements: stringifyArray(scholarship.requirements),
    deadline: scholarship.deadline,
    applicationMode: scholarship.applicationMode,
    externalUrl: scholarship.externalUrl ?? null,
    contact: stringifyObject(scholarship.contact),
    instructions: stringifyArray(scholarship.instructions),
    status: scholarship.status,
    featured: scholarship.featured,
    tags: stringifyArray(scholarship.tags),
  }

  await prisma.scholarship.upsert({
    where: { id: scholarship.id },
    create: {
      id: scholarship.id,
      ...fields,
      createdAt: new Date(scholarship.createdAt),
      updatedAt: new Date(scholarship.updatedAt),
    },
    update: fields,
  })
}

const total = await prisma.scholarship.count()
console.log(`Upserted ${sampleScholarships.length} listings. ${total} in the table.`)
await prisma.$disconnect()
