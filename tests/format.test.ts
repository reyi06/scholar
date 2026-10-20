import { describe, expect, it } from 'vitest'
import { formatCurrency, formatFileSize, initials, truncate } from '../src/lib/format.ts'

describe('formatFileSize', () => {
  it('handles the small end without dividing', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('uses one decimal below ten units and whole numbers above', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
    expect(formatFileSize(20 * 1024 * 1024)).toBe('20 MB')
  })

  it('renders a dash for missing values rather than NaN', () => {
    expect(formatFileSize(null)).toBe('—')
    expect(formatFileSize(undefined)).toBe('—')
    expect(formatFileSize(-1)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats pesos without centavos', () => {
    expect(formatCurrency(15000)).toContain('15,000')
    expect(formatCurrency(0)).toContain('0')
  })

  it('renders a dash for missing values', () => {
    expect(formatCurrency(null)).toBe('—')
  })
})

describe('truncate', () => {
  it('leaves short text alone', () => {
    expect(truncate('Short notice', 50)).toBe('Short notice')
  })

  it('cuts at a word boundary and adds one ellipsis', () => {
    const text = 'Several scholarship listings are currently accepting applications.'
    const result = truncate(text, 30)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain('..')
    expect(result.length).toBeLessThanOrEqual(31)
  })
})

describe('initials', () => {
  it('takes the first letter of each name', () => {
    expect(initials('Maria', 'Santos')).toBe('MS')
  })

  it('does not produce an empty avatar', () => {
    expect(initials('', '')).toBe('?')
  })
})
