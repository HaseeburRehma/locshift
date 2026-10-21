'use client'

/**
 * Monatsnachweis PDF (Kundenfeedback Punkt 5) — rendered from the same
 * MonthlyReport model as the screen and the Excel export.
 *
 * Landscape A4, header row repeated on every page, one row per shift and
 * one row per calendar day without work, hours and euro amounts in
 * separate blocks, legend for decimal hours.
 */

import { jsPDF } from 'jspdf'
import autoTable, { type CellInput, type RowInput } from 'jspdf-autotable'
import type { MonthlyReport, MonthlyReportRow } from '@/lib/reports/monthly-report'
import { formatDateDE, formatEuro, formatHours, formatHoursLong, formatSignedHours } from '@/lib/time/format'
import { shiftIssueLabel } from '@/lib/time/shift-hours'
import { DEFAULT_STATE } from '@/lib/time/holidays'

const BLUE: [number, number, number] = [0, 100, 224]
const SLATE: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [100, 116, 139]

/** Helvetica in jsPDF only covers WinAnsi — map the few glyphs it lacks. */
export function pdfText(s: string): string {
  return s.replace(/−/g, '-').replace(/→/g, '->').replace(/ /g, ' ')
}

function h(n: number): string {
  return n ? formatHours(n, 'de') : ''
}

function statusText(r: MonthlyReportRow): string {
  const parts: string[] = []
  if (r.status === 'running') parts.push('läuft')
  else if (r.status === 'draft') parts.push('nicht abgesendet')
  else if (r.status === 'submitted') parts.push('nicht freigegeben')
  if (r.issues.length) parts.push(r.issues.map((i) => shiftIssueLabel(i, 'de')).join(', '))
  if (r.corrected) parts.push('korrigiert')
  if (r.enteredOnBehalf) parts.push('stellv. erfasst')
  if (r.route) parts.push(r.route)
  if (r.notes) parts.push(r.notes.length > 60 ? `${r.notes.slice(0, 57)}...` : r.notes)
  return pdfText(parts.join(' · '))
}

export function monatsnachweisFilename(report: MonthlyReport, ext: 'pdf' | 'xlsx'): string {
  const slug = report.employee.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `Monatsnachweis_${slug || 'mitarbeiter'}_${report.month}.${ext}`
}

