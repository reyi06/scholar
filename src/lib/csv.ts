/**
 * Minimal CSV serialisation + download helper.
 *
 * Used by the administrator reports screen. No third-party dependency is
 * needed for this, and adding one would work against the "avoid unnecessary
 * dependencies" requirement.
 */

/** Escape a single CSV cell per RFC 4180. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = String(value)

  // Spreadsheet formula injection: Excel and LibreOffice execute a cell that
  // begins with =, +, -, @, a tab or a carriage return. A student's name is
  // enough to reach this path. The apostrophe forces text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  rows.forEach((row) => {
    lines.push(row.map(escapeCell).join(','))
  })
  return lines.join('\r\n')
}

/**
 * Trigger a browser download of `csv`.
 * Uses a Blob + object URL, so nothing leaves the machine.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Convenience: build and download in one call. */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
): void {
  downloadCsv(filename, toCsv(headers, rows))
}

/** Filename-safe timestamp, e.g. `2026-10-17-1432`. */
export function timestampSlug(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`
}
