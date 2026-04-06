'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  format,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
  isSameDay,
  isWeekend,
} from 'date-fns'

interface MonthlyBreakdownProps {
  onBack: () => void
  monthData: MonthlyTimeData
}

export function MonthlyBreakdown({ onBack, monthData }: MonthlyBreakdownProps) {
  const monthStart = startOfMonth(new Date(monthData.year, monthData.month - 1))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const monthLabel = format(monthStart, 'MMMM yyyy')

  // Paid overtime = sum of hours > 8 per worked day
  const paidOvertimeHours = days.reduce((sum, day) => {
    const entries = monthData.entries.filter(e =>
      isSameDay(new Date(e.date), day)
    )
    const actual = entries.reduce((s, e) => s + (e.net_hours || 0), 0)
    return sum + (actual > 8 ? actual - 8 : 0)
  }, 0)

  return (
    <div className="flex flex-col min-h-full bg-white animate-in fade-in slide-in-from-right duration-300">

      {/* ── iOS-style centred navigation header ── */}
      <div className="relative flex items-center justify-center px-4 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-4 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-90 transition-all text-blue-600 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
          {monthLabel}
        </h1>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 md:px-10 pt-8 pb-32 space-y-10">

        {/* ── Summary stats — plain rows with dividers ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 divide-y md:divide-y-0 divide-slate-100 px-2">
          <div className="divide-y divide-slate-100">
            <StatRow label="Scheduled Hours" value={`${monthData.scheduledHours.toFixed(1)} hrs`} />
            <StatRow label="Actual Hours"    value={`${monthData.actualHours.toFixed(1)} hrs`} />
          </div>
          <div className="divide-y divide-slate-100">
            <StatRow
              label="Difference"
              value={
                monthData.difference >= 0
                  ? `+${monthData.difference.toFixed(1)} hrs`
                  : `${monthData.difference.toFixed(1)} hrs`
              }
              valueColor={monthData.difference >= 0 ? 'emerald' : 'red'}
            />
            <StatRow label="Paid Overtime" value={`${paidOvertimeHours.toFixed(1)} hrs`} />
          </div>
        </div>

        {/* ── Daily Breakdown heading ── */}
        <div className="flex items-center justify-between px-2">
            <h2 className="text-[24px] md:text-[32px] font-black text-slate-900 tracking-tight">
            Daily Breakdown
            </h2>
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden md:block">
                Chronological Operational Log
            </div>
        </div>

        {/* ── Day cards ── */}
        <div className="space-y-3.5">
          {days.map((day) => {
            const entriesForDay = monthData.entries.filter(e =>
              isSameDay(new Date(e.date), day)
            )
            const totalActual = entriesForDay.reduce(
              (s, e) => s + (e.net_hours || 0),
              0
            )
            const scheduled = isWeekend(day) ? 0 : 8.0
            const diff = totalActual - scheduled
            const dayLabel = format(day, 'EEE, MMM d')

            // Diff display
            let diffText = '0 hrs'
            let diffColor = 'text-slate-400'
            if (diff > 0) {
              diffText = `+${diff.toFixed(1)} hrs`
              diffColor = 'text-emerald-500'
            } else if (diff < 0) {
              diffText = `${diff.toFixed(1)} hrs`
              diffColor = 'text-red-500'
            }

            return (
              <div
                key={day.toISOString()}
                className="bg-[#F2F4F8] rounded-[24px] overflow-hidden border border-slate-100/50 shadow-sm"
              >
                {/* Day header row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-[16px] font-bold text-slate-900 tracking-tight">
                    {dayLabel}
                  </span>
                  <span className={cn('text-[14px] font-black tabular-nums tracking-tight', diffColor)}>
                    {diffText}
                  </span>
                </div>

                {/* Scheduled + Actual sub-rows */}
                <div className="grid grid-cols-1 divide-y divide-slate-200/40 border-t border-slate-200/40">
                  <div className="flex items-center justify-between px-5 py-3 bg-white/60">
                    <span className="text-[14px] font-medium text-slate-500">Scheduled</span>
                    <span className="text-[14px] font-bold text-slate-800 tabular-nums">
                      {scheduled.toFixed(1)} hrs
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3 bg-white/60">
                    <span className="text-[14px] font-medium text-slate-500">Actual</span>
                    <span className="text-[14px] font-bold text-slate-800 tabular-nums">
                      {totalActual.toFixed(1)} hrs
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

/* ── stat row helper ── */
function StatRow({
  label,
  value,
  valueColor = 'default',
}: {
  label: string
  value: string
  valueColor?: 'emerald' | 'red' | 'default'
}) {
  const colorMap = {
    emerald: 'text-emerald-500',
    red: 'text-red-500',
    default: 'text-slate-900',
  }
  return (
    <div className="flex items-center justify-between py-3.5">
      <span className="text-[15px] text-slate-500">{label}</span>
      <span className={cn('text-[15px] font-semibold tabular-nums', colorMap[valueColor])}>
        {value}
      </span>
    </div>
  )
}
