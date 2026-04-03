'use client'

import React from 'react'
import { ArrowLeft, Calendar, FileText, ChevronRight, TrendingUp, Clock, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthlyTimeData, TimeEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { format, startOfMonth, eachDayOfInterval, endOfMonth, isSameDay } from 'date-fns'
import { de } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'

interface MonthlyBreakdownProps {
  onBack: () => void
  monthData: MonthlyTimeData
}

export function MonthlyBreakdown({ onBack, monthData }: MonthlyBreakdownProps) {
  const monthStart = startOfMonth(new Date(monthData.year, monthData.month - 1))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  return (
    <div className="flex flex-col h-full bg-slate-50/40 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:px-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </Button>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">
              {format(monthStart, 'MMMM yyyy', { locale: de })}
            </h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed Shift Breakdown</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
           <FileText className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
        {/* Monthly Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatBox label="Scheduled" value={`${monthData.scheduledHours.toFixed(1)}h`} />
          <StatBox label="Actual" value={`${monthData.actualHours.toFixed(1)}h`} />
          <StatBox 
             label="Balance" 
             value={`${monthData.difference >= 0 ? '+' : ''}${monthData.difference.toFixed(1)}h`} 
             color={monthData.difference >= 0 ? 'emerald' : 'red'}
          />
          <StatBox label="Overtime" value="2.0h" />
        </div>

        {/* Daily Breakdown List */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-slate-400 px-1 flex items-center gap-2 uppercase tracking-[0.2em]">
             DAILY PERFORMANCE BREAKDOWN
          </h2>
          <div className="space-y-3">
            {days.map((day) => {
              const entriesForDay = monthData.entries.filter(e => isSameDay(new Date(e.date), day))
              const totalActual = entriesForDay.reduce((sum, e) => sum + (e.net_hours || 0), 0)
              const scheduled = 8.0 
              const diff = totalActual - scheduled
              const hasWorked = totalActual > 0
              const progressProgress = (totalActual / 12) * 100

              return (
                <Card key={day.toISOString()} className="p-5 border border-slate-200/60 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-50">
                          <Calendar className="w-4 h-4 text-slate-400" />
                       </div>
                       <span className="text-sm font-black text-slate-900 tracking-tight">
                         {format(day, 'eeee, d. MMM', { locale: de })}
                       </span>
                    </div>
                    {hasWorked && (
                      <Badge variant="outline" className={cn(
                        "font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-lg border-none",
                        diff >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {diff >= 0 ? `+${diff.toFixed(1)}H` : `${diff.toFixed(1)}H`}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <Progress value={progressProgress} className="h-1.5 rounded-full bg-slate-100" indicatorClassName={hasWorked ? "bg-blue-600" : "bg-slate-200"} />
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                       <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Scheduled: {scheduled.toFixed(1)}h
                       </div>
                       <div className={cn("flex items-center gap-2", hasWorked ? "text-blue-600" : "")}>
                          Actual: {totalActual.toFixed(1)}h
                       </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color = 'blue' }: { label: string, value: string, color?: 'blue' | 'emerald' | 'red' }) {
  const themes = {
    blue: "text-blue-600",
    emerald: "text-emerald-600",
    red: "text-red-500"
  }
  return (
    <div className="p-5 rounded-2xl border border-slate-200/60 bg-white shadow-sm flex flex-col items-center justify-center text-center space-y-1">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
      <h3 className={cn("text-xl font-black tracking-tighter tabular-nums leading-none", themes[color])}>
        {value}
      </h3>
    </div>
  )
}
