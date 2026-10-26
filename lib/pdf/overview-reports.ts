'use client'

/**
 * PDFs for the Gesamtauswertung (all drivers, one month) and the
 * Mehrmonatsreport (one driver, several months) — Kundenfeedback Punkt 18.
 * The multi-month report draws two separate bar charts so hours and days
 * never share one scale.
 */

import { jsPDF } from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import type { MonthOverview, MultiMonthReport, OverviewRow, OverviewTotals } from '@/lib/reports/overview-report'
import { formatHours, monthShort } from '@/lib/time/format'
import { localDateKey } from '@/lib/time/shift-hours'
import { pdfText } from './monatsnachweis'
import { formatInstantDateTime } from '@/lib/time/format'

const BLUE: [number, number, number] = [0, 100, 224]
const VIOLET: [number, number, number] = [124, 58, 237]
const TEAL: [number, number, number] = [13, 148, 136]
const ROSE: [number, number, number] = [225, 29, 72]
const SLATE: [number, number, number] = [30, 41, 59]
const MUTED: [number, number, number] = [100, 116, 139]

function created(iso: string): string {
  return `${formatInstantDateTime(iso)} Uhr`
}

function header(doc: jsPDF, title: string, subtitle: string, createdAt: string) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...SLATE)
  doc.text(pdfText(title), 12, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...BLUE)
  doc.text(pdfText(subtitle), 12, 22)
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(`Erstellt am ${created(createdAt)}`, 285, 15, { align: 'right' })
}

function table(doc: jsPDF, startY: number, firstCol: string, rows: OverviewRow[], totals: OverviewTotals, totalsLabel: string) {
  const h = (n: number | null) => (n == null ? '–' : formatHours(n, 'de'))
  const body: RowInput[] = rows.map((r) => [
    pdfText(r.label), h(r.targetHours), h(r.workHours), h(r.gastfahrtHours), h(r.actualHours), r.differenceHours == null ? '–' : pdfText(`${r.differenceHours > 0 ? '+' : ''}${formatHours(r.differenceHours, 'de')}`),
    String(r.vacationDays), String(r.sickDays), String(r.workingDays),
    r.openEntries ? { content: String(r.openEntries), styles: { textColor: [180, 83, 9], fontStyle: 'bold' } } : '0',
    r.issueCount ? { content: String(r.issueCount), styles: { textColor: [185, 28, 28], fontStyle: 'bold' } } : '0',
  ])
  autoTable(doc, {
    startY,
    head: [[firstCol, 'Soll (Std.)', 'Arbeitszeit (Std.)', 'Gastfahrt (Std.)', 'Ist (Std.)', 'Differenz (Std.)', 'Urlaub (Tage)', 'Krank (Tage)', 'Arbeitstage', 'Offene Einträge', 'Fehlerhafte Einträge']],
    body,
    foot: [[
      totalsLabel, h(totals.targetHours), h(totals.workHours), h(totals.gastfahrtHours), h(totals.actualHours),
      totals.differenceHours == null ? '–' : `${totals.differenceHours > 0 ? '+' : ''}${formatHours(totals.differenceHours, 'de')}`,
      String(totals.vacationDays), String(totals.sickDays), String(totals.workingDays), String(totals.openEntries), String(totals.issueCount),
    ]],
    theme: 'grid',
    showHead: 'everyPage',
    margin: { left: 12, right: 12, bottom: 14 },
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: SLATE, lineColor: [226, 232, 240], lineWidth: 0.1 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [241, 245, 249], textColor: SLATE, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { halign: 'center' },
    columnStyles: { 0: { halign: 'left', cellWidth: 60 } },
  })
}

function legend(doc: jsPDF, y: number, totals: OverviewTotals, gastfahrtCountsAsWork: boolean) {
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  const lines = [
    gastfahrtCountsAsWork
      ? 'Werte entsprechen den Monatsnachweisen. Gastfahrt wird separat ausgewiesen und nicht doppelt gezählt; Ist = Arbeitszeit + Gastfahrt.'
      : 'Werte entsprechen den Monatsnachweisen. Gastfahrt wird separat ausgewiesen und zählt nicht zu den Iststunden; Ist = Arbeitszeit.',
    'Abwesenheitstage: Arbeitstage (Mo–Fr ohne Feiertag) mit genehmigtem Urlaub bzw. Krankmeldung. Die Übersicht ist keine Leistungsbewertung.',
    totals.openEntries ? `${totals.openEntries} Eintrag/Einträge sind noch nicht freigegeben – Werte können sich noch ändern.` : 'Alle Einträge sind freigegeben.',
    ...(totals.issueCount ? [`${totals.issueCount} Eintrag/Einträge mit Fehlern (z. B. 0 Stunden oder fehlendes Ende) – bitte im Monatsnachweis prüfen.`] : []),
  ]
  lines.forEach((l, i) => doc.text(pdfText(l), 12, y + i * 3.6))
}

