'use client'

import React from 'react'
import { ArrowLeft, ChevronRight, BarChart3, TrendingUp, TrendingDown, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TimeAccountOverviewProps {
  onBack: () => void
  onMonthClick: (month: string) => void
  data: MonthlyTimeData[]
  totalBalance: number
  totalOvertimePaid: number
}

export function TimeAccountOverview({ onBack, onMonthClick, data, totalBalance, totalOvertimePaid }: TimeAccountOverviewProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50/40 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:px-8 border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-blue-600" />
          </Button>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Times Account</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Operational Balance & History</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
          <Clock className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
        {/* High-level Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center space-y-2 group hover:border-blue-200 transition-all">
            <h3 className={cn(
              "text-3xl font-black tracking-tighter tabular-nums leading-none",
              totalBalance >= 0 ? "text-emerald-600" : "text-red-500"
            )}>
              {totalBalance > 0 ? `+${totalBalance.toFixed(1)}` : totalBalance.toFixed(1)}
              <span className="text-xs ml-0.5 opacity-60">h</span>
            </h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">HOURS BALANCE</p>
          </div>
          <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center space-y-2 group hover:border-emerald-200 transition-all">
            <h3 className="text-3xl font-black text-emerald-600 tracking-tighter tabular-nums leading-none">
              {totalOvertimePaid.toFixed(1)}
              <span className="text-xs ml-0.5 opacity-60">€</span>
            </h3>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">PER DIEM CREDIT</p>
          </div>
        </div>

        {/* Monthly Performance List */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black text-slate-400 px-1 flex items-center gap-2 uppercase tracking-[0.2em]">
             OPERATIONAL HISTORY
          </h2>
          <div className="space-y-3">
            {data.map((month) => (
              <Card 
                key={month.key}
                onClick={() => onMonthClick(month.key)}
                className="p-5 border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] cursor-pointer bg-white flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-50 group-hover:bg-blue-50 transition-colors">
                    <Calendar className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">
                      {new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      {month.workingDays} Active Shifts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={cn(
                      "text-[11px] font-black tabular-nums tracking-widest px-3 py-1.5 rounded-lg",
                      month.difference >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {month.difference >= 0 ? `+${month.difference.toFixed(1)}H` : `${month.difference.toFixed(1)}H`}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Insight Card */}
        <Card className="p-6 rounded-2xl bg-slate-900 border-none relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <TrendingUp className="w-24 h-24 text-blue-500" />
          </div>
          <div className="relative z-10 space-y-3">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] leading-none">Operational Insight</h4>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-[85%]">
              Maintaining a positive balance across multiple cycles qualifies your profile for specialized missions and quarterly incentives.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
