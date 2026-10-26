import { describe, expect, it } from 'vitest'
import { toCsv } from '../src/lib/csv.ts'

/**
 * CSV output is opened in Excel by the scholarship office, so quoting and
 * formula injection are both security-relevant, not formatting details.
 */
describe('toCsv', () => {
  it('quotes cells containing commas or quotes', () => {
    expect(toCsv(['Name'], [['Santos, Maria']])).toBe('Name\r\n"Santos, Maria"')
    expect(toCsv(['Note'], [['He said "hi"']])).toBe('Note\r\n"He said ""hi"""')
  })

  it('neutralises spreadsheet formulas', () => {
    const lines = toCsv(['Value'], [['=1+1'], ['+1'], ['-1'], ['@SUM(A1)']]).split('\r\n')
    expect(lines.slice(1)).toEqual(["'=1+1", "'+1", "'-1", "'@SUM(A1)"])
  })

  it('leaves ordinary text and numbers alone', () => {
    expect(toCsv(['A', 'B'], [['Maria', 9500]])).toBe('A,B\r\nMaria,9500')
  })
})
