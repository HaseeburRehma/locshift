'use client'

/**
 * Monatsnachweis (Kundenfeedback Punkt 5) — the same model is rendered
 * here, in the PDF and in the Excel export, so all three always match.
 * Employees see their own statement; admin/dispatch pick any employee.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { loadReportSources, type ReportSources } from '@/lib/reports/load-sources'
import { buildMonthlyReport, type MonthlyReport } from '@/lib/reports/monthly-report'
import { formatDateDE, formatEuro, formatHours, formatHoursLong, formatSignedHours, monthLabel } from '@/lib/time/format'
import { localDateKey, shiftIssueLabel } from '@/lib/time/shift-hours'
import { downloadMonatsnachweisPdf, monatsnachweisFilename } from '@/lib/pdf/monatsnachweis'
import { downloadMonatsnachweisXlsx } from '@/lib/excel/monatsnachweis'

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthlyStatementPage() {
  return (
    <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <MonthlyStatement />
    </Suspense>
  )
}

function MonthlyStatement() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, profile, isAdmin, isDispatcher, surchargeRules, spesenRates, isLoading } = useUser()
  const isManager = isAdmin || isDispatcher
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()

  const [month, setMonth] = useState(params.get('month') || currentMonth())
  const [employeeId, setEmployeeId] = useState<string>(params.get('employee') || '')
  const [sources, setSources] = useState<ReportSources | null>(null)
  const [employees, setEmployees] = useState<{ id: string; name: string; target: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<null | 'pdf' | 'xlsx'>(null)

  const targetId = isManager ? employeeId : user?.id ?? ''

  useEffect(() => {
    if (!isManager || !profile?.organization_id) return
    supabase
      .from('profiles')
      .select('id, full_name, target_hours, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name')
      .then(({ data }: { data: Array<{ id: string; full_name: string | null; target_hours: number | null; is_active: boolean | null }> | null }) => {
        const list = (data ?? [])
          .filter((p) => p.is_active !== false)
          .map((p) => ({ id: p.id, name: p.full_name || '—', target: p.target_hours }))
        setEmployees(list)
        if (!employeeId && list.length) setEmployeeId(list[0].id)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, profile?.organization_id])

  const load = useCallback(async () => {
    if (!profile?.organization_id || !targetId) return
    setLoading(true)
    try {
      const s = await loadReportSources(supabase, { organizationId: profile.organization_id, fromMonth: month, employeeIds: [targetId] })
      setSources(s)
    } catch (e) {
      console.error('[monthly]', e)
      toast.error(L('Monatsnachweis konnte nicht geladen werden', 'Could not load monthly statement'))
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, targetId, month, supabase])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const qs = new URLSearchParams({ month })
    if (isManager && employeeId) qs.set('employee', employeeId)
    router.replace(`/dashboard/times/monthly?${qs.toString()}`, { scroll: false })
  }, [month, employeeId, isManager, router])

  const report: MonthlyReport | null = useMemo(() => {
    if (!sources || !targetId) return null
    const emp = sources.employees.find((e) => e.id === targetId)
    return buildMonthlyReport({
      employee: { id: targetId, name: emp?.name ?? profile?.full_name ?? '—' },
      month,
      entries: sources.entries,
      absences: sources.absences,
      specialPayments: sources.specialPayments,
      perDiemClaims: sources.perDiemClaims,
      weeklyTargetHours: emp?.weeklyTargetHours ?? null,
      rules: surchargeRules,
      spesenRates,
      locale,
    })
  }, [sources, targetId, month, surchargeRules, spesenRates, locale, profile?.full_name])

  const exportPdf = () => {
    if (!report) return
    setExporting('pdf')
    try {
      downloadMonatsnachweisPdf(report)
    } finally {
      setExporting(null)
    }
  }
  const exportXlsx = async () => {
    if (!report) return
    setExporting('xlsx')
    try {
      await downloadMonatsnachweisXlsx(report, monatsnachweisFilename(report, 'xlsx'))
    } catch (e) {
      console.error(e)
      toast.error(L('Excel-Export fehlgeschlagen', 'Excel export failed'))
    } finally {
      setExporting(null)
    }
  }

  if (isLoading) return null
  const t = report?.totals

  return (
    <div className="max-w-[1500px] mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="rounded-full mt-1" onClick={() => router.push('/dashboard/times')}>
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Monatsnachweis', 'Monthly statement')}</h1>
            <p className="text-sm text-slate-400 font-medium">
              {L('Alle Tage, Zuschläge, Spesen und Sonderzahlungen auf einen Blick', 'All days, premiums, per diem and special payments at a glance')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-10 w-56 rounded-xl font-bold">
                <SelectValue placeholder={L('Mitarbeiter auswählen', 'Select employee')} />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={L('Vormonat', 'Previous month')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="h-10 bg-transparent text-sm font-bold text-slate-700 outline-none px-1"
              aria-label={L('Monat', 'Month')}
            />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={L('Folgemonat', 'Next month')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" disabled={!report || !!exporting} onClick={exportPdf} className="rounded-xl font-bold">
            {exporting === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} PDF
          </Button>
          <Button variant="outline" disabled={!report || !!exporting} onClick={exportXlsx} className="rounded-xl font-bold">
            {exporting === 'xlsx' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />} Excel
          </Button>
        </div>
      </div>

      {loading || !report || !t ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          {/* Header facts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Fact label={L('Mitarbeiter', 'Employee')} value={report.employee.name} />
            <Fact label={L('Monat', 'Month')} value={monthLabel(report.month, locale)} />
            <Fact
              label={L('Sollstunden', 'Target hours')}
              value={t.targetHours == null ? L('nicht hinterlegt', 'not set') : `${formatHours(t.targetHours, locale)} ${L('Std.', 'h')}`}
              hint={t.targetHours == null ? undefined : `${t.weekdays - t.absenceWeekdays} ${L('Tage', 'days')} × ${formatHours(t.dailyTargetHours, locale)} ${L('Std.', 'h')}`}
            />
            <Fact
              label={L('Freigabestatus', 'Approval')}
              value={report.approval.label}
              tone={report.approval.state === 'approved' ? 'ok' : report.approval.state === 'empty' ? undefined : 'warn'}
              hint={report.hasCorrections ? L('enthält nachträgliche Korrekturen', 'contains later corrections') : undefined}
            />
            <Fact label={L('Erstellt am', 'Created')} value={formatDateDE(localDateKey(new Date(report.createdAt)))} hint={L('Live-Auswertung', 'Live evaluation')} />
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <Kpi label={L('Ist', 'Actual')} value={`${formatHours(t.actualHours, locale)} ${L('Std.', 'h')}`} sub={formatHoursLong(t.actualHours, locale)} />
            <Kpi
              label={L('Differenz Ist – Soll', 'Actual – target')}
              value={t.differenceHours == null ? '–' : `${formatSignedHours(t.differenceHours, locale)} ${L('Std.', 'h')}`}
              tone={t.differenceHours == null ? undefined : t.differenceHours < 0 ? 'warn' : 'ok'}
            />
            <Kpi label={L('Arbeitszeit', 'Working time')} value={`${formatHours(t.workHours, locale)} ${L('Std.', 'h')}`} sub={`${t.workingDays} ${L('Arbeitstage', 'working days')}`} />
            <Kpi label={L('Gastfahrt (separat)', 'Gastfahrt (separate)')} value={`${formatHours(t.gastfahrtHours, locale)} ${L('Std.', 'h')}`} />
            <Kpi label={L('Spesen gesamt', 'Per diem total')} value={formatEuro(t.spesenTotal, locale)} />
            <Kpi label={L('Sonderzahlungen', 'Special payments')} value={formatEuro(t.specialPaymentsTotal, locale)} />
          </div>

          {(t.openEntries > 0 || t.issueCount > 0 || report.warnings.length > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1">
              {t.issueCount > 0 && (
                <p className="flex items-center gap-2 text-sm font-bold text-red-700">
                  <AlertTriangle className="w-4 h-4" />
                  {L(`${t.issueCount} Eintrag/Einträge mit fehlenden oder widersprüchlichen Angaben`, `${t.issueCount} entr${t.issueCount === 1 ? 'y' : 'ies'} with missing or contradictory data`)}
                </p>
              )}
              {t.openEntries > 0 && (
                <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                  <Info className="w-4 h-4" />
                  {L(`${t.openEntries} Eintrag/Einträge noch nicht freigegeben – im Nachweis markiert`, `${t.openEntries} entr${t.openEntries === 1 ? 'y' : 'ies'} not approved yet – marked below`)}
                </p>
              )}
              {report.warnings.map((w) => (
                <p key={w} className="text-xs font-semibold text-amber-800">{w}</p>
              ))}
            </div>
          )}

          {/* Daily table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="bg-[#0064E0] text-white text-[10px] uppercase tracking-wider">
                  <tr>
                    {[
                      L('Datum', 'Date'), L('Tag', 'Day'), L('Beginn', 'Start'), L('Ende', 'End'), L('Pause (Min.)', 'Break (min)'),
                      L('Arbeitszeit (Std.)', 'Hours (h)'), L('Gastfahrt (Std.)', 'Gastfahrt (h)'), L('Spesen (€)', 'Per diem (€)'), L('Übernachtung', 'Overnight'),
                      L('25 % (Std.)', '25 % (h)'), L('40 % (Std.)', '40 % (h)'), L('Sonntag (Std.)', 'Sunday (h)'), L('Feiertag (Std.)', 'Holiday (h)'), L('Status / Bemerkung', 'Status / note'),
                    ].map((h) => (
                      <th key={h} className="px-3 py-3 font-black text-left whitespace-nowrap sticky top-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.days.map((d) =>
                    d.rows.length === 0 ? (
                      <tr
                        key={d.date}
                        className={cn(
                          'border-t border-slate-100 text-slate-400',
                          d.absence ? 'bg-blue-50/60' : d.holidayName ? 'bg-yellow-50' : d.isWeekend && 'bg-slate-50/70',
                        )}
                      >
                        <td className="px-3 py-1.5 tabular-nums">{formatDateDE(d.date)}</td>
                        <td className="px-3 py-1.5">{d.weekdayShort}</td>
                        <td colSpan={11} />
                        <td className="px-3 py-1.5 italic">{d.absence?.label ?? d.holidayName ?? L('kein Einsatz', 'no shift')}</td>
                      </tr>
                    ) : (
                      d.rows.map((r, idx) => (
                        <tr
                          key={r.entryId}
                          onClick={() => router.push(`/dashboard/times?entry=${r.entryId}`)}
                          className={cn('border-t border-slate-100 cursor-pointer hover:bg-blue-50/40', r.issues.length > 0 && 'bg-red-50/50')}
                        >
                          <td className="px-3 py-2 font-semibold tabular-nums">{formatDateDE(d.date)}</td>
                          <td className="px-3 py-2">{d.weekdayShort}</td>
                          <td className="px-3 py-2 tabular-nums">{r.start}</td>
                          <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                            {r.end || '–'}
                            {r.endDayOffset > 0 && <span className="ml-1 px-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-black">+{r.endDayOffset}</span>}
                          </td>
                          <td className="px-3 py-2 tabular-nums">{r.breakMinutes} Min.</td>
                          <td className="px-3 py-2 font-black tabular-nums">{r.workHours ? formatHours(r.workHours, locale) : ''}</td>
                          <td className="px-3 py-2 tabular-nums text-violet-700">{r.gastfahrtHours ? formatHours(r.gastfahrtHours, locale) : ''}</td>
                          <td className="px-3 py-2 tabular-nums">{idx === 0 && d.daySpesen ? formatEuro(d.daySpesen, locale) : ''}</td>
                          <td className="px-3 py-2">{r.overnight ? <span className="font-black text-emerald-700">{L('ja', 'yes')}</span> : L('nein', 'no')}</td>
                          <td className="px-3 py-2 tabular-nums">{r.night25 ? formatHours(r.night25, locale) : ''}</td>
                          <td className="px-3 py-2 tabular-nums">{r.night40 ? formatHours(r.night40, locale) : ''}</td>
                          <td className="px-3 py-2 tabular-nums">{r.sunday ? formatHours(r.sunday, locale) : ''}</td>
                          <td className="px-3 py-2 tabular-nums">{r.holiday ? formatHours(r.holiday, locale) : ''}</td>
                          <td className="px-3 py-2 text-xs">
                            {idx === 0 && (d.holidayName || d.absence) && <span className="mr-1 font-bold text-slate-500">{d.holidayName ?? d.absence?.label} ·</span>}
                            {r.status !== 'approved' && (
                              <span className="mr-1 font-bold text-amber-700">
                                {r.status === 'running' ? L('läuft', 'running') : r.status === 'draft' ? L('nicht abgesendet', 'not submitted') : L('nicht freigegeben', 'not approved')}
                              </span>
                            )}
                            {r.issues.length > 0 && <span className="mr-1 font-bold text-red-600">{r.issues.map((i) => shiftIssueLabel(i, locale)).join(', ')}</span>}
                            {r.corrected && <span className="mr-1 text-indigo-700">{L('korrigiert', 'corrected')}</span>}
                            {r.enteredOnBehalf && <span className="mr-1 text-slate-500">{L('stellv. erfasst', 'on behalf')}</span>}
                            {r.route && <span className="mr-1 text-slate-600">{r.route}</span>}
                            {r.notes && <span className="text-slate-400">{r.notes}</span>}
                          </td>
                        </tr>
                      ))
                    ),
                  )}
                </tbody>
                <tfoot className="bg-slate-100 font-black text-slate-900">
                  <tr>
                    <td className="px-3 py-3" colSpan={5}>{L('Summe', 'Total')}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.workHours, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.gastfahrtHours, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatEuro(t.spesenFromEntries, locale)}</td>
                    <td className="px-3 py-3">{t.overnightCount}× {L('ja', 'yes')}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.night25, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.night40, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.sunday, locale)}</td>
                    <td className="px-3 py-3 tabular-nums">{formatHours(t.holiday, locale)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Summary blocks */}
          <div className="grid lg:grid-cols-2 gap-4">
            <SummaryCard title={L('Monatssummen – Stunden', 'Monthly totals – hours')}>
              <Line label={L('Arbeitstage', 'Working days')} value={String(t.workingDays)} />
              <Line label={L('Sollstunden', 'Target hours')} value={t.targetHours == null ? '–' : `${formatHours(t.targetHours, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Arbeitszeit (ohne Gastfahrt)', 'Working time (excl. Gastfahrt)')} value={`${formatHours(t.workHours, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Gastfahrt (separat ausgewiesen)', 'Gastfahrt (shown separately)')} value={`${formatHours(t.gastfahrtHours, locale)} ${L('Std.', 'h')}`} />
              <Line
                strong
                label={report.rules.gastfahrtCountsAsWork ? L('Iststunden (Arbeitszeit + Gastfahrt)', 'Actual (work + Gastfahrt)') : L('Iststunden (nur Arbeitszeit)', 'Actual (work only)')}
                value={`${formatHours(t.actualHours, locale)} ${L('Std.', 'h')}`}
              />
              <Line label={L('Differenz Ist – Soll', 'Actual – target')} value={t.differenceHours == null ? '–' : `${formatSignedHours(t.differenceHours, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Nachtzuschlag 25 %', 'Night premium 25 %')} value={`${formatHours(t.night25, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Nachtzuschlag 40 %', 'Night premium 40 %')} value={`${formatHours(t.night40, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Sonntagszuschlag', 'Sunday premium')} value={`${formatHours(t.sunday, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Feiertagszuschlag', 'Holiday premium')} value={`${formatHours(t.holiday, locale)} ${L('Std.', 'h')}`} />
              <Line label={L('Urlaubstage / Krankheitstage', 'Vacation / sick days')} value={`${t.vacationDays} / ${t.sickDays}`} />
            </SummaryCard>
            <SummaryCard title={L('Beträge in Euro', 'Amounts in euro')}>
              {t.spesen.length === 0 && <Line label={L('Spesen aus Schichten', 'Per diem from shifts')} value={formatEuro(0, locale)} />}
              {t.spesen.map((l) => (
                <Line key={l.label} label={`${l.count} × ${l.label}`} value={formatEuro(l.amount, locale)} />
              ))}
              {t.perDiemClaims.count > 0 && (
                <Line label={L(`Spesenanträge (${t.perDiemClaims.count})`, `Per-diem claims (${t.perDiemClaims.count})`)} value={formatEuro(t.perDiemClaims.amount, locale)} />
              )}
              <Line strong label={L('Spesen gesamt', 'Per diem total')} value={formatEuro(t.spesenTotal, locale)} />
              <div className="h-px bg-slate-100 my-2" />
              {t.specialPayments.length === 0 && <Line label={L('Keine Sonderzahlungen in diesem Monat', 'No special payments this month')} value="–" />}
              {t.specialPayments.map((p) => (
                <Line key={p.id} label={`${p.title} (${p.periodLabel})${p.note ? ` – ${p.note}` : ''}`} value={formatEuro(p.amount, locale)} />
              ))}
              <Line strong label={L('Sonderzahlungen gesamt', 'Special payments total')} value={formatEuro(t.specialPaymentsTotal, locale)} />
            </SummaryCard>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {L(
              `Dezimalstunden: 7,50 Std. = ${formatHoursLong(7.5, 'de')} Eine Schicht zählt zum Tag ihres Beginns. Spesen werden je Kalendertag einmal berücksichtigt. Gastfahrt wird separat ausgewiesen und nicht doppelt gezählt. Sonn- und Feiertagsstunden zählen nur, soweit sie auf den Tag fallen.`,
              'Decimal hours: 7.50 h = 7 h 30 min. A shift belongs to the day it starts. Per diem counts once per calendar day. Gastfahrt is shown separately and never counted twice. Sunday/holiday hours only count for the part of the shift on that day.',
            )}
          </p>
        </>
      )}
    </div>
  )
}

function Fact({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('text-sm font-black text-slate-900', tone === 'ok' && 'text-emerald-700', tone === 'warn' && 'text-amber-700')}>{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={cn('text-xl font-black tabular-nums text-slate-900 mt-1', tone === 'ok' && 'text-emerald-700', tone === 'warn' && 'text-amber-700')}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-[#0064E0] mb-3">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 text-sm', strong ? 'font-black text-slate-900' : 'text-slate-600')}>
      <span>{label}</span>
      <span className="font-bold tabular-nums whitespace-nowrap">{value}</span>
    </div>
  )
}
