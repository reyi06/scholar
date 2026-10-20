/**
 * Document rules, shared by the browser and the API server.
 *
 * Everything here works on plain strings and numbers rather than `File` or
 * `fs`, so the client (which has a `File`) and the server (which has a file
 * name and a content type) run the *same* classifier. That matters: the
 * suggestion a student sees is the one the server would have made, so
 * correcting it is a genuine choice rather than a disagreement between two
 * implementations.
 */

import type { DocumentClassification } from '../types/index.ts'

/** Accepted upload types: a PDF, or a photograph of a paper document. */
export const ACCEPTED_DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const

/** Human-readable form, for error messages and the file picker. */
export const ACCEPTED_DOCUMENT_LABEL = 'PDF, JPEG or PNG'

/**
 * 5 MB. Generous for a scanned certificate, and small enough that the API can
 * buffer an upload in memory rather than streaming it to disk.
 */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
export const MAX_DOCUMENT_MB = 5

/** The `accept` attribute for a file input. */
export const DOCUMENT_ACCEPT_ATTRIBUTE = ACCEPTED_DOCUMENT_TYPES.join(',')

/**
 * A stored file's extension, derived from the content type rather than from
 * the uploaded name.
 *
 * The name is attacker-controlled and the extension is part of a path on disk,
 * so `.php`, `.svg` or `../` must never reach the filesystem. Recognised types
 * map to a fixed extension; anything else is refused by validation before it
 * gets here.
 */
const EXTENSION_BY_TYPE: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
}

export function documentExtension(mimeType: string): string | null {
  return EXTENSION_BY_TYPE[mimeType] ?? null
}

/** Whether a content type is one we store. */
export function isAcceptedDocumentType(mimeType: string): boolean {
  return (ACCEPTED_DOCUMENT_TYPES as readonly string[]).includes(mimeType)
}

/**
 * Keywords that suggest a category, in priority order.
 *
 * Ordered rather than scored: the first match wins, so
 * `certificate-of-indigency.pdf` files under indigency instead of matching the
 * word "certificate" in two categories. The guesses are deliberately
 * conservative — a wrong guess the student has to correct is worse than no
 * guess, so `other` is a perfectly good answer.
 *
 * Patterns are lowercase because the haystack is lowercased before matching.
 */
const CLASSIFICATION_KEYWORDS: [RegExp, DocumentClassification][] = [
  [/indigen|case\s*study|\bitr\b|income|financial|pay\s*slip|payslip|tax/, 'indigency'],
  [/grade|transcript|\btor\b|\bgwa\b|report\s*card|academic\s*record|rating/, 'grades'],
  [/enrol|\bcor\b|\bcoe\b|registration\s*form|assessment\s*form/, 'enrollment'],
  [/residen|barangay\s*(clearance|cert)/, 'residency'],
  [/good\s*moral|\bmoral\b|character/, 'good-moral'],
  [/\bid\b|identif|umid|passport|driver|student\s*id/, 'identification'],
]

/**
 * Suggest where a file should be filed, from its name and content type.
 *
 * The extension is stripped from the name first so that `.pdf` and `.png`
 * cannot match a keyword, and the content type is added to the haystack
 * because it is the one part of the input the uploader does not type.
 */
export function classifyDocument(fileName: string, mimeType = ''): DocumentClassification {
  const stem = fileName.replace(/\.[^./\\]+$/, '')

  // File names use underscores, dots and dashes at least as often as spaces
  // ("barangay-clearance.jpg", "cert_of_enrolment.pdf"). Normalising them means
  // one keyword pattern has to cover every separator a student might use —
  // without this, a hyphenated residency certificate classified as "other".
  const normalised = stem.replace(/[._-]+/g, ' ')

  const haystack = `${normalised} ${mimeType}`.toLowerCase()
  for (const [pattern, classification] of CLASSIFICATION_KEYWORDS) {
    if (pattern.test(haystack)) return classification
  }
  return 'other'
}

/**
 * A human title guessed from the file name: `cert_of_enrolment-2026.pdf`
 * becomes `Cert of enrolment 2026`. Used to pre-fill the title field, which
 * the student is free to overwrite.
 */
export function suggestDocumentTitle(fileName: string): string {
  const stem = fileName.replace(/\.[^./\\]+$/, '').replace(/[_-]+/g, ' ').trim()
  if (!stem) return 'Untitled document'
  return stem.charAt(0).toUpperCase() + stem.slice(1)
}

/** Shape needed to validate an upload, whether it is a `File` or a server part. */
export interface DocumentFileLike {
  name: string
  type: string
  size: number
}

/**
 * Check an upload before it is stored or sent. Returns a message to show the
 * student, or `null` when the file is acceptable.
 *
 * Both layers call this: the browser so the student is told immediately, and
 * the server because a request can always be crafted by hand.
 */
export function validateDocumentFile(file: DocumentFileLike): string | null {
  if (!file.name.trim()) return 'Choose a file to upload.'
  if (!isAcceptedDocumentType(file.type)) {
    return `Upload a ${ACCEPTED_DOCUMENT_LABEL} file.`
  }
  if (file.size === 0) return 'That file is empty.'
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `That file is larger than ${MAX_DOCUMENT_MB} MB.`
  }
  return null
}