function footer(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(pdfText(`LokShift · ${label}`), 12, 204)
    doc.text(`Seite ${i} von ${pages}`, 285, 204, { align: 'right' })
  }
}

export function buildMonthOverviewPdf(o: MonthOverview): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  header(doc, 'Gesamtauswertung', `${o.monthLabel} · alle Lokführer`, o.createdAt)
  table(doc, 30, 'Mitarbeiter', o.rows, o.totals, 'Summe')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = ((doc as any).lastAutoTable?.finalY ?? 100) + 6
  legend(doc, y > 190 ? 190 : y, o.totals, o.gastfahrtCountsAsWork)
  footer(doc, `Gesamtauswertung ${o.monthLabel}`)
  return doc
}

interface Series {
  label: string
  color: [number, number, number]
  values: number[]
}

function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nice * exp
}

function barChart(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, unit: string, categories: string[], series: Series[]) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)
  doc.text(pdfText(title), x, y)

  const top = y + 5
  const left = x + 12
  const plotW = w - 14
  const plotH = h - 18
  const bottom = top + plotH
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)))
  const ticks = 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  for (let i = 0; i <= ticks; i++) {
    const v = (max / ticks) * i
    const ty = bottom - (plotH / ticks) * i
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.1)
    doc.line(left, ty, left + plotW, ty)
    doc.setTextColor(...MUTED)
    doc.text(Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','), left - 1.5, ty + 1, { align: 'right' })
  }
  doc.text(unit, x, top - 1)

  const groupW = plotW / Math.max(1, categories.length)
  const barW = Math.min(9, (groupW * 0.7) / series.length)
  categories.forEach((cat, ci) => {
    const gx = left + groupW * ci + (groupW - barW * series.length) / 2
    series.forEach((s, si) => {
      const v = s.values[ci] ?? 0
      const bh = (v / max) * plotH
      doc.setFillColor(...s.color)
      if (bh > 0) doc.rect(gx + si * barW, bottom - bh, barW - 0.6, bh, 'F')
      if (v > 0) {
        doc.setTextColor(...SLATE)
        doc.setFontSize(5.8)
        doc.text(Number.isInteger(v) ? String(v) : formatHours(v, 'de'), gx + si * barW + (barW - 0.6) / 2, bottom - bh - 1, { align: 'center' })
      }
    })
    doc.setFontSize(6.5)
    doc.setTextColor(...MUTED)
    doc.text(cat, left + groupW * ci + groupW / 2, bottom + 4, { align: 'center' })
  })

  let lx = left
  series.forEach((s) => {
    doc.setFillColor(...s.color)
    doc.rect(lx, bottom + 8, 3, 3, 'F')
    doc.setTextColor(...SLATE)
    doc.setFontSize(7)
    doc.text(pdfText(s.label), lx + 4.5, bottom + 10.5)
    lx += doc.getTextWidth(pdfText(s.label)) + 12
  })
}

export function buildMultiMonthPdf(r: MultiMonthReport): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  header(doc, `Mehrmonatsreport · ${r.employee.name}`, r.periodLabel, r.createdAt)
  table(doc, 30, 'Monat', r.rows, r.totals, 'Summe Zeitraum')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let y = ((doc as any).lastAutoTable?.finalY ?? 100) + 8
  if (y > 120) {
    doc.addPage()
    y = 18
  }
  const cats = r.rows.map((x) => monthShort(x.month))
  barChart(doc, 12, y, 165, 72, 'Arbeitszeit und Gastfahrt je Monat', 'Std.', cats, [
    { label: 'Arbeitszeit', color: BLUE, values: r.rows.map((x) => x.workHours) },
    { label: 'Gastfahrt', color: VIOLET, values: r.rows.map((x) => x.gastfahrtHours) },
  ])
  barChart(doc, 185, y, 100, 72, 'Urlaubs- und Krankheitstage je Monat', 'Tage', cats, [
    { label: 'Urlaub', color: TEAL, values: r.rows.map((x) => x.vacationDays) },
    { label: 'Krank', color: ROSE, values: r.rows.map((x) => x.sickDays) },
  ])
  legend(doc, Math.min(y + 80, 192), r.totals, r.gastfahrtCountsAsWork)
  footer(doc, `Mehrmonatsreport ${r.employee.name} · ${r.periodLabel}`)
  return doc
}
