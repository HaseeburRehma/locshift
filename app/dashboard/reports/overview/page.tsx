'use client'

/**
 * Gesamtauswertung + Mehrmonatsreport (Kundenfeedback Punkt 18).
 *
 *   "April / Alle Lokführer"   → one row per employee + totals
 *   "Mitarbeiter A / Jan–Jun"  → one row per month + totals + charts
 *
 * Built from the monthly statements, so every value matches them.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, FileSpreadsheet, Info, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { loadReportSources, type ReportSources } from '@/lib/reports/load-sources'
import { buildMonthOverview, buildMultiMonthReport, type OverviewRow, type OverviewTotals } from '@/lib/reports/overview-report'
import { formatHours, formatSignedHours, monthShort } from '@/lib/time/format'
import { buildMonthOverviewPdf, buildMultiMonthPdf } from '@/lib/pdf/overview-reports'
import { downloadMonthOverviewXlsx, downloadMultiMonthXlsx } from '@/lib/excel/monatsnachweis'

function currentMonth(offset = 0): string {
  const d = new Date()
  const x = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
}

const DRIVER_ROLES = ['employee', 'technician']

export default function OverviewReportsPage() {
  return (
    <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <OverviewReports />
    </Suspense>
  )
}

function OverviewReports() {
  const router = useRouter()
  const params = useSearchParams()
  const { profile, isAdmin, isDispatcher, isLoading, surchargeRules, spesenRates } = useUser()
  const isManager = isAdmin || isDispatcher
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()

  const [tab, setTab] = useState<'month' | 'multi'>(params.get('tab') === 'multi' ? 'multi' : 'month')
  const [month, setMonth] = useState(currentMonth(-1))
  const [from, setFrom] = useState(`${new Date().getFullYear()}-01`)
  const [to, setTo] = useState(currentMonth())
  const [employeeId, setEmployeeId] = useState('')
  const [includeAll, setIncludeAll] = useState(false)
  const [sources, setSources] = useState<ReportSources | null>(null)
  const [allEmployees, setAllEmployees] = useState<{ id: string; name: string; role: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) return
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name')
      .then(({ data }: { data: Array<{ id: string; full_name: string | null; role: string | null; is_active: boolean | null }> | null }) => {
        const list = (data ?? [])
          .filter((p) => p.is_active !== false)
          .map((p) => ({ id: p.id, name: p.full_name || '—', role: String(p.role ?? 'employee').toLowerCase() }))
        setAllEmployees(list)
        setEmployeeId((cur) => cur || (list.find((e) => DRIVER_ROLES.includes(e.role)) ?? list[0])?.id || '')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id])

  useEffect(() => {
    if (!isLoading && !isManager) router.replace('/dashboard')
  }, [isLoading, isManager, router])

  const load = useCallback(async () => {
    if (!profile?.organization_id) return
    if (tab === 'multi' && !employeeId) return
    setLoading(true)
    try {
      const s =
        tab === 'month'
          ? await loadReportSources(supabase, { organizationId: profile.organization_id, fromMonth: month })
          : await loadReportSources(supabase, {
              organizationId: profile.organization_id,
              fromMonth: from <= to ? from : to,
              toMonth: from <= to ? to : from,
              employeeIds: employeeId ? [employeeId] : undefined,
            })
      setSources(s)
    } catch (e) {
      console.error('[overview]', e)
      toast.error(L('Auswertung konnte nicht geladen werden', 'Could not load report'))
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, tab, month, from, to, employeeId, supabase])

  useEffect(() => {
    load()
  }, [load])

  const employees = useMemo(
    () => (sources?.employees ?? []).filter((e) => e.isActive && (includeAll || DRIVER_ROLES.includes(e.role))),
    [sources, includeAll],
  )

  const monthOverview = useMemo(() => {
    if (!sources || tab !== 'month') return null
    return buildMonthOverview({
      month,
      employees: employees.map((e) => ({ id: e.id, name: e.name, weeklyTargetHours: e.weeklyTargetHours })),
      entries: sources.entries,
      absences: sources.absences,
      specialPayments: sources.specialPayments,
      perDiemClaims: sources.perDiemClaims,
      rules: surchargeRules,
      spesenRates,
      locale,
    })
  }, [sources, tab, month, employees, surchargeRules, spesenRates, locale])

  const multi = useMemo(() => {
    if (!sources || tab !== 'multi' || !employeeId) return null
    const emp = sources.employees.find((e) => e.id === employeeId)
    if (!emp) return null
    return buildMultiMonthReport({
      employee: { id: emp.id, name: emp.name, weeklyTargetHours: emp.weeklyTargetHours },
      from: from <= to ? from : to,
      to: from <= to ? to : from,
      entries: sources.entries,
      absences: sources.absences,
      specialPayments: sources.specialPayments,
      perDiemClaims: sources.perDiemClaims,
      rules: surchargeRules,
      spesenRates,
      locale,
    })
  }, [sources, tab, employeeId, from, to, surchargeRules, spesenRates, locale])

  const exportPdf = () => {
    if (tab === 'month' && monthOverview) buildMonthOverviewPdf(monthOverview).save(`Gesamtauswertung_${monthOverview.month}.pdf`)
    if (tab === 'multi' && multi) buildMultiMonthPdf(multi).save(`Mehrmonatsreport_${multi.employee.name.replace(/\s+/g, '-')}_${multi.from}_${multi.to}.pdf`)
  }
  const exportXlsx = async () => {
    try {
      if (tab === 'month' && monthOverview) await downloadMonthOverviewXlsx(monthOverview, `Gesamtauswertung_${monthOverview.month}.xlsx`)
      if (tab === 'multi' && multi) await downloadMultiMonthXlsx(multi, `Mehrmonatsreport_${multi.employee.name.replace(/\s+/g, '-')}_${multi.from}_${multi.to}.xlsx`)
    } catch (e) {
      console.error(e)
      toast.error(L('Excel-Export fehlgeschlagen', 'Excel export failed'))
    }
  }

  if (isLoading || !isManager) return null
  const rows = tab === 'month' ? monthOverview?.rows ?? [] : multi?.rows ?? []
  const totals = tab === 'month' ? monthOverview?.totals : multi?.totals

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="rounded-full mt-1" onClick={() => router.push('/dashboard/reports')}>
          <ArrowLeft className="w-5 h-5 text-blue-600" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Auswertungen', 'Evaluations')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {L('Arbeitsumfang, Gastfahrten und Abwesenheiten – Werte wie im Monatsnachweis', 'Workload, Gastfahrt and absences – same values as the monthly statements')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {(['month', 'multi'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn('px-4 h-9 rounded-lg text-sm font-bold transition-colors', tab === k ? 'bg-white text-[#0064E0] shadow-sm' : 'text-slate-500')}
            >
              {k === 'month' ? L('Alle Lokführer (Monat)', 'All drivers (month)') : L('Mehrmonatsreport', 'Multi-month')}
            </button>
          ))}
        </div>

        {tab === 'month' ? (
          <>
            <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" aria-label={L('Monat', 'Month')} />
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 px-2">
              <input type="checkbox" checked={includeAll} onChange={(e) => setIncludeAll(e.target.checked)} />
              {L('auch Admin/Disposition', 'include admin/dispatch')}
            </label>
          </>
        ) : (
          <>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-10 w-56 rounded-xl font-bold">
                <SelectValue placeholder={L('Mitarbeiter', 'Employee')} />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {allEmployees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm font-bold text-slate-400">{L('von', 'from')}</span>
            <input type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
            <span className="text-sm font-bold text-slate-400">{L('bis', 'to')}</span>
            <input type="month" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold" />
          </>
        )}

        <div className="flex gap-2 ml-auto">
          <Button variant="outline" disabled={loading || rows.length === 0} onClick={exportPdf} className="rounded-xl font-bold">
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" disabled={loading || rows.length === 0} onClick={exportXlsx} className="rounded-xl font-bold">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
        </div>
      </div>

      {loading || !totals ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <>
          <OverviewTable
            rows={rows}
            totals={totals}
            firstCol={tab === 'month' ? L('Mitarbeiter', 'Employee') : L('Monat', 'Month')}
            totalsLabel={tab === 'month' ? L('Summe', 'Total') : L('Summe Zeitraum', 'Period total')}
            onRowClick={(r) => router.push(`/dashboard/times/monthly?month=${r.month}&employee=${r.employeeId}`)}
          />

          {tab === 'multi' && multi && (
            <div className="grid lg:grid-cols-3 gap-4">
              <ChartCard title={L('Arbeitszeit und Gastfahrt je Monat (Std.)', 'Working time and Gastfahrt per month (h)')} className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={multi.rows.map((r) => ({ m: monthShort(r.month), work: r.workHours, gast: r.gastfahrtHours }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => `${formatHours(v, locale)} ${L('Std.', 'h')}`} />
                    <Legend />
                    <Bar dataKey="work" name={L('Arbeitszeit', 'Working time')} fill="#0064E0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gast" name="Gastfahrt" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title={L('Urlaubs- und Krankheitstage je Monat (Tage)', 'Vacation and sick days per month (days)')}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={multi.rows.map((r) => ({ m: monthShort(r.month), vac: r.vacationDays, sick: r.sickDays }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="vac" name={L('Urlaub', 'Vacation')} fill="#0D9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sick" name={L('Krank', 'Sick')} fill="#E11D48" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 space-y-1">
            <p className="flex items-center gap-2 font-bold text-slate-700"><Info className="w-4 h-4" /> {L('So wird gerechnet', 'How values are calculated')}</p>
            <p>
              {(tab === 'month' ? monthOverview?.gastfahrtCountsAsWork : multi?.gastfahrtCountsAsWork) ?? true
                ? L('Alle Werte stammen aus den Monatsnachweisen. Gastfahrt wird separat ausgewiesen; Ist = Arbeitszeit + Gastfahrt (keine Doppelzählung).', 'All values come from the monthly statements. Gastfahrt is shown separately; actual = working time + Gastfahrt (never counted twice).')
                : L('Alle Werte stammen aus den Monatsnachweisen. Gastfahrt wird separat ausgewiesen und zählt nicht zu den Iststunden; Ist = Arbeitszeit.', 'All values come from the monthly statements. Gastfahrt is shown separately and not counted as actual hours; actual = working time.')}
            </p>
            <p>{L('„Fehler“ zählt Einträge, die geprüft werden müssen (z. B. 0 Stunden oder fehlendes Ende).', '“Issues” counts entries that need checking (e.g. 0 hours or a missing end).')}</p>
            <p>{L('Abwesenheitstage zählen als Arbeitstage (Mo–Fr ohne Feiertag) mit genehmigtem Urlaub bzw. Krankmeldung. Ganze Tage – Teiltage werden nicht anteilig gezählt.', 'Absence days count weekdays (Mon–Fri, no holiday) with approved vacation/sick leave. Whole days only.')}</p>
            <p>{L('Offene Einträge sind noch nicht freigegeben und können sich ändern. Die Übersicht ist alphabetisch sortiert und keine Leistungsbewertung.', 'Open entries are not approved yet and may change. Sorted alphabetically; this is not a performance ranking.')}</p>
          </div>
        </>
      )}
    </div>
  )
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 p-4', className)}>
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function OverviewTable({
  rows, totals, firstCol, totalsLabel, onRowClick,
}: {
  rows: OverviewRow[]
  totals: OverviewTotals
  firstCol: string
  totalsLabel: string
  onRowClick: (r: OverviewRow) => void
}) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const h = (n: number | null) => (n == null ? '–' : formatHours(n, locale))
  const heads = [
    firstCol, L('Soll', 'Target'), L('Arbeitszeit', 'Working time'), 'Gastfahrt', L('Ist', 'Actual'), L('Differenz', 'Difference'),
    L('Urlaub (Tage)', 'Vacation (days)'), L('Krank (Tage)', 'Sick (days)'), L('Arbeitstage', 'Working days'), L('Offen', 'Open'), L('Fehler', 'Issues'),
  ]
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-[#0064E0] text-white text-[10px] uppercase tracking-wider">
            <tr>{heads.map((x, i) => <th key={x} className={cn('px-4 py-3 font-black whitespace-nowrap', i === 0 ? 'text-left' : 'text-right')}>{x}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={() => onRowClick(r)} className="border-t border-slate-100 hover:bg-blue-50/40 cursor-pointer">
                <td className="px-4 py-2.5 font-bold text-slate-900">{r.label}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{h(r.targetHours)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold">{h(r.workHours)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-violet-700">{h(r.gastfahrtHours)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-black">{h(r.actualHours)}</td>
                <td className={cn('px-4 py-2.5 text-right tabular-nums', (r.differenceHours ?? 0) < 0 ? 'text-amber-700' : 'text-emerald-700')}>
                  {r.differenceHours == null ? '–' : formatSignedHours(r.differenceHours, locale)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.vacationDays}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.sickDays}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.workingDays}</td>
                <td className={cn('px-4 py-2.5 text-right tabular-nums', r.openEntries ? 'font-black text-amber-700' : 'text-slate-400')}>{r.openEntries}</td>
                <td className={cn('px-4 py-2.5 text-right tabular-nums', r.issueCount ? 'font-black text-red-700' : 'text-slate-400')}>{r.issueCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-100 font-black text-slate-900">
            <tr>
              <td className="px-4 py-3">{totalsLabel}</td>
              <td className="px-4 py-3 text-right tabular-nums">{h(totals.targetHours)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{h(totals.workHours)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{h(totals.gastfahrtHours)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{h(totals.actualHours)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.differenceHours == null ? '–' : formatSignedHours(totals.differenceHours, locale)}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.vacationDays}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.sickDays}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.workingDays}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.openEntries}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.issueCount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
