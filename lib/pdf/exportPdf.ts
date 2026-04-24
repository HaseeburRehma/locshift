/**
 * PDF export helpers for the Reports page.
 *
 * Uses jsPDF + jspdf-autotable (client-side, no server round-trip).
 * All public functions here are safe to call from 'use client' components
 * — the libraries touch the DOM, so do NOT import from a server component.
 *
 * Related change requests (Rheinmaasrail):
 *   #4 — Fix PDF export in time tracking (previously a toast stub)
 *   #5 — Employees can export their own time records
 *   #6 — Admin can export a single employee's time tracking
 */

'use client'

import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import { format } from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PdfTableOptions {
  /** Main heading on the PDF (e.g. "Arbeitszeitbericht"). */
  title: string
  /** Optional subheading (e.g. "Max Mustermann · April 2026"). */
  subtitle?: string
  /** Column headers, left-to-right. */
  headers: string[]
  /** Table body rows. Cell values are stringified automatically. */
  rows: RowInput[]
  /** Optional totals row rendered in the footer. */
  totalsRow?: RowInput
  /** Base filename (without extension). A date stamp is appended. */
  filename: string
  /** 'portrait' (default) or 'landscape'. Landscape is better for wide tables. */
  orientation?: 'portrait' | 'landscape'
  /** Locale for the "Generated on" line. Defaults to 'de'. */
  locale?: 'de' | 'en'
}

// ─── Generic renderer ───────────────────────────────────────────────────────

/**
 * Render a titled, autoTable-formatted PDF and trigger a browser download.
 * This is the single entry point used by all report exporters below.
 */
