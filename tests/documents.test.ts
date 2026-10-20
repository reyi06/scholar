import { describe, expect, it } from 'vitest'
import {
  classifyDocument,
  documentExtension,
  suggestDocumentTitle,
  validateDocumentFile,
} from '../src/lib/documents.ts'

/**
 * Document rules.
 *
 * Classification is shared by the browser and the server, so these assertions
 * are what stop the two from drifting: the suggestion a student sees is the one
 * the server would have made.
 */
describe('classifyDocument', () => {
  it('files an indigency certificate as indigency, not as a generic certificate', () => {
    expect(classifyDocument('certificate-of-indigency.pdf')).toBe('indigency')
  })

  it('recognises a transcript', () => {
    expect(classifyDocument('my-transcript-2026.pdf')).toBe('grades')
    expect(classifyDocument('report_card.png')).toBe('grades')
  })

  it('recognises enrolment documents', () => {
    expect(classifyDocument('certificate-of-enrolment.pdf')).toBe('enrollment')
    expect(classifyDocument('registration-form.pdf')).toBe('enrollment')
  })

  it('recognises residency and good moral character', () => {
    expect(classifyDocument('barangay-clearance.jpg')).toBe('residency')
    expect(classifyDocument('good-moral-certificate.pdf')).toBe('good-moral')
  })

  it('does not match keywords inside the file extension', () => {
    // "id" appears in ".pdf" only if the extension were not stripped first.
    expect(classifyDocument('notes.pdf')).toBe('other')
  })

  it('falls back to other rather than guessing wrong', () => {
    expect(classifyDocument('scan-0001.pdf')).toBe('other')
  })

  it('uses the content type when the name says nothing', () => {
    expect(classifyDocument('file', 'image/jpeg')).toBe('other')
  })
})

describe('validateDocumentFile', () => {
  const pdf = (size: number) => ({ name: 'certificate.pdf', type: 'application/pdf', size })

  it('accepts a PDF within the limit', () => {
    expect(validateDocumentFile(pdf(2048))).toBeNull()
  })

  it('refuses an unsupported type', () => {
    expect(
      validateDocumentFile({ name: 'notes.txt', type: 'text/plain', size: 100 }),
    ).toMatch(/PDF, JPEG or PNG/)
  })

  it('refuses an oversized file', () => {
    expect(validateDocumentFile(pdf(6 * 1024 * 1024))).toMatch(/larger than 5 MB/)
  })

  it('refuses an empty file', () => {
    expect(validateDocumentFile(pdf(0))).toMatch(/empty/)
  })

  it('refuses a missing name', () => {
    expect(validateDocumentFile({ name: '  ', type: 'application/pdf', size: 10 })).toMatch(
      /Choose a file/,
    )
  })
})

describe('documentExtension', () => {
  it('derives an extension from the content type, never the file name', () => {
    expect(documentExtension('application/pdf')).toBe('.pdf')
    expect(documentExtension('image/jpeg')).toBe('.jpg')
    expect(documentExtension('image/png')).toBe('.png')
    expect(documentExtension('text/html')).toBeNull()
  })
})

describe('suggestDocumentTitle', () => {
  it('turns separators into spaces and capitalises', () => {
    expect(suggestDocumentTitle('cert_of_enrolment-2026.pdf')).toBe('Cert of enrolment 2026')
  })

  it('survives a name with no stem', () => {
    expect(suggestDocumentTitle('.pdf')).toBe('Untitled document')
  })
})
