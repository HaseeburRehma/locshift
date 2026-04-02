// app/dashboard/reports/page.tsx
'use client'

import React, { useState } from 'react'
import { FileText, Download, Filter, Search, BarChart3, PieChart, TrendingUp, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'

import { usePerDiem } from '@/hooks/usePerDiem'
import { useHolidayBonus } from '@/hooks/useHolidayBonus'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useTimeEntries } from '@/hooks/times/useTimeEntries'

export default function ReportsPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { entries, loading: loadingTimes } = useTimeEntries()
  const { perDiems, loading: loadingPerDiem } = usePerDiem()
  const { bonuses, loading: loadingBonuses } = useHolidayBonus()

  const loading = loadingTimes || loadingPerDiem || loadingBonuses

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error(locale === 'en' ? 'No data to export' : 'Keine Daten zum Exportieren')
      return
    }

    // Extract headers from the first object
    const headers = Object.keys(data[0]).join(',')
    
    // Map rows, handling nulls and commas in strings
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
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const reportTypes = [
    { 
      id: 'times', 
      title: locale === 'en' ? 'Working Times' : 'Arbeitszeiten', 
      description: locale === 'en' ? 'Monthly summary of working hours per employee.' : 'Monatliche Zusammenfassung der Arbeitsstunden pro Mitarbeiter.',
      icon: FileText,
      color: 'bg-blue-50 text-[#0064E0] border-blue-100',
      onExportCSV: () => downloadCSV(entries.map(e => ({
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
      title: locale === 'en' ? 'Per Diem' : 'Verpflegungsmehraufwand', 
      description: locale === 'en' ? 'Travel allowance totals for payroll accounting.' : 'Gesamtsummen der Reisekostenerstattung für die Lohnabrechnung.',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      onExportCSV: () => downloadCSV(perDiems.map(pd => ({
        date: pd.date,
        employee_id: pd.employee_id,
        country: pd.country,
        amount: pd.amount,
        status: pd.status,
        departure: pd.departure_time,
        return: pd.return_time
      })), 'per_diem_claims')
    },
    { 
      id: 'bonuses', 
      title: locale === 'en' ? 'Holiday Bonuses' : 'Holiday Bonus', 
      description: locale === 'en' ? 'Summary of all bonus payments in the selected period.' : 'Zusammenfassung aller Bonuszahlungen im ausgewählten Zeitraum.',
      icon: PieChart,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      onExportCSV: () => downloadCSV(bonuses.map(b => ({
        date_paid: b.created_at,
        employee_id: b.employee_id,
        amount: b.amount,
        notes: b.notes || '',
        period_start: b.period_start,
        period_end: b.period_end
      })), 'holiday_bonuses')
    }
  ]

  if (!isAdmin && !isDispatcher) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4 text-center">
          <BarChart3 className="w-16 h-16 text-gray-200" />
          <h2 className="text-xl font-black text-gray-900 leading-tight">Personal Report Summary</h2>
          <p className="text-gray-500 font-medium max-w-sm">View your personal year-to-date summary and performance metrics.</p>
          <Button variant="outline" className="h-12 rounded-2xl px-6 font-bold border-gray-200 gap-2" onClick={() => toast.info('PDF generation is being processed.')}>
            <Download className="w-4 h-4" /> Download My PDF
          </Button>
       </div>
     )
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse px-4 pt-4">
        <div className="h-10 w-64 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-50 rounded-[2.5rem]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            {locale === 'en' ? 'Reporting & Exports' : 'Berichte & Exporte'}
          </h2>
          <p className="text-muted-foreground font-medium text-sm">Generate and export organizational data for accounting.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map(report => (
          <Card key={report.id} className="border-border/50 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all bg-white relative overflow-hidden group border border-solid">
             <CardContent className="p-8 space-y-6">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-solid group-hover:scale-110 transition-transform", report.color)}>
                   <report.icon className="w-7 h-7" />
                </div>
                <div className="space-y-4">
                   <h3 className="text-2xl font-black text-gray-900 tracking-tight">{report.title}</h3>
                   <p className="text-sm font-semibold text-gray-500 leading-relaxed h-12 line-clamp-2">{report.description}</p>
                   
                   <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <Button className="flex-1 h-11 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs ring-0" onClick={() => toast.info('PDF export coming soon')}>
                         <Download className="w-3.5 h-3.5 mr-2" /> PDF
                      </Button>
                      <Button variant="outline" className="flex-1 h-11 rounded-xl border-gray-200 font-bold text-xs ring-0 hover:bg-gray-50" onClick={report.onExportCSV}>
                         <FileText className="w-3.5 h-3.5 mr-2" /> CSV
                      </Button>
                   </div>
                </div>
             </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-none bg-zinc-900 text-white shadow-2xl overflow-hidden p-10 relative">
         <div className="absolute top-0 right-0 p-10 opacity-10">
            <TrendingUp className="w-48 h-48" />
         </div>
         <div className="relative z-10 max-w-2xl space-y-6">
            <h3 className="text-2xl font-black tracking-tight">Custom Report Builder</h3>
            <p className="text-gray-400 font-medium leading-relaxed">
               Select specific employees, customers, and date ranges to build a custom XLS report for your internal audits.
            </p>
            <div className="flex flex-wrap gap-4">
               <Button className="h-14 rounded-2xl bg-[#0064E0] hover:bg-blue-700 text-white font-black px-8" onClick={() => toast.info('Builder is being initialized.')}>
                 Launch Builder <ArrowRight className="ml-2 w-5 h-5" />
               </Button>
               <Button variant="ghost" className="h-14 rounded-2xl text-gray-400 font-bold hover:text-white ring-0">
                 <Calendar className="w-5 h-5 mr-2" /> Set Default Period
               </Button>
            </div>
         </div>
      </Card>
    </div>
  )
}
