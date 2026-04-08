'use client'

import React, { useState, useMemo } from 'react'
import {
  FileText,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  ArrowRight,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { usePerDiem } from '@/hooks/usePerDiem'
import { useHolidayBonus } from '@/hooks/useHolidayBonus'
import { useTimeEntries } from '@/hooks/times/useTimeEntries'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { format, isWithinInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export default function ReportsPage() {
  const { isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const [dateRange, setDateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  })

  // 1. Mission-Critical Data Hooks (Operational Dashboard)
  const { entries, loading: loadingTimes } = useTimeEntries()
  const { perDiems, loading: loadingPerDiem } = usePerDiem()
  const { bonuses, loading: loadingBonuses } = useHolidayBonus()

  const loading = loadingTimes || loadingPerDiem || loadingBonuses

  const filteredData = useMemo(() => {
    const filterByDate = (dateStr: string) => {
      const d = new Date(dateStr)
      return isWithinInterval(d, { start: dateRange.start, end: dateRange.end })
    }

    return {
      times: entries.filter(e => filterByDate(e.date)),
      perDiems: perDiems.filter(pd => filterByDate(pd.date)),
      bonuses: bonuses.filter(b => filterByDate(b.created_at))
    }
  }, [entries, perDiems, bonuses, dateRange])

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No operational data found for the selected period.')
      return
    }

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
    link.download = `${filename}_${format(dateRange.start, 'yyyy-MM')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const reportTypes = [
    {
      id: 'times',
      title: 'Working Times',
      description: 'Monthly summary of mission durations per employee.',
      icon: FileText,
      color: 'bg-blue-600 text-white shadow-blue-100',
      dataCount: filteredData.times.length,
      onExportCSV: () => downloadCSV(filteredData.times.map(e => ({
        date: e.date,
        employee: e.employee?.full_name,
        start: e.start_time,
        end: e.end_time,
        net_hours: e.net_hours,
        verified: e.is_verified,
        notes: e.notes || ''
      })), 'working_times')
    },
    {
      id: 'per-diem',
      title: 'Per Diem Claims',
      description: 'Travel allowance totals for personnel accounting.',
      icon: TrendingUp,
      color: 'bg-emerald-600 text-white shadow-emerald-100',
      dataCount: filteredData.perDiems.length,
      onExportCSV: () => downloadCSV(filteredData.perDiems.map(pd => ({
        date: pd.date,
        employee_id: pd.employee_id,
        country: pd.country,
        amount: pd.amount,
        status: pd.status,
      })), 'per_diem_claims')
    },
    {
      id: 'bonuses',
      title: 'Holiday Bonuses',
      description: 'Summary of all bonus distributions in the selected period.',
      icon: PieChart,
      color: 'bg-slate-900 text-white shadow-slate-200',
      dataCount: filteredData.bonuses.length,
      onExportCSV: () => downloadCSV(filteredData.bonuses.map(b => ({
        date_paid: b.created_at,
        employee_id: b.employee_id,
        amount: b.amount,
        notes: b.notes || '',
      })), 'holiday_bonuses')
    }
  ]

  if (!isAdmin && !isDispatcher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="h-20 w-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm">
          <BarChart3 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 leading-tight tracking-tight uppercase">Personal Analytics</h2>
          <p className="text-slate-500 font-medium max-w-sm">Personnel can only generate certified year-to-date summaries in PDF format.</p>
        </div>
        <Button className="h-14 rounded-2xl px-10 font-black uppercase tracking-widest text-xs bg-slate-900 hover:bg-black text-white shadow-xl gap-3">
          <Download className="w-4 h-4" /> Download My PDF
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-24">
      {/* Dynamic Header with Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 text-slate-900 leading-none">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
              <FileText className="h-6 w-6" />
            </div>
            Reporting Center
          </h1>
          <p className="text-muted-foreground font-medium max-w-2xl">
            Generate and export high-fidelity organizational data for accounting.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
          <Button
            variant="ghost"
            className={cn("rounded-xl h-10 font-black uppercase tracking-widest text-[10px] px-4", format(dateRange.start, 'M') === format(new Date(), 'M') ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
            onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}
          >
            Current Month
          </Button>
          <Button
            variant="ghost"
            className={cn("rounded-xl h-10 font-black uppercase tracking-widest text-[10px] px-4", format(dateRange.start, 'M') === format(subMonths(new Date(), 1), 'M') ? "bg-white shadow-sm text-blue-600" : "text-slate-400")}
            onClick={() => setDateRange({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })}
          >
            Preview Month
          </Button>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {reportTypes.map(report => (
          <Card key={report.id} className="border-slate-100/60 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-slate-100 transition-all bg-white relative overflow-hidden group border border-solid">
            <CardContent className="p-8 space-y-8">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-solid group-hover:scale-110 transition-transform shadow-lg", report.color)}>
                <report.icon className="w-7 h-7" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{report.title}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{report.dataCount} Entries</span>
                </div>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed h-12 line-clamp-2">{report.description}</p>

                <div className="flex gap-3 pt-6 border-t border-slate-50">
                  <Button className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest" onClick={() => toast.info('PDF export being initialized.')}>
                    <Download className="w-3.5 h-3.5 mr-2" /> PDF
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 text-slate-600" onClick={report.onExportCSV}>
                    <FileText className="w-3.5 h-3.5 mr-2" /> CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Builder Placeholder */}
      <Card className="rounded-[3rem] border-none bg-slate-900 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden p-12 relative flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
          <BarChart3 className="w-64 h-64" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-6">
          <h3 className="text-3xl font-black tracking-tight uppercase">Operational Personnel Audit</h3>
          <p className="text-slate-400 font-medium leading-relaxed italic">
            "Select specific employees, customers, and extended date ranges to build certified mission audits for organizational compliance."
          </p>
        </div>
        <Button className="h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black px-10 shadow-2xl shadow-blue-500/20 uppercase tracking-widest text-xs relative z-10" onClick={() => toast.info('Advanced Audit Builder is being processed.')}>
          Initialize Audit <ArrowRight className="ml-3 w-5 h-5 text-blue-200" />
        </Button>
      </Card>
    </div>
  )
}
