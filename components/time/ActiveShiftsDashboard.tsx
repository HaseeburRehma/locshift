'use client'

import React, { useState, useEffect } from 'react'
import { Users, Clock, MapPin, Activity, Coffee, Zap, Timer, Play } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useActiveShifts } from '@/hooks/useActiveShifts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function ActiveShiftsDashboard() {
  const { activeShifts, loading } = useActiveShifts()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const calculateDuration = (startTime: string, totalBreakSeconds: number = 0, is_on_break: boolean = false, currentBreakStart?: string) => {
    const start = new Date(startTime).getTime()
    const nowTime = now.getTime()

    let currentBreakSecs = 0
    if (is_on_break && currentBreakStart) {
      const breakStart = new Date(currentBreakStart).getTime()
      currentBreakSecs = Math.floor((nowTime - breakStart) / 1000)
    }

    const elapsedTotal = Math.floor((nowTime - start) / 1000)
    const workingSeconds = Math.max(0, elapsedTotal - (totalBreakSeconds + currentBreakSecs))

    const hrs = Math.floor(workingSeconds / 3600)
    const mins = Math.floor((workingSeconds % 3600) / 60)
    const secs = workingSeconds % 60
    return `${hrs}h ${mins}m ${secs}s`
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-44 animate-pulse rounded-[2rem] bg-slate-50 border border-slate-100" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100/50 shadow-inner">
            <Activity className={cn("w-5 h-5 text-blue-600", activeShifts.length > 0 && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 opacity-60 leading-none mb-1.5">OPERATIONAL HUD</h3>
            <p className="text-xl font-black text-slate-900 leading-none flex items-center gap-2">
              {activeShifts.length} Live Personnel
              {activeShifts.length > 0 && <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />}
            </p>
          </div>
        </div>
      </div>

      {activeShifts.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-[0.5rem] py-20 flex flex-col items-center justify-center text-center bg-slate-50/20 backdrop-blur-sm">
          <Users className="w-12 h-12 text-slate-200 mb-4 opacity-20" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 italic">Deployment Clear — Zero Active Sessions</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-1">
          {activeShifts.map((shift) => (
            <Card key={shift.id} className={cn(
              "group relative border-none rounded-[1.8rem] shadow-[0_4px_24px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgb(0,0,0,0.06)] transition-all duration-500 active:scale-[0.99] overflow-hidden bg-white p-4",
              "ring-1 ring-slate-100 hover:ring-blue-100"
            )}>
              <div className="flex items-center gap-4">
                {/* Avatar Section */}
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12 rounded-xl border border-slate-50 shadow-sm transition-transform group-hover:scale-105 duration-300">
                    <AvatarImage src={shift.employee?.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="bg-slate-50 font-black text-slate-400 text-xs">
                      {shift.employee?.full_name?.substring(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                    shift.is_on_break ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                </div>

                {/* Compact Info Grid: 2 Columns, 2 Rows */}
                <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 items-center min-w-0">
                  {/* Row 1, Col 1: Name */}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm tracking-tight leading-none truncate group-hover:text-blue-600 transition-colors">
                      {shift.employee?.full_name || 'Staff'}
                    </h4>
                  </div>

                  {/* Row 1, Col 2: In Time */}
                  <div className="text-right">
                    <p className="text-[10px] font-black text-blue-600 tabular-nums leading-none flex items-center justify-end gap-1">
                      <span className="text-[8px] text-slate-500 uppercase tracking-tighter">In:</span>
                      {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Row 2, Col 1: Status */}
                  <div className="flex">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-md border leading-none",
                      shift.is_on_break ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    )}>
                      {shift.is_on_break ? 'BREAK' : 'ACTIVE'}
                    </span>
                  </div>

                  {/* Row 2, Col 2: Duration */}
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 tabular-nums leading-none flex items-center justify-end gap-1">
                      <span className="text-[8px] text-slate-500 uppercase tracking-tighter">Dur:</span>
                      {calculateDuration(shift.start_time, shift.total_break_seconds, shift.is_on_break, shift.current_break_start)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Optional Minimal Location (Very Bottom) */}
              {shift.location && (
                <div className="mt-3 flex items-center gap-2 px-1 border-t border-slate-50 pt-3">
                  <MapPin className="w-3 h-3 text-slate-200 group-hover:text-blue-400" />
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tight truncate group-hover:text-slate-500">{shift.location}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
