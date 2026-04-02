import React from 'react'
import { format } from 'date-fns'

interface DailyBreakdownRowProps {
  date: Date
  scheduled: number
  actual: number
}

export function DailyBreakdownRow({ date, scheduled, actual }: DailyBreakdownRowProps) {
  const diff = actual - scheduled
  const diffFormatted = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' hrs'
  const isPositive = diff >= 0
  const isZero = diff === 0

  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
      <div className="space-y-1">
        <p className="font-black text-gray-900 uppercase tracking-tight">
          {format(date, 'EEE, MMM d')}
        </p>
        <div className="flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Scheduled</span>
            <span className="text-xs font-bold text-gray-700">{scheduled.toFixed(1)} hrs</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Actual</span>
            <span className="text-xs font-bold text-gray-700">{actual.toFixed(1)} hrs</span>
          </div>
        </div>
      </div>

      <div className={`
        text-sm font-black tabular-nums
        ${isZero ? 'text-gray-400' : isPositive ? 'text-emerald-600' : 'text-red-600'}
      `}>
        {isZero ? '0.0 hrs' : diffFormatted}
      </div>
    </div>
  )
}
