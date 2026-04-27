'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  FileText,
  Download,
  Clock,
  Wallet,
  Gift,
  ChevronRight,
  BarChart3,
  Calendar,
  Trash2,
  Users,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { usePerDiem } from '@/hooks/usePerDiem'
import { useHolidayBonus } from '@/hooks/useHolidayBonus'
import { useTimeEntries } from '@/hooks/times/useTimeEntries'
import { useOrganizationTimeAccounts } from '@/hooks/times/useOrgTimeAccounts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  isWithinInterval,
  startOfYear,
} from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import {
  exportWorkingTimePdf,
  exportTimeAccountsPdf,
  exportPerDiemPdf,
  exportHolidayBonusPdf,
  slugify,
} from '@/lib/pdf/exportPdf'

// ─── Types ──────────────────────────────────────────────────
interface RecentReport {
  id: string
  title: string
  generatedAt: string
  scope: string
  format: 'csv' | 'pdf'
}

type ReportTypeId = 'working-time' | 'time-accounts' | 'per-diem' | 'holiday-bonus'

// ─── Page Component ─────────────────────────────────────────
export default function ReportsPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()

  // Date range state
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  })

  // Active report panel
  const [activeReport, setActiveReport] = useState<ReportTypeId | null>(null)

  // Employee filter (admin/dispatcher only — powers change-request #6)
  // 'all' means no filter; otherwise the employee_id to scope by.
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')

  // Recent reports tracking (in-memory)
  const [recentReports, setRecentReports] = useState<RecentReport[]>([])

  // ─── Data Hooks ─────────────────────────────────────────
  const { entries, loading: loadingTimes } = useTimeEntries()
  const { perDiems, loading: loadingPerDiem } = usePerDiem()
  const { bonuses, loading: loadingBonuses } = useHolidayBonus()
  const { accounts, loading: loadingAccounts } = useOrganizationTimeAccounts()

  const loading = loadingTimes || loadingPerDiem || loadingBonuses || loadingAccounts

  // ─── Employee options for the admin filter dropdown ─────
  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach(e => {
      if (e.employee_id && e.employee?.full_name) {
        map.set(e.employee_id, e.employee.full_name)
      }
    })
    // Also include employees with time-accounts but no entries in the period.
    accounts.forEach(a => {
      if (!map.has(a.employee_id)) map.set(a.employee_id, a.full_name)
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, accounts])

  // ─── Filtered Data ──────────────────────────────────────
  const filteredData = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      const d = new Date(dateStr)
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end })
    }
    const matchesEmployee = (employeeId: string | null | undefined) =>
      employeeFilter === 'all' || employeeId === employeeFilter

    return {
      times: entries.filter(e => filterByDate(e.date) && matchesEmployee(e.employee_id)),
      perDiems: perDiems.filter(pd => filterByDate(pd.date) && matchesEmployee(pd.employee_id)),
      bonuses: bonuses.filter(b => filterByDate(b.created_at) && matchesEmployee(b.employee_id)),
      accounts: employeeFilter === 'all'
        ? accounts
        : accounts.filter(a => a.employee_id === employeeFilter),
    }
  }, [entries, perDiems, bonuses, accounts, dateRange, employeeFilter])

  // Human-readable label for the active employee filter — used in PDF subtitles
  // and exported filenames.
  const selectedEmployeeName = useMemo(() => {
    if (employeeFilter === 'all') return null
    return employeeOptions.find(e => e.id === employeeFilter)?.name ?? null
  }, [employeeFilter, employeeOptions])

  const periodLabel = useMemo(() => {
    const dateLocale = locale === 'de' ? deLocale : undefined
    return format(dateRange.start, 'MMMM yyyy', { locale: dateLocale })
  }, [dateRange.start, locale])

  const periodFilenameStamp = format(dateRange.start, 'yyyy-MM')

  // ─── Shared helpers ─────────────────────────────────────

  const makeSubtitle = useCallback((reportTitle: string): string => {
    const parts = [reportTitle, periodLabel]
    if (selectedEmployeeName) parts.push(selectedEmployeeName)
    return parts.join(' · ')
  }, [periodLabel, selectedEmployeeName])

  const makeFilename = useCallback((baseSlug: string): string => {
    const suffix = selectedEmployeeName
      ? `_${slugify(selectedEmployeeName)}_${periodFilenameStamp}`
      : `_${periodFilenameStamp}`
    return `${baseSlug}${suffix}`
  }, [selectedEmployeeName, periodFilenameStamp])

  const trackReport = useCallback((title: string, fmt: 'csv' | 'pdf') => {
    const scope = selectedEmployeeName
      ? selectedEmployeeName
      : (locale === 'de' ? 'Alle Mitarbeiter' : 'All Employees')
    setRecentReports(prev => [
      {
        id: crypto.randomUUID(),
        title: `${title} - ${periodLabel}`,
        generatedAt: new Date().toISOString(),
        scope,
        format: fmt,
      },
      ...prev,
    ].slice(0, 10))
  }, [selectedEmployeeName, periodLabel, locale])

  const warnIfEmpty = useCallback((count: number): boolean => {
    if (count === 0) {
      toast.error(locale === 'de'
        ? 'Keine Daten für den ausgewählten Zeitraum gefunden.'
        : 'No data found for the selected period.')
      return true
    }
    return false
  }, [locale])

  // ─── CSV Download ───────────────────────────────────────
  const downloadCSV = useCallback((data: any[], filename: string, reportTitle: string) => {
    if (warnIfEmpty(data.length)) return

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row =>
      Object.values(row)
        .map(val => {
          if (val === null || val === undefined) return '""'
          const str = String(val).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    ).join('\n')

    const csvContent = `${headers}\n${rows}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.style.display = 'none'
    link.href = url
    link.download = `${filename}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    trackReport(reportTitle, 'csv')
    toast.success(locale === 'de' ? 'Bericht wurde heruntergeladen.' : 'Report downloaded successfully.')
  }, [warnIfEmpty, trackReport, locale])

  // ─── Report type definitions ─────────────────────────────
  const reportTypes: {
    id: ReportTypeId
    title: string
    subtitle: string
    icon: React.ElementType
    onExportCSV: () => void
    onExportPDF: () => void
  }[] = [
    {
      id: 'working-time',
      title: locale === 'de' ? 'Arbeitszeitbericht' : 'Working Time Report',
      subtitle: locale === 'de' ? 'Stunden pro Mitarbeiter & Zeitraum' : 'Hours per employee & period',
      icon: Clock,
      onExportCSV: () => downloadCSV(
        filteredData.times.map(e => ({
          date: e.date,
          employee: e.employee?.full_name || '',
          start: e.start_time,
          end: e.end_time,
          net_hours: e.net_hours,
          verified: e.is_verified ? 'Yes' : 'No',
          notes: e.notes || '',
        })),
        makeFilename('arbeitszeitbericht'),
        locale === 'de' ? 'Arbeitszeitbericht' : 'Working Time Report'
      ),
      onExportPDF: () => {
        if (warnIfEmpty(filteredData.times.length)) return
        const reportTitle = locale === 'de' ? 'Arbeitszeitbericht' : 'Working Time Report'
        exportWorkingTimePdf(filteredData.times, {
          title: reportTitle,
          subtitle: makeSubtitle(reportTitle),
          filename: makeFilename('arbeitszeitbericht'),
          showEmployee: employeeFilter === 'all',
          locale,
        })
        trackReport(reportTitle, 'pdf')
        toast.success(locale === 'de' ? 'PDF heruntergeladen.' : 'PDF downloaded.')
      },
    },
    {
      id: 'time-accounts',
      title: locale === 'de' ? 'Zeitkonto-Salden' : 'Time Account Balances',
      subtitle: locale === 'de' ? 'Überstunden & Kontostatus' : 'Overtime & account status',
      icon: BarChart3,
      onExportCSV: () => downloadCSV(
        filteredData.accounts.map(acc => ({
          employee: acc.full_name,
          target_hours: acc.target_hours,
          actual_hours: Number(acc.actual_hours.toFixed(2)),
          balance: Number(acc.balance.toFixed(2)),
          status: acc.balance >= 0 ? 'Positive' : 'Deficit',
        })),
        makeFilename('zeitkonto-salden'),
        locale === 'de' ? 'Zeitkonto-Salden' : 'Time Account Balances'
      ),
      onExportPDF: () => {
        if (warnIfEmpty(filteredData.accounts.length)) return
        const reportTitle = locale === 'de' ? 'Zeitkonto-Salden' : 'Time Account Balances'
        exportTimeAccountsPdf(filteredData.accounts, {
          title: reportTitle,
          subtitle: makeSubtitle(reportTitle),
          filename: makeFilename('zeitkonto-salden'),
          locale,
        })
        trackReport(reportTitle, 'pdf')
        toast.success(locale === 'de' ? 'PDF heruntergeladen.' : 'PDF downloaded.')
      },
    },
    {
      id: 'per-diem',
      title: locale === 'de' ? 'Spesenbericht' : 'Per Diem Report',
      subtitle: locale === 'de' ? 'Reisekostenpauschalen nach Zeitraum' : 'Travel allowances by period',
      icon: Wallet,
      onExportCSV: () => downloadCSV(
        filteredData.perDiems.map(pd => ({
          date: pd.date,
          employee_id: pd.employee_id,
          country: pd.country,
          days: pd.num_days,
          rate: pd.rate,
          amount: pd.amount,
          status: pd.status,
        })),
        makeFilename('spesenbericht'),
        locale === 'de' ? 'Spesenbericht' : 'Per Diem Report'
      ),
      onExportPDF: () => {
        if (warnIfEmpty(filteredData.perDiems.length)) return
        const reportTitle = locale === 'de' ? 'Spesenbericht' : 'Per Diem Report'
        exportPerDiemPdf(filteredData.perDiems, {
          title: reportTitle,
          subtitle: makeSubtitle(reportTitle),
          filename: makeFilename('spesenbericht'),
          locale,
        })
        trackReport(reportTitle, 'pdf')
        toast.success(locale === 'de' ? 'PDF heruntergeladen.' : 'PDF downloaded.')
      },
    },
    {
      id: 'holiday-bonus',
      title: locale === 'de' ? 'Urlaubsgeld-Bericht' : 'Holiday Bonus Report',
      subtitle: locale === 'de' ? 'Zusammenfassung der Bonuszahlungen' : 'Bonus payments summary',
      icon: Gift,
      onExportCSV: () => downloadCSV(
        filteredData.bonuses.map(b => ({
          date_paid: b.created_at,
          employee_id: b.employee_id,
          amount: b.amount,
          period_start: b.period_start || '',
          period_end: b.period_end || '',
          notes: b.notes || '',
        })),
        makeFilename('urlaubsgeld-bericht'),
        locale === 'de' ? 'Urlaubsgeld-Bericht' : 'Holiday Bonus Report'
      ),
      onExportPDF: () => {
        if (warnIfEmpty(filteredData.bonuses.length)) return
        const reportTitle = locale === 'de' ? 'Urlaubsgeld-Bericht' : 'Holiday Bonus Report'
        exportHolidayBonusPdf(filteredData.bonuses, {
          title: reportTitle,
          subtitle: makeSubtitle(reportTitle),
          filename: makeFilename('urlaubsgeld-bericht'),
          locale,
        })
        trackReport(reportTitle, 'pdf')
        toast.success(locale === 'de' ? 'PDF heruntergeladen.' : 'PDF downloaded.')
      },
    },
  ]

  // ─── Employee view: own time-tracking export (change-request #5) ─────────
  // Employees can download a YTD working-time PDF scoped to themselves.
  // The useTimeEntries hook already filters to own entries for non-admin roles,
  // so `entries` here is already pre-scoped.
  const handleEmployeeSelfPdf = useCallback(() => {
    const yearStart = startOfYear(new Date())
    const mine = entries.filter(e => {
      try {
        return new Date(e.date) >= yearStart
      } catch {
        return false
      }
    })

    if (warnIfEmpty(mine.length)) return

    const fullName = profile?.full_name || (locale === 'de' ? 'Mitarbeiter' : 'Employee')
    const reportTitle = locale === 'de' ? 'Meine Zeiterfassung' : 'My Time Tracking'
    const subtitleParts = [fullName, `${format(yearStart, 'yyyy')} YTD`]

    exportWorkingTimePdf(mine, {
      title: reportTitle,
      subtitle: subtitleParts.join(' · '),
      filename: `meine-zeiterfassung_${slugify(fullName)}_${format(new Date(), 'yyyy')}`,
      showEmployee: false, // single-person export — redundant column
      locale,
    })

    toast.success(locale === 'de' ? 'PDF heruntergeladen.' : 'PDF downloaded.')
  }, [entries, profile?.full_name, locale, warnIfEmpty])

  // ─── Employee fallback ───────────────────────────────────
  if (!isAdmin && !isDispatcher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 border border-gray-100">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900">
            {locale === 'de' ? 'Persönliche Berichte' : 'Personal Reports'}
          </h2>
          <p className="text-gray-500 text-sm max-w-sm">
            {locale === 'de'
              ? 'Sie können Ihre persönliche Zeiterfassung als PDF herunterladen (eigene Daten, laufendes Jahr).'
              : 'Download your personal time-tracking summary as a PDF (your own data, year-to-date).'}
          </p>
        </div>
        <Button
          className="h-11 rounded-xl px-6 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium gap-2"
          onClick={handleEmployeeSelfPdf}
          disabled={loading}
        >
          <Download className="w-4 h-4" />
          {locale === 'de' ? 'Mein PDF herunterladen' : 'Download My PDF'}
        </Button>
      </div>
    )
  }

  // ─── Admin / Dispatcher view ─────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-[#0064E0] tracking-tight">
          {locale === 'de' ? 'Berichte' : 'Reports'}
        </h1>
        <p className="text-sm text-gray-500">
          {locale === 'de' ? 'Berichte erstellen und exportieren' : 'Generate and export reports'}
        </p>
      </div>

      {/* ── Date Range + Employee Selector ───────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={format(dateRange.start, 'M') === format(new Date(), 'M') ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'rounded-lg text-xs font-medium h-9',
              format(dateRange.start, 'M') === format(new Date(), 'M')
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'text-gray-600'
            )}
            onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {locale === 'de' ? 'Aktueller Monat' : 'Current Month'}
          </Button>
          <Button
            variant={format(dateRange.start, 'M') === format(subMonths(new Date(), 1), 'M') ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'rounded-lg text-xs font-medium h-9',
              format(dateRange.start, 'M') === format(subMonths(new Date(), 1), 'M')
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'text-gray-600'
            )}
            onClick={() => setDateRange({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })}
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            {locale === 'de' ? 'Vormonat' : 'Previous Month'}
          </Button>
        </div>

        {/* Employee filter (change-request #6) */}
        {employeeOptions.length > 0 && (
          <div className="relative w-full sm:w-64 sm:ml-auto">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className={cn(
                'w-full h-9 pl-9 pr-9 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-xs font-medium appearance-none cursor-pointer',
                employeeFilter !== 'all'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              )}
            >
              <option value="all">
                {locale === 'de' ? 'Alle Mitarbeiter' : 'All Employees'}
              </option>
              {employeeOptions.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* ── Select Report Type ────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {locale === 'de' ? 'Berichtstyp auswählen' : 'Select Report Type'}
        </h2>

        <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden shadow-sm">
          {reportTypes.map((report) => {
            const isActive = activeReport === report.id

            return (
              <div key={report.id}>
                {/* Report row */}
                <button
                  onClick={() => setActiveReport(isActive ? null : report.id)}
                  className={cn(
                    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus:outline-none',
                    isActive && 'bg-gray-50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{report.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{report.subtitle}</p>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 text-gray-400 transition-transform flex-shrink-0',
                      isActive && 'rotate-90'
                    )}
                  />
                </button>

                {/* Expanded actions panel */}
                {isActive && (
                  <div className="px-5 pb-4 pt-1 bg-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3 ml-0">
                      <span className="text-xs text-gray-500 font-medium">
                        {locale === 'de' ? 'Exportieren als:' : 'Export as:'}
                      </span>
                      <Button
                        size="sm"
                        className="h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium gap-1.5"
                        onClick={() => {
                          report.onExportCSV()
                          setActiveReport(null)
                        }}
                      >
                        <FileText className="w-3 h-3" />
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs font-medium gap-1.5 text-gray-600"
                        onClick={() => {
                          report.onExportPDF()
                          setActiveReport(null)
                        }}
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Recent Reports ─────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          {locale === 'de' ? 'Letzte Berichte' : 'Recent Reports'}
        </h2>

        {recentReports.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">
                {locale === 'de'
                  ? 'Noch keine Berichte erstellt. Wählen Sie oben einen Berichtstyp aus.'
                  : 'No reports generated yet. Select a report type above to get started.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100 overflow-hidden shadow-sm">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{report.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {locale === 'de' ? 'Erstellt am' : 'Generated on'}{' '}
                    {format(new Date(report.generatedAt), 'MMM d, yyyy')}
                    {' · '}
                    {report.scope}
                  </p>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                  {report.format}
                </span>
                <button
                  className="text-gray-300 hover:text-red-500 transition-colors p-1"
                  onClick={() => {
                    setRecentReports(prev => prev.filter(r => r.id !== report.id))
                    toast.success(locale === 'de' ? 'Bericht entfernt.' : 'Report removed.')
                  }}
                  title={locale === 'de' ? 'Bericht löschen' : 'Delete report'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
