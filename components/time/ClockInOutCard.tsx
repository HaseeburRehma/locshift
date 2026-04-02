'use client'

import React, { useState, useEffect } from 'react'
import { Play, Square, Clock, MapPin, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useUser } from '@/lib/user-context'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ClockInOutCard() {
  const { activeEntry, clockIn, clockOut, elapsedTime, loading, todayPlans } = useTimeTracking()
  const { profile } = useUser()
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>()

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const activePlan = todayPlans.find(p => p.id === activeEntry?.plan_id)

  if (loading) return (
    <div className="h-48 w-full bg-gray-50 animate-pulse rounded-[2.5rem]" />
  )

  return (
    <Card className={cn(
      "border-none rounded-[3rem] shadow-2xl transition-all duration-700 overflow-hidden relative",
      activeEntry ? "bg-[#0064E0] text-white ring-8 ring-blue-100" : "bg-white text-gray-900 border border-gray-100"
    )}>
      <CardHeader className="p-8 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black uppercase tracking-widest opacity-70">
              {activeEntry ? 'Current Shift' : 'Time Tracking'}
            </CardTitle>
            <p className="text-sm font-bold opacity-60">
              {activeEntry ? (activePlan?.route || 'In Progress') : 'Ready to start?'}
            </p>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
            activeEntry ? "bg-white/20" : "bg-gray-100"
          )}>
            <Clock className={cn("w-6 h-6", activeEntry ? "text-white animate-pulse" : "text-gray-400")} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-8 pt-4 space-y-8">
        <div className="flex flex-col items-center justify-center space-y-2 py-4">
          <span className="text-6xl md:text-7xl font-black tracking-tighter tabular-nums leading-none">
            {formatTime(elapsedTime)}
          </span>
          {activeEntry && (
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-tight">
                {activeEntry.location || activePlan?.location || 'At Work'}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {!activeEntry && todayPlans.length > 0 && (
            <div className="space-y-3 mb-2 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Shifts for Today</p>
              <Select onValueChange={setSelectedPlanId} value={selectedPlanId}>
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50 font-bold text-sm">
                  <SelectValue placeholder="Select shift to start..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-gray-100">
                  {todayPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id} className="font-bold py-3">
                      {plan.route || 'Work Shift'} ({new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </SelectItem>
                  ))}
                  <SelectItem value="none" className="font-bold py-3 text-gray-400">No specific shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!activeEntry ? (
            <Button 
              onClick={() => clockIn(selectedPlanId === 'none' ? undefined : selectedPlanId)}
              className="h-20 w-full rounded-[2rem] bg-[#0064E0] hover:bg-blue-700 text-white text-xl font-black gap-4 shadow-xl shadow-blue-200 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Play className="fill-current w-5 h-5 ml-1" />
              </div>
              START SHIFT
            </Button>
          ) : (
            <Button 
              onClick={() => clockOut()}
              variant="outline"
              className="h-20 w-full rounded-[2rem] bg-white text-red-600 border-none text-xl font-black gap-4 shadow-xl hover:bg-gray-50 transition-all active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Square className="fill-current w-4 h-4" />
              </div>
              STOP SHIFT
            </Button>
          )}
        </div>
        
        {!activeEntry && (
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest cursor-default hover:text-gray-600 transition-colors">
            Tap to record your start time
          </p>
        )}
      </CardContent>
    </Card>
  )
}