export function exportTableToPdf(opts: PdfTableOptions): void {
  const {
    title,
    subtitle,
    headers,
    rows,
    totalsRow,
    filename,
    orientation = 'portrait',
    locale = 'de',
  } = opts

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const marginX = 14

  // Header block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42) // slate-900
  doc.text(title, marginX, 18)

  let cursorY = 25
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(71, 85, 105) // slate-600
    doc.text(subtitle, marginX, cursorY)
    cursorY += 6
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184) // slate-400
  const generatedLabel = locale === 'de' ? 'Erstellt am' : 'Generated'
  const entryLabel =
    locale === 'de'
      ? `${rows.length} Einträge`
      : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`
  doc.text(
    `${generatedLabel}: ${format(new Date(), 'dd.MM.yyyy HH:mm')}  ·  ${entryLabel}`,
    marginX,
    cursorY,
  )
  cursorY += 4

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    foot: totalsRow ? [totalsRow] : undefined,
    startY: cursorY + 4,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59], // slate-800
      lineColor: [226, 232, 240], // slate-200
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 100, 224], // #0064E0 — LokShift brand
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 9,
    },
    margin: { left: marginX, right: marginX },
  })

  const stamp = format(new Date(), 'yyyy-MM-dd')
  doc.save(`${filename}_${stamp}.pdf`)
}

// ─── Convenience wrappers (one per report type) ─────────────────────────────
//
// These mirror the shapes used in app/dashboard/reports/page.tsx and keep
// that file tidy. Each one pre-formats rows/headers in the active locale.

type TimeEntryRowLike = {
  date: string
  employee?: { full_name: string | null } | null
  start_time: string | null
  end_time: string | null
  break_minutes: number | null
  net_hours: number | null
  customer?: { name: string | null } | null
  is_verified: boolean
  notes?: string | null
  // Phase 2 #11 — optional Spesen + overnight stay
  meal_allowance?: number | null
  overnight_stay?: boolean | null
  // Phase 2 #3 — optional planned flag
  is_planned?: boolean | null
  // Phase 3 #1 + #10 — joined Betriebsstellen + Gastfahrt
  start_location?: { name: string | null; short_code?: string | null } | null
  destination_location?: { name: string | null; short_code?: string | null } | null
  is_gastfahrt?: boolean | null
}

/** Working-time report — used by admin, dispatcher, and employee exports. */
export function exportWorkingTimePdf(
  entries: TimeEntryRowLike[],
  args: {
    title: string
    subtitle?: string
    filename: string
    /** If true, include an "Employee" column. Hide for single-employee exports. */
    showEmployee: boolean
    locale?: 'de' | 'en'
    /** When true, include Spesen + Übernachtung columns (Phase 2 #11). */
    includeSpesen?: boolean
    /** When true, include Start/Destination + Gastfahrt columns (Phase 3 #1 + #10). */
    includeBetriebsstellen?: boolean
  },
): void {
  const {
    title, subtitle, filename, showEmployee,
    locale = 'de', includeSpesen = true, includeBetriebsstellen = true,
  } = args

  const headers = locale === 'de'
    ? [
        'Datum',
        ...(showEmployee ? ['Mitarbeiter'] : []),
        'Start', 'Ende', 'Pause (min)', 'Std.', 'Kunde',
        ...(includeBetriebsstellen ? ['Startort', 'Zielort', 'Gastfahrt'] : []),
        ...(includeSpesen ? ['Übern.', 'Spesen €'] : []),
        'Status',
      ]
    : [
        'Date',
        ...(showEmployee ? ['Employee'] : []),
        'Start', 'End', 'Break (min)', 'Hrs.', 'Customer',
        ...(includeBetriebsstellen ? ['From', 'To', 'Passenger'] : []),
        ...(includeSpesen ? ['Overn.', 'Allow. €'] : []),
        'Status',
      ]

  // Short "Name (CODE)" rendering for Betriebsstellen — keeps rows compact
  // in landscape and still informative for reviewers.
  const formatLoc = (loc?: { name: string | null; short_code?: string | null } | null): string => {
    if (!loc?.name) return '-'
    return loc.short_code ? `${loc.name} (${loc.short_code})` : loc.name
  }

  const rows: RowInput[] = entries.map(e => {
    const row: (string | number)[] = [safeDate(e.date)]
    if (showEmployee) row.push(e.employee?.full_name ?? '-')
    row.push(
      safeTime(e.start_time),
      safeTime(e.end_time),
      String(e.break_minutes ?? 0),
      (e.net_hours ?? 0).toFixed(2),
      e.customer?.name ?? '-',
    )
    if (includeBetriebsstellen) {
      row.push(formatLoc(e.start_location))
      row.push(formatLoc(e.destination_location))
      row.push(e.is_gastfahrt ? (locale === 'de' ? 'Ja' : 'Yes') : '-')
    }
    if (includeSpesen) {
      row.push(e.overnight_stay ? (locale === 'de' ? 'Ja' : 'Yes') : '-')
      row.push((e.meal_allowance ?? 0).toFixed(2))
    }
    // Status: Planned takes priority over Pending/Approved so the reader
    // can immediately see which rows represent forecast vs actuals.
    const status = e.is_planned
      ? (locale === 'de' ? 'Geplant' : 'Planned')
      : e.is_verified
        ? (locale === 'de' ? 'Genehmigt' : 'Approved')
        : (locale === 'de' ? 'Ausstehend' : 'Pending')
    row.push(status)
    return row
  })

  const totalHours = entries.reduce((s, e) => s + (e.net_hours ?? 0), 0)
  const totalBreak = entries.reduce((s, e) => s + (e.break_minutes ?? 0), 0)
  const totalSpesen = entries.reduce((s, e) => s + (e.meal_allowance ?? 0), 0)
  const sumLabel = locale === 'de' ? 'Summe' : 'Total'

  // Build totals row dynamically so column count always matches headers.
  const totalsRow: RowInput = [sumLabel]
  if (showEmployee) totalsRow.push('')
  totalsRow.push('', '', String(totalBreak), totalHours.toFixed(2), '')
  if (includeBetriebsstellen) {
    totalsRow.push('', '', '')
  }
  if (includeSpesen) {
    totalsRow.push('', totalSpesen.toFixed(2))
  }
  totalsRow.push('')

  exportTableToPdf({
    title, subtitle, filename, headers, rows, totalsRow,
    orientation: 'landscape',
    locale,
  })
}

type TimeAccountRowLike = {
  full_name: string
  target_hours: number
  actual_hours: number
  balance: number
}

export function exportTimeAccountsPdf(
  accounts: TimeAccountRowLike[],
  args: { title: string; subtitle?: string; filename: string; locale?: 'de' | 'en' },
): void {
  const { title, subtitle, filename, locale = 'de' } = args

  const headers = locale === 'de'
    ? ['Mitarbeiter', 'Soll-Stunden', 'Ist-Stunden', 'Saldo', 'Status']
    : ['Employee', 'Target', 'Actual', 'Balance', 'Status']

  const rows: RowInput[] = accounts.map(a => [
    a.full_name,
    a.target_hours.toFixed(2),
    a.actual_hours.toFixed(2),
    a.balance.toFixed(2),
    a.balance >= 0
      ? (locale === 'de' ? 'Positiv' : 'Positive')
      : (locale === 'de' ? 'Defizit' : 'Deficit'),
  ])

  exportTableToPdf({ title, subtitle, filename, headers, rows, locale })
}

type PerDiemRowLike = {
  date: string
  employee_id: string
  country?: string | null
  num_days?: number | null
  rate?: number | null
  amount?: number | null
  status?: string | null
}

export function exportPerDiemPdf(
  perDiems: PerDiemRowLike[],
  args: { title: string; subtitle?: string; filename: string; locale?: 'de' | 'en' },
): void {
  const { title, subtitle, filename, locale = 'de' } = args

  const headers = locale === 'de'
    ? ['Datum', 'Mitarbeiter-ID', 'Land', 'Tage', 'Satz', 'Betrag', 'Status']
    : ['Date', 'Employee ID', 'Country', 'Days', 'Rate', 'Amount', 'Status']

  const rows: RowInput[] = perDiems.map(pd => [
    safeDate(pd.date),
    pd.employee_id,
    pd.country ?? '-',
    String(pd.num_days ?? 0),
    (pd.rate ?? 0).toFixed(2),
    (pd.amount ?? 0).toFixed(2),
    pd.status ?? '-',
  ])

  const totalAmount = perDiems.reduce((s, pd) => s + (pd.amount ?? 0), 0)
  const sumLabel = locale === 'de' ? 'Summe' : 'Total'
  const totalsRow: RowInput = [sumLabel, '', '', '', '', totalAmount.toFixed(2), '']

  exportTableToPdf({ title, subtitle, filename, headers, rows, totalsRow, locale })
}

type HolidayBonusRowLike = {
  created_at: string
  employee_id: string
  amount: number | null
  period_start?: string | null
  period_end?: string | null
  notes?: string | null
}

export function exportHolidayBonusPdf(
  bonuses: HolidayBonusRowLike[],
  args: { title: string; subtitle?: string; filename: string; locale?: 'de' | 'en' },
): void {
  const { title, subtitle, filename, locale = 'de' } = args

  const headers = locale === 'de'
    ? ['Auszahlungsdatum', 'Mitarbeiter-ID', 'Betrag', 'Zeitraum von', 'Zeitraum bis', 'Notizen']
    : ['Paid on', 'Employee ID', 'Amount', 'Period start', 'Period end', 'Notes']

  const rows: RowInput[] = bonuses.map(b => [
    safeDate(b.created_at),
    b.employee_id,
    (b.amount ?? 0).toFixed(2),
    b.period_start ? safeDate(b.period_start) : '-',
    b.period_end ? safeDate(b.period_end) : '-',
    b.notes ?? '-',
  ])

  const totalAmount = bonuses.reduce((s, b) => s + (b.amount ?? 0), 0)
  const sumLabel = locale === 'de' ? 'Summe' : 'Total'
  const totalsRow: RowInput = [sumLabel, '', totalAmount.toFixed(2), '', '', '']

  exportTableToPdf({ title, subtitle, filename, headers, rows, totalsRow, locale })
}

// ─── Internal helpers ───────────────────────────────────────────────────────

function safeDate(value: string | null | undefined): string {
  if (!value) return '-'
  try {
    return format(new Date(value), 'dd.MM.yyyy')
  } catch {
    return value
  }
}

function safeTime(value: string | null | undefined): string {
  if (!value) return '-'
  try {
    return format(new Date(value), 'HH:mm')
  } catch {
    return '-'
  }
}

/**
 * Build a slug for a PDF filename, e.g. "Max Mustermann" → "max-mustermann".
 * Exported so the caller can compose filenames like
 *   `arbeitszeitbericht_${slugify(employee)}`.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'export'
}
