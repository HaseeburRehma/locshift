'use client'

/**
 * Excel exports (exceljs) for the Monatsnachweis and the overview reports.
 * Same data model as the PDF/screen; numbers are written as real numbers
 * with formats so the sheet stays calculable. Landscape print layout with
 * repeated header rows (Kundenfeedback Punkt 5, Empfehlung).
 */

import type { Workbook, Worksheet } from 'exceljs'
import type { MonthlyReport } from '@/lib/reports/monthly-report'
import type { MonthOverview, MultiMonthReport, OverviewRow } from '@/lib/reports/overview-report'
import { formatDateDE, formatHoursLong } from '@/lib/time/format'
import { localDateKey, shiftIssueLabel } from '@/lib/time/shift-hours'

const BLUE = 'FF0064E0'
const HOURS = '0.00'
const EURO = '#,##0.00 "€"'

async function newWorkbook(): Promise<Workbook> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LokShift'
  wb.created = new Date()
  return wb
}

async function download(wb: Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function styleHeader(ws: Worksheet, rowNumber: number) {
  const row = ws.getRow(rowNumber)
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  row.height = 30
  row.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } }
    c.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
  })
}

function landscape(ws: Worksheet, headerRow: number) {
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: `${headerRow}:${headerRow}`,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  }
  ws.headerFooter.oddFooter = '&LLokShift&RSeite &P von &N'
  ws.views = [{ state: 'frozen', ySplit: headerRow }]
}

