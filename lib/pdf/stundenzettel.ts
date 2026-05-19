/**
 * Stundenzettel PDF — per-employee monthly timesheet.
 *
 * Mirrors the manual Excel template Rheinmaasrail currently uses
 * ("<Name> <Monat> Stundenzettel.xlsx"). The columns and the summary
 * block at the bottom are deliberately laid out exactly the way they
 * already read on paper, so the client can drop this PDF into their
 * existing workflow without retraining.
 *
 * Columns:
 *   Datum | Wochentag | Start | Ende | Stunden | Spesen € |
 *   Übernachtung | 25% Zuschlag | 40% Zuschlag | Sonntag |
 *   Feiertag | Gastfahrt
 *
 * Summary block (rendered below the table):
 *   Arbeitstage / Gesamtstunden / 25% Nachtarbeit / 40% Nachtarbeit /
 *   Sonntag / Feiertag / Gastfahrt / 14€ Spesen / 28€ Spesen /
 *   Soll-Stunden / Ist-Stunden / Stundenlohn / Besonderheiten
 *
 * The function only depends on jsPDF + jspdf-autotable, which are
 * already installed for the other PDF exports. Pure client-side render.
 */

'use client'

import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import { format } from 'date-fns'
import { calculateShiftTimes } from '@/lib/time/shift-hours'
import {
  calculateZuschlag,
  sumZuschlag,
  type ZuschlagBreakdown,
} from '@/lib/time/zuschlag'

/** Row shape this exporter accepts — matches the joined TimeEntry. */
export interface StundenzettelEntry {
  date: string                    // YYYY-MM-DD
  start_time: string | null       // ISO string
  end_time: string | null         // ISO string
  break_minutes: number | null
  net_hours?: number | null
  overnight_stay?: boolean | null
  meal_allowance?: number | null
  is_gastfahrt?: boolean | null
  notes?: string | null
}

export interface StundenzettelOptions {
  employeeName: string
  /** YYYY-MM, e.g. '2025-10' — used in the header and filename. */
  monthKey: string
  entries: StundenzettelEntry[]
  /** Soll-Stunden for the period (e.g. 176 for a full month). */
  targetHours?: number
  /** Hourly wage shown at the bottom (Stundenlohn). */
  hourlyRate?: number
  /** Free-form notes shown under "Besonderheit". */
  remarks?: string
  /** Override filename base (date stamp appended automatically). */
  filenameBase?: string
}

// Wochentag short labels matching the client template.
const WEEKDAY_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

const MONTH_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function fmtHHMM(iso?: string | null): string {
  if (!iso) return ''
  try {
    return format(new Date(iso), 'HH:mm')
  } catch {
    return ''
  }
}

function fmtDate(date: string): string {
  try {
    return format(new Date(`${date}T00:00:00`), 'dd.MM.yyyy')
  } catch {
    return date
  }
}

function weekdayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`).getDay()
  return WEEKDAY_DE[d] ?? ''
}

function monthHeader(monthKey: string): string {
  // monthKey "2025-10" → "Oktober 2025"
  const [y, m] = monthKey.split('-').map(Number)
  if (!y || !m) return monthKey
  return `${MONTH_DE[m - 1]} ${y}`
}

function slugify(input: string): string {
  // Strip combining diacritical marks (Unicode block U+0300–U+036F).
  // Using \u escapes (not the raw characters) keeps the regex stable
  // regardless of how the source file is saved/transferred.
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'export'
}

/**
 * Render and trigger download of the per-employee Stundenzettel PDF.
 */
export function exportStundenzettelPdf(opts: StundenzettelOptions): void {
  const {
    employeeName,
    monthKey,
    entries,
    targetHours,
    hourlyRate,
    remarks,
    filenameBase,
  } = opts

  // Sort entries by date ascending so the table reads chronologically
  // like the manual sheet.
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Per-row enrichment: compute net hours, Zuschlag breakdown
  const enriched = sorted.map((e) => {
    const start = fmtHHMM(e.start_time)
    const end = fmtHHMM(e.end_time)
    const shift = calculateShiftTimes(e.date, start, end, e.break_minutes ?? 0)
    const zuschlag = calculateZuschlag(
      e.date, start, end, e.break_minutes ?? 0, !!e.is_gastfahrt,
    )
    return {
      entry: e,
      start,
      end,
      hours: e.net_hours ?? shift.netHours,
      isOvernight: shift.isOvernight,
      zuschlag,
    }
  })

  const totals: ZuschlagBreakdown = sumZuschlag(enriched.map((r) => r.zuschlag))
  const totalHours = enriched.reduce((s, r) => s + (r.hours || 0), 0)
  const workingDays = enriched.filter((r) => (r.hours || 0) > 0).length
  const overnightCount = enriched.filter((r) => !!r.entry.overnight_stay).length
  const noOvernightWorkingDays = workingDays - overnightCount

  // ─── Build PDF ────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const marginX = 12

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text('Stundenzettel', marginX, 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text(`Mitarbeiter: ${employeeName}`, marginX, 21)
  doc.text(`Monat: ${monthHeader(monthKey)}`, marginX + 100, 21)

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, marginX, 27)

  // ─── Main table (mirrors the client's column order) ─────────────────
  const headers = [
    'Datum',
    'Wochentag',
    'Start',
    'Ende',
    'Std.',
    'Spesen €',
    'Übern.',
    '25% Zuschlag',
    '40% Zuschlag',
    'Sonntag',
    'Feiertag',
    'Gastfahrt',
  ]

  const rows: RowInput[] = enriched.map((r) => [
    fmtDate(r.entry.date),
    weekdayOf(r.entry.date),
    r.start || '-',
    r.end ? (r.isOvernight ? `${r.end} (+1)` : r.end) : '-',
    r.hours.toFixed(2),
    (r.entry.meal_allowance ?? 0).toFixed(2),
    r.entry.overnight_stay ? 'Ja' : 'Nein',
    r.zuschlag.night25 > 0 ? r.zuschlag.night25.toFixed(2) : '-',
    r.zuschlag.night40 > 0 ? r.zuschlag.night40.toFixed(2) : '-',
    r.zuschlag.sunday > 0 ? r.zuschlag.sunday.toFixed(2) : '-',
    r.zuschlag.holiday > 0 ? r.zuschlag.holiday.toFixed(2) : '-',
    r.zuschlag.gastfahrt > 0 ? r.zuschlag.gastfahrt.toFixed(2) : '-',
  ])

  // Totals row matching the bottom Σ row of the Excel
  const totalsRow: RowInput = [
    'Σ', '', '', '',
    totalHours.toFixed(2),
    enriched.reduce((s, r) => s + (r.entry.meal_allowance ?? 0), 0).toFixed(2),
    `${overnightCount}× Ja`,
    totals.night25.toFixed(2),
    totals.night40.toFixed(2),
    totals.sunday.toFixed(2),
    totals.holiday.toFixed(2),
    totals.gastfahrt.toFixed(2),
  ]

  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: rows,
    foot: [totalsRow],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [0, 100, 224],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    bodyStyles: { halign: 'center' },
    columnStyles: {
      0: { halign: 'left' },
      1: { halign: 'left' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'center',
    },
    margin: { left: marginX, right: marginX },
  })

  // ─── Summary block (mirrors B36:C47 of the Excel template) ─────────
  // jspdf-autotable mutates `doc` to track the last Y position.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterTableY = ((doc as any).lastAutoTable?.finalY ?? 100) + 8

  const sollHours = targetHours ?? 0
  const summaryRows: RowInput[] = [
    ['Arbeitstage:',         String(workingDays)],
    ['Gesamtstunden:',       totalHours.toFixed(2)],
    ['25% Nachtarbeit:',     totals.night25.toFixed(2)],
    ['40% Nachtarbeit:',     totals.night40.toFixed(2)],
    ['Sonntag:',             totals.sunday.toFixed(2)],
    ['Feiertag:',            totals.holiday.toFixed(2)],
    ['Gastfahrt:',           totals.gastfahrt.toFixed(2)],
    ['Spesen 14 € (Tage):',  String(noOvernightWorkingDays)],
    ['Spesen 28 € (Tage):',  String(overnightCount)],
    ['Soll:',                sollHours ? `${sollHours} Std.` : '-'],
    ['Ist:',                 `${totalHours.toFixed(2)} Std.`],
    [
      'Differenz:',
      sollHours
        ? `${(totalHours - sollHours).toFixed(2)} Std.`
        : '-',
    ],
    ['Stundenlohn:',         hourlyRate ? `${hourlyRate.toFixed(2)} €` : '-'],
    ['Besonderheit:',        remarks ?? '-'],
  ]

  autoTable(doc, {
    startY: afterTableY,
    body: summaryRows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 1.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: [71, 85, 105] },
      1: { fontStyle: 'bold', textColor: [15, 23, 42] },
    },
    margin: { left: marginX, right: marginX },
  })

  // ─── Footer signature lines ─────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = ((doc as any).lastAutoTable?.finalY ?? afterTableY) + 14
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('______________________', marginX, finalY)
  doc.text('______________________', marginX + 120, finalY)
  doc.setFontSize(8)
  doc.text('Unterschrift Mitarbeiter', marginX, finalY + 5)
  doc.text('Unterschrift Disposition', marginX + 120, finalY + 5)

  // ─── Save ──────────────────────────────────────────────────────────
  const stamp = format(new Date(), 'yyyy-MM-dd')
  const base = filenameBase ?? `Stundenzettel_${slugify(employeeName)}_${monthKey}`
  doc.save(`${base}_${stamp}.pdf`)
}
