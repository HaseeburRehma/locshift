'use client'

import React, { useState, useEffect } from 'react'
import { Users, Clock, MapPin, Search, ChevronRight, Activity, Coffee, PlayCircle, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveShifts } from '@/hooks/useActiveShifts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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

    // Toggle: Return either individual break duration or net work duration
    if (is_on_break) {
       const hrs = Math.floor(currentBreakSecs / 3600)
       const mins = Math.floor((currentBreakSecs % 3600) / 60)
       const secs = currentBreakSecs % 60
       return `${hrs}h ${mins}m ${secs}s`
    }

    const elapsedTotal = Math.floor((nowTime - start) / 1000)
    const workingSeconds = Math.max(0, elapsedTotal - (totalBreakSeconds + currentBreakSecs))
    
    const hrs = Math.floor(workingSeconds / 3600)
    const mins = Math.floor((workingSeconds % 3600) / 60)
    const secs = workingSeconds % 60
    return `${hrs}h ${mins}m ${secs}s`
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-50 border border-slate-100" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100/50">
            <Activity className={cn("w-5 h-5 text-blue-600", activeShifts.length > 0 && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">LIVE OPERATIONS MONITOR</h3>
            <p className="text-xl font-black text-slate-900 leading-none flex items-center gap-2">
               {activeShifts.length} Active Personnel
               {activeShifts.length > 0 && <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />}
            </p>
          </div>
        </div>
      </div>

      {activeShifts.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl py-12 flex flex-col items-center justify-center text-center bg-slate-50/30">
          <Users className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zero Active Missions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeShifts.map((shift) => (
            <Card key={shift.id} className={cn(
              "border rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.99] group overflow-hidden bg-white",
              shift.is_on_break ? "border-amber-200" : "border-slate-200/60 hover:border-blue-200"
            )}>
               <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className={cn(
                          "w-10 h-10 rounded-xl border",
                          shift.is_on_break ? "border-amber-100" : "border-slate-200/40"
                        )}>
                          <AvatarImage src={shift.employee?.avatar_url || ''} />
                          <AvatarFallback className="bg-slate-50 font-black text-slate-400 text-xs uppercase">
                            {shift.employee?.full_name?.substring(0, 2) || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-black text-slate-900 text-sm tracking-tight leading-none mb-1">
                            {shift.employee?.full_name || 'Staff'}
                          </h4>
                          <div className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest leading-none",
                            shift.is_on_break ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          )}>
                             <div className={cn("w-1 h-1 rounded-full animate-pulse", shift.is_on_break ? "bg-amber-500" : "bg-emerald-500")} />
                             {shift.is_on_break ? 'Pause' : 'Active'}
                          </div>
                        </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className={cn(
                    "rounded-xl p-4 flex items-center justify-between border transition-all duration-300 shadow-inner",
                    shift.is_on_break ? "bg-amber-500 border-amber-400 text-white" : "bg-slate-50/50 border-slate-50 text-slate-900"
                  )}>
                    <div className="space-y-1">
                      <p className={cn(
                        "text-[9px] font-black uppercase tracking-wider opacity-60",
                        shift.is_on_break ? "text-white" : "text-slate-400"
                      )}>
                         {shift.is_on_break ? 'CURR. BREAK' : 'WORK TIME'}
                      </p>
                      <p className={cn(
                        "text-xl font-black tabular-nums tracking-tighter leading-none flex items-center gap-2",
                        shift.is_on_break ? "text-white" : "text-blue-600"
                      )}>
                        {calculateDuration(shift.start_time, shift.total_break_seconds, shift.is_on_break, shift.current_break_start)}
                      </p>
                    </div>
                    {shift.is_on_break ? <Coffee className="w-6 h-6 text-white/50 animate-pulse" /> : <Clock className="w-6 h-6 text-blue-200" />}
                  </div>
                  
                  {shift.location && (
                    <div className="flex items-center gap-2 px-1">
                       <MapPin className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">{shift.location}</span>
                    </div>
                  )}
               </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