export async function downloadMonatsnachweisXlsx(report: MonthlyReport, filename: string) {
  const wb = await newWorkbook()
  const ws = wb.addWorksheet('Monatsnachweis')
  const t = report.totals

  ws.columns = [
    { key: 'date', width: 12 },
    { key: 'day', width: 6 },
    { key: 'start', width: 8 },
    { key: 'end', width: 10 },
    { key: 'break', width: 8 },
    { key: 'work', width: 11 },
    { key: 'gast', width: 10 },
    { key: 'spesen', width: 10 },
    { key: 'overnight', width: 11 },
    { key: 'n25', width: 8 },
    { key: 'n40', width: 8 },
    { key: 'sun', width: 9 },
    { key: 'hol', width: 9 },
    { key: 'status', width: 48 },
  ]

  ws.addRow(['Monatsnachweis', '', '', '', '', report.monthLabel]).font = { bold: true, size: 14 }
  ws.addRow(['Mitarbeiter', '', report.employee.name])
  ws.addRow([
    'Sollstunden',
    '',
    t.targetHours == null ? 'nicht hinterlegt' : t.targetHours,
    '',
    t.targetHours == null ? '' : `${t.weekdays - t.absenceWeekdays} Tage × ${t.dailyTargetHours} Std.`,
  ])
  ws.addRow(['Freigabestatus', '', report.approval.label + (report.hasCorrections ? ' · enthält Korrekturen' : '')])
  ws.addRow(['Erstellt am', '', new Date(report.createdAt)])
  ws.getCell('C5').numFmt = 'dd.mm.yyyy hh:mm'
  ws.getCell('C3').numFmt = HOURS
  for (let r = 2; r <= 5; r++) ws.getCell(`A${r}`).font = { bold: true, color: { argb: 'FF64748B' } }

  const headerRowNumber = 7
  ws.getRow(headerRowNumber).values = [
    'Datum', 'Tag', 'Beginn', 'Ende', 'Pause (Min.)', 'Arbeitszeit (Std.)', 'Gastfahrt (Std.)', 'Spesen (€)',
    'Übernachtung', '25 % (Std.)', '40 % (Std.)', 'Sonntag (Std.)', 'Feiertag (Std.)', 'Status / Bemerkung',
  ]
  styleHeader(ws, headerRowNumber)

  for (const d of report.days) {
    if (d.rows.length === 0) {
      const row = ws.addRow([formatDateDE(d.date), d.weekdayShort, '', '', '', '', '', '', '', '', '', '', '', d.absence?.label ?? d.holidayName ?? 'kein Einsatz'])
      row.font = { color: { argb: 'FF94A3B8' }, italic: true }
      if (d.absence || d.holidayName || d.isWeekend) {
        row.eachCell({ includeEmpty: true }, (c) => {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: d.absence ? 'FFEFF6FF' : d.holidayName ? 'FFFEF9C3' : 'FFF8FAFC' } }
        })
      }
      continue
    }
    d.rows.forEach((r, idx) => {
      const remarks: string[] = []
      if (idx === 0 && (d.holidayName || d.absence)) remarks.push((d.holidayName ?? d.absence?.label) as string)
      if (r.status === 'running') remarks.push('läuft')
      else if (r.status === 'draft') remarks.push('nicht abgesendet')
      else if (r.status === 'submitted') remarks.push('nicht freigegeben')
      if (r.issues.length) remarks.push(r.issues.map((i) => shiftIssueLabel(i, 'de')).join(', '))
      if (r.corrected) remarks.push('korrigiert')
      if (r.enteredOnBehalf) remarks.push('stellv. erfasst')
      if (r.route) remarks.push(r.route)
      if (r.notes) remarks.push(r.notes)
      const row = ws.addRow([
        formatDateDE(d.date),
        d.weekdayShort,
        r.start,
        r.end ? `${r.end}${r.endDayOffset > 0 ? ` (+${r.endDayOffset})` : ''}` : '–',
        r.breakMinutes,
        r.workHours || null,
        r.gastfahrtHours || null,
        idx === 0 && d.daySpesen ? d.daySpesen : null,
        r.overnight ? 'ja' : 'nein',
        r.night25 || null,
        r.night40 || null,
        r.sunday || null,
        r.holiday || null,
        remarks.join(' · '),
      ])
      for (const col of [6, 7, 10, 11, 12, 13]) row.getCell(col).numFmt = HOURS
      row.getCell(8).numFmt = EURO
      if (r.issues.length) row.getCell(14).font = { bold: true, color: { argb: 'FFB91C1C' } }
      else if (r.status !== 'approved') row.getCell(14).font = { color: { argb: 'FFB45309' } }
    })
  }

  const sumRow = ws.addRow([
    'Summe', '', '', '', '', t.workHours, t.gastfahrtHours, t.spesenFromEntries, `${t.overnightCount}× ja`,
    t.night25, t.night40, t.sunday, t.holiday, '',
  ])
  sumRow.font = { bold: true }
  for (const col of [6, 7, 10, 11, 12, 13]) sumRow.getCell(col).numFmt = HOURS
  sumRow.getCell(8).numFmt = EURO
  sumRow.eachCell({ includeEmpty: true }, (c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
    c.border = { top: { style: 'medium', color: { argb: BLUE } } }
  })

  ws.addRow([])
  const block = (title: string) => {
    const r = ws.addRow([title])
    r.font = { bold: true, color: { argb: BLUE } }
  }
  const line = (label: string, value: number | string | null, fmt?: string) => {
    const r = ws.addRow([label, '', '', '', '', value ?? '–'])
    if (fmt && typeof value === 'number') r.getCell(6).numFmt = fmt
    r.getCell(6).font = { bold: true }
  }

  block('Monatssummen – Stunden')
  line('Arbeitstage', t.workingDays)
  line('Sollstunden', t.targetHours, HOURS)
  line('Arbeitszeit (ohne Gastfahrt)', t.workHours, HOURS)
  line('Gastfahrt (separat ausgewiesen)', t.gastfahrtHours, HOURS)
  line(report.rules.gastfahrtCountsAsWork ? 'Iststunden (Arbeitszeit + Gastfahrt)' : 'Iststunden (nur Arbeitszeit)', t.actualHours, HOURS)
  line('Differenz Ist – Soll', t.differenceHours, HOURS)
  line('Nachtzuschlag 25 %', t.night25, HOURS)
  line('Nachtzuschlag 40 %', t.night40, HOURS)
  line('Sonntagszuschlag', t.sunday, HOURS)
  line('Feiertagszuschlag', t.holiday, HOURS)
  line('Urlaubstage', t.vacationDays)
  line('Krankheitstage', t.sickDays)
  ws.addRow([])
  block('Beträge in Euro')
  for (const l of t.spesen) line(`Spesen: ${l.count} × ${l.label}`, l.amount, EURO)
  if (t.perDiemClaims.count) line(`Spesenanträge (${t.perDiemClaims.count})`, t.perDiemClaims.amount, EURO)
  line('Spesen gesamt', t.spesenTotal, EURO)
  for (const p of t.specialPayments) line(`${p.title} (${p.periodLabel})${p.note ? ` – ${p.note}` : ''}`, p.amount, EURO)
  line('Sonderzahlungen gesamt', t.specialPaymentsTotal, EURO)
  ws.addRow([])
  ws.addRow([`Hinweis: Dezimalstunden – 7,50 Std. = ${formatHoursLong(7.5, 'de')}`]).font = { italic: true, color: { argb: 'FF64748B' } }
  for (const w of report.warnings) ws.addRow([w]).font = { italic: true, color: { argb: 'FFB45309' } }

  landscape(ws, headerRowNumber)
  await download(wb, filename)
}

