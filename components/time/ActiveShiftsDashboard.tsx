'use client'

import React, { useState, useEffect } from 'react'
import { Users, Clock, MapPin, Search, ChevronRight, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveShifts } from '@/hooks/useActiveShifts'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export function ActiveShiftsDashboard() {
  const { activeShifts, loading } = useActiveShifts()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime).getTime()
    const diff = now.getTime() - start
    const hrs = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${hrs}h ${mins}m ${secs}s`
  }

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Card key={i} className="h-48 animate-pulse rounded-[2rem] bg-gray-50 border-none" />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl">
            <Activity className="w-6 h-6 text-[#0064E0] animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-900 leading-none mb-1 uppercase">Live Operations</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeShifts.length} Employees currently working</p>
          </div>
        </div>
      </div>

      {activeShifts.length === 0 ? (
        <Card className="border-border/50 rounded-[2.5rem] bg-gray-50/50 border-dashed border-2 py-12 flex flex-col items-center justify-center text-center">
          <Users className="w-12 h-12 text-gray-200 mb-4" />
          <h4 className="text-lg font-black text-gray-400 uppercase">No active shifts</h4>
          <p className="text-sm font-medium text-gray-400">All employees are currently offline.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeShifts.map((shift) => (
            <Card key={shift.id} className="border-none rounded-[2rem] shadow-xl shadow-gray-100 hover:shadow-2xl hover:shadow-blue-100 transition-all group active:scale-95 duration-500 overflow-hidden bg-white">
               <CardHeader className="p-6 pb-2">
                 <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-blue-50 text-[#0064E0] border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 animate-pulse">
                      Currently Active
                    </Badge>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                      Started {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                 </div>
               </CardHeader>
               <CardContent className="p-6 pt-2 space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-14 h-14 rounded-2xl shadow-lg shadow-gray-200">
                      <AvatarImage src={shift.employee?.avatar_url || ''} />
                      <AvatarFallback className="bg-gray-100 font-black text-gray-400 uppercase">
                        {shift.employee?.full_name?.substring(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg tracking-tight leading-none mb-1">
                        {shift.employee?.full_name || 'Unnamed Employee'}
                      </h4>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {shift.employee?.role || 'Staff'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase">Elapsed Time</p>
                      <p className="text-xl font-black tabular-nums tracking-tighter text-[#0064E0]">
                        {calculateDuration(shift.start_time)}
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-gray-200" />
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
