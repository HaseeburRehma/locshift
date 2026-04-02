import React from 'react'
import { MonthlyTimeData } from '@/lib/types'
import { ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

interface MonthlyTimeRowProps {
  data: MonthlyTimeData
  onClick?: (data: MonthlyTimeData) => void
}

export function MonthlyTimeRow({ data, onClick }: MonthlyTimeRowProps) {
  const monthName = format(new Date(data.year, data.month - 1), 'MMMM yyyy')
  const diffFormatted = (data.difference >= 0 ? '+' : '') + data.difference.toFixed(1) + ' hrs'
  const isPositive = data.difference >= 0

  return (
    <div 
      onClick={() => onClick && onClick(data)}
      className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex items-center justify-between hover:shadow-xl hover:shadow-gray-100 transition-all active:scale-[0.98] duration-300 group cursor-pointer"
    >
      <div className="space-y-1">
        <p className="font-black text-gray-900 group-hover:text-[#0064E0] transition-colors">
          {monthName}
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
          {data.workingDays} working days
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className={`
          text-lg font-black px-4 py-1.5 rounded-2xl tabular-nums
          ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}
        `}>
          {diffFormatted}
        </span>
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </div>
      </div>
    </div>
  )
}
