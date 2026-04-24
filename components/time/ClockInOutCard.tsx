'use client'

import React, { useState, useEffect } from 'react'
import { Play, Square, Clock, MapPin, Coffee, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTranslation } from '@/lib/i18n'

interface ClockInOutCardProps {
  className?: string
  compact?: boolean
}

export function ClockInOutCard({ className, compact = false }: ClockInOutCardProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
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
      "relative overflow-hidden transition-all duration-700 rounded-2xl",
      activeEntry 
        ? "bg-[#2563EB] shadow-lg p-4 md:py-4 md:px-6 text-white border-none" 
        : "bg-white border border-slate-100 shadow-sm p-4 md:p-5",
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            activeEntry ? "bg-white/10" : "bg-blue-50 text-blue-600"
          )}>
            <Clock className={cn("w-5 h-5", activeEntry && !activeEntry.is_on_break && "animate-pulse")} />
          </div>
          
          <div className="flex flex-col">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] leading-none opacity-60 mb-1",
              activeEntry ? "text-white" : "text-slate-400"
            )}>
              {activeEntry ? L('Einsatz aktiv', 'Mission Active') : L('Bereit', 'System Ready')}
            </span>
            <div className="flex items-center gap-3">
              <span className={cn(
                "font-bold tracking-tight tabular-nums leading-none text-2xl md:text-3xl italic",
                activeEntry ? "text-white" : "text-blue-600"
              )}>
                {formatTime(isOnBreak ? breakSeconds : elapsedSeconds)}
              </span>
              {activeEntry && (
                <div className="hidden lg:flex flex-col border-l border-white/20 pl-3 py-1">
                   <span className="text-[10px] font-black uppercase tracking-widest leading-none text-white whitespace-nowrap">
                      {activePlan?.route || L('Standardeinsatz', 'Standard Protocol')}
                   </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
           {!activeEntry ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 {todayPlans.length > 0 && !compact && (
                    <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                      <SelectTrigger className="h-10 w-40 rounded-xl border-slate-100 bg-slate-50 font-bold text-[10px] uppercase tracking-wider hidden md:flex">
                        <SelectValue placeholder={L('Einsatz', 'Protocol')} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
                        {todayPlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id} className="font-bold py-2 text-xs">
                            {plan.route || L('Allgemeiner Einsatz', 'General Mission')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 )}
                 <Button 
                    onClick={() => clockIn(selectedPlanId || todayPlans[0]?.id)}
                    className="h-10 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-md flex-1 sm:flex-none"
                 >
                    <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                    {L('Schicht starten', 'Begin Shift')}
                 </Button>
              </div>
           ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                 <Button 
                    onClick={isOnBreak ? endBreak : startBreak}
                    variant="outline"
                    className={cn(
                      "h-10 flex-1 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border-none",
                      isOnBreak 
                        ? "bg-white text-blue-600 hover:bg-slate-50" 
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                 >
                    {isOnBreak ? <Play className="w-3.5 h-3.5 mr-2" /> : <Coffee className="w-3.5 h-3.5 mr-2" />}
                    {isOnBreak ? L('Fortsetzen', 'Resume') : L('Pause', 'Pause')}
                 </Button>
                 <Button
                    onClick={() => clockOut()}
                    className="h-10 flex-1 sm:px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 border-none"
                 >
                    <Square className="w-3.5 h-3.5 mr-2 fill-current" />
                    {L('Beenden', 'End')}
                 </Button>
              </div>
           )}
        </div>
      </div>
    </div>
  )
}
