'use client'

import React, { useState, useEffect } from 'react'
import { Play, Square, Clock, MapPin, Coffee, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ClockInOutCardProps {
  className?: string
  compact?: boolean
}

export function ClockInOutCard({ className, compact = false }: ClockInOutCardProps) {
  const { 
    activeEntry, 
    clockIn, 
    startBreak,
    endBreak,
    clockOut, 
    elapsedSeconds, 
    breakSeconds,
    loading, 
    todayPlans 
  } = useTimeTracking()
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>()

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const activePlan = todayPlans.find(p => p.id === activeEntry?.plan_id)

  if (loading) return (
    <div className="w-full bg-slate-50 animate-pulse h-16 rounded-2xl" />
  )

  const isWorking = activeEntry && !activeEntry.is_on_break
  const isOnBreak = activeEntry && activeEntry.is_on_break

  return (
    <div className={cn(
      "relative overflow-hidden transition-all duration-500",
      "border border-slate-200/60 bg-white shadow-sm rounded-2xl p-4 md:px-8",
      activeEntry && (isOnBreak ? "bg-amber-500 border-amber-400 shadow-xl shadow-amber-200/50" : "bg-blue-600 border-blue-500 shadow-xl shadow-blue-200/50"),
      className
    )}>
      {/* Real-time Indicator Dot */}
      {activeEntry && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
           <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOnBreak ? "bg-amber-100" : "bg-emerald-300")} />
           <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none">LIVE SYNC</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Status indicator & Time */}
        <div className="flex items-center gap-5">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
            activeEntry ? "bg-white/20" : "bg-blue-50 text-blue-600"
          )}>
            {isOnBreak ? <Coffee className="w-6 h-6 animate-pulse" /> : <Clock className={cn("w-6 h-6", isWorking && "animate-pulse")} />}
          </div>
          
          <div className="flex flex-col gap-1">
            <span className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] leading-none opacity-80",
              activeEntry ? "text-white" : "text-slate-400"
            )}>
              {isOnBreak ? 'Pause session active' : (isWorking ? 'Current mission mission' : 'Operations Ready')}
            </span>
            <div className="flex items-baseline gap-3">
              <span className={cn(
                "font-black tracking-tighter tabular-nums leading-none text-2xl md:text-4xl",
                activeEntry ? "text-white" : "text-slate-900"
              )}>
                {formatTime(isOnBreak ? breakSeconds : elapsedSeconds)}
              </span>
              {activeEntry && (
                <div className="flex flex-col">
                   <span className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-none mb-1">
                      {activePlan?.route || 'Standard Protocol'}
                   </span>
                   <span className="text-[8px] font-black text-white/40 uppercase tracking-tighter flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Synchronized
                   </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
           {!activeEntry ? (
              <div className="flex flex-1 md:flex-none items-center gap-2">
                 {todayPlans.length > 0 && (
                    <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                      <SelectTrigger className="h-11 w-48 rounded-xl border-slate-100 bg-slate-50 font-bold text-[11px] uppercase tracking-wider hidden md:flex">
                        <SelectValue placeholder="Daily Assignment" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                        {todayPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id} className="font-bold py-2">
                            {plan.route || 'Mission Protocol'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 )}
                 <Button 
                    onClick={() => clockIn(selectedPlanId)}
                    className="h-12 flex-1 md:flex-none px-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest transition-all active:scale-95 shadow-md shadow-blue-100"
                 >
                    <Play className="w-4 h-4 mr-2" />
                    Begin Shift
                 </Button>
              </div>
           ) : (
              <div className="flex flex-1 md:flex-none items-center gap-2">
                 <Button 
                    onClick={isOnBreak ? endBreak : startBreak}
                    className={cn(
                      "h-12 flex-1 md:px-8 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all shadow-sm",
                      isOnBreak ? "bg-white text-amber-600 hover:bg-slate-50" : "bg-white/20 text-white hover:bg-white/30"
                    )}
                 >
                    {isOnBreak ? <Play className="w-4 h-4 mr-2" /> : <Coffee className="w-4 h-4 mr-2" />}
                    {isOnBreak ? 'Resume' : 'Pause'}
                 </Button>
                 <Button 
                    onClick={() => clockOut()}
                    className="h-12 flex-1 md:px-8 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[11px] tracking-widest transition-all shadow-md active:scale-95"
                 >
                    <Square className="w-4 h-4 mr-2" />
                    End
                 </Button>
              </div>
           )}
        </div>
      </div>
    </div>
  )
}
