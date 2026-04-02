// app/dashboard/time-account/[month]/page.tsx
'use client'

import React, { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Calendar, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'
import { useTimeAccount } from '@/hooks/times/useTimeAccount'
import { DailyBreakdownRow } from '@/components/times/DailyBreakdownRow'
import { format, parse, eachDayOfInterval, startOfMonth, endOfMonth, isSameDay } from 'date-fns'

export default function MonthlyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { locale } = useTranslation()
  const monthKey = params.month as string // e.g., '2026-03'
  const { monthlyData, loading } = useTimeAccount()

  // Find the specific data for this month
  const data = useMemo(() => 
    monthlyData.find(m => m.key === monthKey),
  [monthlyData, monthKey])

  const days = useMemo(() => {
    if (!data) return []
    const parsed = parse(monthKey, 'yyyy-MM', new Date())
    const start = startOfMonth(parsed)
    const end = endOfMonth(parsed)
    return eachDayOfInterval({ start, end })
  }, [monthKey, data])

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse px-6 pt-4">
        <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-50 rounded-[3rem]" />
      </div>
    )
  }

  if (!data) {
    return <div className="p-12 text-center text-gray-400 font-bold">Data no longer available</div>
  }

  const monthName = format(parse(monthKey, 'yyyy-MM', new Date()), 'MMMM yyyy')
  const isPositive = data.difference >= 0

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-700 pb-32 overflow-x-hidden">
      {/* Navigation Header */}
      <div className="px-6 pt-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon-lg" 
          onClick={() => router.back()}
          className="rounded-2xl hover:bg-gray-100"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase italic">
          {monthName}
        </h2>
      </div>

      {/* Summary Stats Card */}
      <div className="px-6">
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-2xl shadow-gray-100 space-y-6">
          <div className="grid grid-cols-2 gap-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scheduled</span>
              <p className="text-2xl font-black text-gray-900">{data.scheduledHours.toFixed(1)} hrs</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual</span>
              <p className="text-2xl font-black text-[#0064E0]">{data.actualHours.toFixed(1)} hrs</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variance</span>
              <p className={`text-2xl font-black ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {(data.difference >= 0 ? '+' : '') + data.difference.toFixed(1)} hrs
              </p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</span>
              <div className={`mt-1 h-2 rounded-full w-24 ml-auto overflow-hidden bg-gray-100`}>
                 <div className={`h-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="space-y-4">
        <div className="px-6 flex items-center justify-between">
           <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 italic">
              Daily Distribution <Calendar className="w-3 h-3 opacity-50" />
           </h3>
        </div>
        
        <div className="bg-white border-t border-b border-gray-100 overflow-hidden">
          {days.map(day => {
            // Find entries for this day
            const dailyActual = data.entries
              .filter(e => isSameDay(new Date(e.date), day))
              .reduce((sum, e) => sum + (Number(e.net_hours) || 0), 0)
            
            // Logic for scheduled: standard working day if it was supposed to be one?
            // For now, let's just show actual/scheduled if it's in the data or 0.
            // In a real app, logic would pull from 'plans' hook.
            return (
              <DailyBreakdownRow 
                key={day.toISOString()} 
                date={day} 
                scheduled={8.0} // Fallback example
                actual={dailyActual} 
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