export function buildMonatsnachweisPdf(report: MonthlyReport): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const t = report.totals
  const marginX = 10
  const created = new Date(report.createdAt)
  const createdDate = `${String(created.getDate()).padStart(2, '0')}.${String(created.getMonth() + 1).padStart(2, '0')}.${created.getFullYear()}`
  const createdTime = `${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...SLATE)
  doc.text('Monatsnachweis', marginX, 14)
  doc.setFontSize(12)
  doc.setTextColor(...BLUE)
  doc.text(pdfText(report.monthLabel), marginX, 21)

  const sollLabel =
    t.targetHours == null
      ? 'nicht hinterlegt'
      : `${formatHours(t.targetHours, 'de')} Std. (${t.weekdays - t.absenceWeekdays} Tage x ${formatHours(t.dailyTargetHours, 'de')} Std.)`
  const headerRows: [string, string][] = [
    ['Mitarbeiter', report.employee.name],
    ['Monat', report.monthLabel],
    ['Sollstunden', sollLabel],
    ['Freigabestatus', report.approval.label + (report.hasCorrections ? ' · enthält Korrekturen' : '')],
    ['Erstellt am', `${createdDate}, ${createdTime} Uhr`],
  ]
  doc.setFontSize(8.5)
  headerRows.forEach(([k, v], i) => {
    const y = 9 + i * 4.6
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MUTED)
    doc.text(`${k}:`, 175, y)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...SLATE)
    doc.text(pdfText(v), 202, y)
  })

  // ── Daily table ──────────────────────────────────────────────────────
  const head: RowInput[] = [[
    'Datum', 'Tag', 'Beginn', 'Ende', 'Pause\n(Min.)', 'Arbeitszeit\n(Std.)', 'Gastfahrt\n(Std.)',
    'Spesen\n(€)', 'Über-\nnachtung', '25 %\n(Std.)', '40 %\n(Std.)', 'Sonntag\n(Std.)', 'Feiertag\n(Std.)', 'Status / Bemerkung',
  ]]

  const body: RowInput[] = []
  for (const d of report.days) {
    const dateCell = formatDateDE(d.date)
    if (d.rows.length === 0) {
      const remark = d.absence?.label ?? d.holidayName ?? (d.isWeekend ? '' : '')
      const fill: [number, number, number] | undefined = d.absence
        ? [239, 246, 255]
        : d.holidayName
          ? [254, 249, 195]
          : d.isWeekend
            ? [248, 250, 252]
            : undefined
      const style = { textColor: MUTED, ...(fill ? { fillColor: fill } : {}) }
      body.push([
        { content: dateCell, styles: style },
        { content: d.weekdayShort, styles: style },
        { content: '', colSpan: 11, styles: style },
        { content: pdfText(remark ? remark : 'kein Einsatz'), styles: { ...style, fontStyle: 'italic' } },
      ])
      continue
    }
    d.rows.forEach((r, idx) => {
      const open = r.status !== 'approved'
      const statusStyle = r.issues.length
        ? { textColor: [185, 28, 28] as [number, number, number], fontStyle: 'bold' as const }
        : open
          ? { textColor: [180, 83, 9] as [number, number, number] }
          : {}
      const remarkPrefix = idx === 0 && (d.holidayName || d.absence) ? `${d.holidayName ?? d.absence?.label} · ` : ''
      const cells: CellInput[] = [
        dateCell,
        d.weekdayShort,
        r.start,
        r.end ? `${r.end}${r.endDayOffset > 0 ? ` (+${r.endDayOffset})` : ''}` : '–',
        String(r.breakMinutes),
        h(r.workHours),
        h(r.gastfahrtHours),
        idx === 0 && d.daySpesen ? formatHours(d.daySpesen, 'de') : '',
        r.overnight ? { content: 'ja', styles: { fontStyle: 'bold', textColor: [21, 128, 61] } } : 'nein',
        h(r.night25),
        h(r.night40),
        h(r.sunday),
        h(r.holiday),
        { content: pdfText(remarkPrefix) + statusText(r), styles: statusStyle },
      ]
      body.push(cells)
    })
  }

  const foot: RowInput[] = [[
    { content: 'Summe', colSpan: 5, styles: { halign: 'left' } },
    formatHours(t.workHours, 'de'),
    formatHours(t.gastfahrtHours, 'de'),
    formatHours(t.spesenFromEntries, 'de'),
    `${t.overnightCount}x ja`,
    formatHours(t.night25, 'de'),
    formatHours(t.night40, 'de'),
    formatHours(t.sunday, 'de'),
    formatHours(t.holiday, 'de'),
    '',
  ]]

  autoTable(doc, {
    startY: 34,
    head,
    body,
    foot,
    theme: 'grid',
    showHead: 'everyPage',
    showFoot: 'lastPage',
    margin: { left: marginX, right: marginX, top: 14, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 7.2, cellPadding: 1.2, textColor: SLATE, lineColor: [226, 232, 240], lineWidth: 0.1, valign: 'middle' },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'center' },
    columnStyles: {
      0: { halign: 'left', cellWidth: 19 },
      1: { cellWidth: 9 },
      2: { cellWidth: 12 },
      3: { cellWidth: 16 },
      4: { cellWidth: 12 },
      5: { cellWidth: 17 },
      6: { cellWidth: 15 },
      7: { cellWidth: 13 },
      8: { cellWidth: 15 },
      9: { cellWidth: 12 },
      10: { cellWidth: 12 },
      11: { cellWidth: 14 },
      12: { cellWidth: 14 },
      13: { halign: 'left' },
    },
  })

  // ── Summary blocks ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = ((doc as any).lastAutoTable?.finalY ?? 120) + 6
  if (y > 150) {
    doc.addPage()
    y = 16
  }

  const hoursRows: RowInput[] = [
    ['Arbeitstage', String(t.workingDays)],
    ['Sollstunden', t.targetHours == null ? 'nicht hinterlegt' : `${formatHours(t.targetHours, 'de')} Std.`],
    ['Arbeitszeit (ohne Gastfahrt)', `${formatHours(t.workHours, 'de')} Std.`],
    ['Gastfahrt (separat ausgewiesen)', `${formatHours(t.gastfahrtHours, 'de')} Std.`],
    [report.rules.gastfahrtCountsAsWork ? 'Iststunden (Arbeitszeit + Gastfahrt)' : 'Iststunden (nur Arbeitszeit)', `${formatHours(t.actualHours, 'de')} Std.`],
    ['Differenz Ist - Soll', t.differenceHours == null ? '–' : `${pdfText(formatSignedHours(t.differenceHours, 'de'))} Std.`],
    ['Nachtzuschlag 25 %', `${formatHours(t.night25, 'de')} Std.`],
    ['Nachtzuschlag 40 %', `${formatHours(t.night40, 'de')} Std.`],
    ['Sonntagszuschlag', `${formatHours(t.sunday, 'de')} Std.`],
    ['Feiertagszuschlag', `${formatHours(t.holiday, 'de')} Std.`],
    ['Urlaubstage / Krankheitstage', `${t.vacationDays} / ${t.sickDays}`],
  ]

  const euroRows: RowInput[] = [
    ...t.spesen.map((l) => [pdfText(`Spesen: ${l.count} x ${l.label}`), formatEuro(l.amount, 'de')] as RowInput),
    ...(t.perDiemClaims.count ? [[`Spesenanträge (${t.perDiemClaims.count})`, formatEuro(t.perDiemClaims.amount, 'de')] as RowInput] : []),
    [{ content: 'Spesen gesamt', styles: { fontStyle: 'bold' } }, { content: formatEuro(t.spesenTotal, 'de'), styles: { fontStyle: 'bold' } }],
    ...t.specialPayments.map((p) => [pdfText(`${p.title} (${p.periodLabel})${p.note ? ` – ${p.note}` : ''}`), formatEuro(p.amount, 'de')] as RowInput),
    [{ content: 'Sonderzahlungen gesamt', styles: { fontStyle: 'bold' } }, { content: formatEuro(t.specialPaymentsTotal, 'de'), styles: { fontStyle: 'bold' } }],
  ]

  const blockStyles = {
    theme: 'plain' as const,
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.1, textColor: SLATE },
    headStyles: { fontStyle: 'bold' as const, textColor: BLUE, fontSize: 8.5 },
    columnStyles: { 1: { halign: 'right' as const, fontStyle: 'bold' as const } },
  }
  autoTable(doc, { ...blockStyles, startY: y, head: [['Monatssummen – Stunden', '']], body: hoursRows, margin: { left: marginX }, tableWidth: 120 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leftEnd = (doc as any).lastAutoTable?.finalY ?? y
  autoTable(doc, { ...blockStyles, startY: y, head: [['Beträge in Euro', '']], body: euroRows, margin: { left: 145 }, tableWidth: 142 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rightEnd = (doc as any).lastAutoTable?.finalY ?? y
  y = Math.max(leftEnd, rightEnd) + 5

  // ── Legend + warnings ────────────────────────────────────────────────
  const rules = report.rules
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const legend = [
    `Dezimalstunden: 7,50 Std. = ${formatHoursLong(7.5, 'de')}.`,
    `Nachtzuschlag 25 %: ${hhmm(rules.night25From)}–${hhmm(rules.night25To)} Uhr, 40 %: ${hhmm(rules.night40From)}–${hhmm(rules.night40To)} Uhr. Sonn-/Feiertag: nur die Stunden, die auf den Tag fallen (Feiertage ${rules.holidayState ?? DEFAULT_STATE}; ${rules.excludedHolidayNames.join(', ')} separat vergütet).`,
    'Eine Schicht zählt zum Tag ihres Beginns. Spesen werden je Kalendertag einmal berücksichtigt. Gastfahrt wird separat ausgewiesen und nicht doppelt gezählt.',
    t.openEntries ? `${t.openEntries} Eintrag/Einträge noch nicht freigegeben (in der Spalte Status markiert).` : 'Alle Einträge sind freigegeben.',
    ...report.warnings,
  ]
  if (y > 175) {
    doc.addPage()
    y = 16
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  for (const line of legend) {
    const wrapped = doc.splitTextToSize(pdfText(line), 277) as string[]
    doc.text(wrapped, marginX, y)
    y += wrapped.length * 3.4
  }

  // ── Signatures ───────────────────────────────────────────────────────
  y += 10
  if (y > 195) {
    doc.addPage()
    y = 30
  }
  doc.setDrawColor(148, 163, 184)
  doc.line(marginX, y, marginX + 70, y)
  doc.line(marginX + 110, y, marginX + 180, y)
  doc.setFontSize(7.5)
  doc.text('Datum, Unterschrift Mitarbeiter', marginX, y + 4)
  doc.text('Datum, Unterschrift Disposition', marginX + 110, y + 4)

  // ── Footer on every page ─────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(pdfText(`LokShift · Monatsnachweis ${report.employee.name} · ${report.monthLabel}`), marginX, 204)
    doc.text(`Seite ${i} von ${pages}`, 287, 204, { align: 'right' })
  }

  return doc
}

export function downloadMonatsnachweisPdf(report: MonthlyReport): void {
  buildMonatsnachweisPdf(report).save(monatsnachweisFilename(report, 'pdf'))
}