function overviewSheet(ws: Worksheet, title: string, subtitle: string, rows: OverviewRow[], totalsLabel: string, firstCol: string, totals: OverviewRow, gastfahrtCountsAsWork: boolean) {
  ws.columns = [
    { width: 28 }, { width: 12 }, { width: 13 }, { width: 13 }, { width: 13 }, { width: 13 },
    { width: 11 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 16 },
  ]
  ws.addRow([title]).font = { bold: true, size: 14 }
  ws.addRow([subtitle]).font = { color: { argb: 'FF64748B' } }
  ws.addRow([])
  const headerRowNumber = 4
  ws.getRow(headerRowNumber).values = [
    firstCol, 'Soll (Std.)', 'Arbeitszeit (Std.)', 'Gastfahrt (Std.)', 'Ist (Std.)', 'Differenz (Std.)',
    'Urlaub (Tage)', 'Krank (Tage)', 'Arbeitstage', 'Offene Einträge', 'Fehlerhafte Einträge',
  ]
  styleHeader(ws, headerRowNumber)
  const put = (r: OverviewRow, bold = false) => {
    const row = ws.addRow([
      r.label, r.targetHours, r.workHours, r.gastfahrtHours, r.actualHours, r.differenceHours,
      r.vacationDays, r.sickDays, r.workingDays, r.openEntries, r.issueCount,
    ])
    for (const c of [2, 3, 4, 5, 6]) row.getCell(c).numFmt = HOURS
    if (bold) {
      row.font = { bold: true }
      row.eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
        c.border = { top: { style: 'medium', color: { argb: BLUE } } }
      })
    } else {
      if (r.openEntries > 0) row.getCell(10).font = { bold: true, color: { argb: 'FFB45309' } }
      if (r.issueCount > 0) row.getCell(11).font = { bold: true, color: { argb: 'FFB91C1C' } }
    }
  }
  rows.forEach((r) => put(r))
  put({ ...totals, label: totalsLabel }, true)
  ws.addRow([])
  ws.addRow([
    `Werte entsprechen den Monatsnachweisen. Gastfahrt separat ausgewiesen, ${gastfahrtCountsAsWork ? 'nicht doppelt gezählt; Ist = Arbeitszeit + Gastfahrt' : 'zählt nicht zu den Iststunden; Ist = Arbeitszeit'}. Abwesenheitstage = Arbeitstage (Mo–Fr ohne Feiertag) mit genehmigtem Urlaub/Krankmeldung.`,
  ]).font = { italic: true, color: { argb: 'FF64748B' } }
  landscape(ws, headerRowNumber)
}

function totalsRow(t: MonthOverview['totals']): OverviewRow {
  return { key: 'total', label: 'Summe', employeeId: '', month: '', ...t }
}

export async function downloadMonthOverviewXlsx(o: MonthOverview, filename: string) {
  const wb = await newWorkbook()
  overviewSheet(
    wb.addWorksheet('Gesamtauswertung'),
    `Gesamtauswertung ${o.monthLabel}`,
    `Alle Lokführer · erstellt am ${formatDateDE(localDateKey(new Date(o.createdAt)))}`,
    o.rows,
    'Summe',
    'Mitarbeiter',
    totalsRow(o.totals),
    o.gastfahrtCountsAsWork,
  )
  await download(wb, filename)
}

export async function downloadMultiMonthXlsx(r: MultiMonthReport, filename: string) {
  const wb = await newWorkbook()
  overviewSheet(
    wb.addWorksheet('Mehrmonatsreport'),
    `Mehrmonatsreport ${r.employee.name}`,
    `${r.periodLabel} · erstellt am ${formatDateDE(localDateKey(new Date(r.createdAt)))}`,
    r.rows,
    'Summe Zeitraum',
    'Monat',
    totalsRow(r.totals),
    r.gastfahrtCountsAsWork,
  )
  await download(wb, filename)
}
