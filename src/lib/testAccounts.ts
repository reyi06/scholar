import type { Role } from '../types/index.ts'

/**
 * Seeded sign-in credentials, shown on the login screen so the prototype can be
 * explored.
 *
 * DEMO ONLY. These live in the client bundle, which means anyone can read them —
 * the same is true of any credentials a demo login screen hands out. Delete this
 * file, the buttons it feeds, and the seeded accounts before a real deployment.
 */
export interface TestAccount {
  role: Role
  label: string
  email: string
  password: string
}

export const TEST_ACCOUNTS: TestAccount[] = [
  { role: 'student', label: 'Student', email: 'maria.santos@example.com', password: 'student123' },
  { role: 'admin', label: 'Administrator', email: 'admin@example.com', password: 'admin123' },
]
