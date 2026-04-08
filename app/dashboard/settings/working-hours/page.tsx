'use client'

import React, { useState } from 'react'
import { ChevronLeft, Clock, Timer, Briefcase, Zap, Calendar, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export default function WorkingHoursPage() {
  const router = useRouter()
  const { profile } = useUser()

  const schedule = [
    { day: 'Monday', hours: '08:00 - 17:00', total: '8.0h' },
    { day: 'Tuesday', hours: '08:00 - 17:00', total: '8.0h' },
    { day: 'Wednesday', hours: '08:00 - 17:00', total: '8.0h' },
    { day: 'Thursday', hours: '08:00 - 17:00', total: '8.0h' },
    { day: 'Friday', hours: '08:00 - 16:00', total: '7.5h' },
  ]

  return (
    <div className="bg-[#FAFBFF] md:bg-transparent min-h-screen -mx-4 -mt-8 px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between relative px-2 mb-4">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-slate-900 absolute left-1/2 -translate-x-1/2">Working Hours</h1>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* Main Stats */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 -mr-12 -mt-12 bg-blue-600/20 blur-3xl rounded-full" />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/50">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 opacity-60">PERSONAL CONTRACT</p>
            <h4 className="text-2xl font-black">{profile?.target_hours || 40}h <span className="text-xs text-blue-300">/ Week</span></h4>
          </div>
        </div>
        <div className="flex items-center justify-between pt-6 border-t border-white/10">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Model</p>
             <p className="text-sm font-bold text-slate-100">Full Time 40h</p>
          </div>
          <div className="text-right space-y-1">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
             <p className="text-sm font-bold text-emerald-400">Current Plan</p>
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Standard Schedule</h3>
        <div className="bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          {schedule.map((item, index) => (
            <div key={item.day} className={cn(
              "flex items-center justify-between p-6 transition-colors active:bg-slate-50",
              index !== schedule.length - 1 && "border-b border-slate-50"
            )}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                   <h5 className="font-bold text-slate-900 text-sm leading-none mb-1.5">{item.day}</h5>
                   <p className="text-xs font-medium text-slate-400">{item.hours}</p>
                </div>
              </div>
              <div className="bg-slate-50 px-3 py-1.5 rounded-xl">
                 <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{item.total}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Break Info */}
      <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-800 leading-tight">Standard break duration is 45 minutes for shifts exceeding 6 hours.</p>
        </div>
      </div>

    </div>
  )
}
