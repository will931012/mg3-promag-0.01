export type SortDirection = 'asc' | 'desc'

export function escapeCsv(value: unknown): string {
  const normalized = String(value ?? '')
  if (!/[",\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadExcelHtml(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  const headHtml = headers.map((header) => `<th>${String(header)}</th>`).join('')
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${String(cell ?? '')}</td>`).join('')}</tr>`)
    .join('')
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="utf-8" />
      </head>
      <body>
        <table>
          <thead><tr>${headHtml}</tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body>
    </html>
  `
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function compareValues(left: unknown, right: unknown) {
  const a = left ?? ''
  const b = right ?? ''
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export function sortRecords<T>(items: T[], selector: (item: T) => unknown, direction: SortDirection): T[] {
  return [...items].sort((left, right) => {
    const result = compareValues(selector(left), selector(right))
    return direction === 'asc' ? result : -result
  })
}
