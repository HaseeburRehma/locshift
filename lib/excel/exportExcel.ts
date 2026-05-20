/**
 * Lightweight Excel export.
 *
 * We generate Excel's "XML Spreadsheet 2003" / HTML-table dialect which
 * Excel and LibreOffice both open natively as a workbook. This avoids
 * pulling in SheetJS (~600KB) for what is effectively tabular data with no
 * formulas or styling needs.
 *
 * If the codebase later needs cell styling, formulas, or multi-sheet
 * workbooks, swap this for `xlsx`/SheetJS — the call sites only depend on
 * `exportTableToExcel(args)`, so a re-implementation is a single file.
 */

import { toast } from 'sonner'

export interface ExcelTable {
  /** Sheet name. Excel limits this to 31 chars. */
  sheetName?: string
  headers: string[]
  /** Each row aligns 1:1 with `headers`. Pass strings/numbers/booleans. */
  rows: Array<Array<string | number | boolean | null | undefined>>
  /** Optional totals row appended at the bottom in bold. */
  totalsRow?: Array<string | number | boolean | null | undefined>
  /** Filename WITHOUT extension. We add `.xls` ourselves. */
  filename: string
}

export function exportTableToExcel(table: ExcelTable): void {
  const { headers, rows, totalsRow, filename, sheetName = 'Export' } = table

  const safeSheet = sheetName.slice(0, 31).replace(/[\\/?*[\]]/g, '_')

  const cellHtml = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  const headerRow = `<tr>${headers.map(h => `<th>${cellHtml(h)}</th>`).join('')}</tr>`
  const bodyRows = rows.map(r => `<tr>${r.map(c => `<td>${cellHtml(c)}</td>`).join('')}</tr>`).join('')
  const totals = totalsRow
    ? `<tr style="font-weight:bold;">${totalsRow.map(c => `<td>${cellHtml(c)}</td>`).join('')}</tr>`
    : ''

  // Minimal HTML — Excel's parser is happy with this and treats it as a
  // single-sheet workbook named `safeSheet`.
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="UTF-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>${cellHtml(safeSheet)}</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
  </head>
  <body>
    <table border="1">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}${totals}</tbody>
    </table>
  </body>
</html>`

  try {
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.xls`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('[Excel] Export failed:', err)
    toast.error('Excel export failed: ' + (err?.message ?? 'unknown'))
  }
}
