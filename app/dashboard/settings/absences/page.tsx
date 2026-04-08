'use client'

import React, { useState } from 'react'
import { ChevronLeft, Calendar as CalendarIcon, Plus, MapPin, Loader2, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/user-context'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AbsencesPage() {
  const router = useRouter()
  const { profile } = useUser()
  const [loading, setLoading] = useState(false)

  // Mock data for initial implementation
  const absences = [
    { id: '1', type: 'Sick Leave', start: '2024-04-10', end: '2024-04-12', status: 'Approved' },
    { id: '2', type: 'Holiday', start: '2024-05-01', end: '2024-05-15', status: 'Pending' }
  ]

  return (
    <div className="bg-[#FAFBFF] md:bg-transparent min-h-screen -mx-4 -mt-8 px-4 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between relative px-2">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-black text-slate-900 absolute left-1/2 -translate-x-1/2">Absences</h1>
        <button className="w-10 h-10 bg-blue-600 shadow-lg shadow-blue-200 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Entitlement</p>
          <p className="text-2xl font-black text-slate-900">30 <span className="text-xs text-slate-400">Days</span></p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Remaining</p>
          <p className="text-2xl font-black text-blue-600">14 <span className="text-xs text-slate-400">Days</span></p>
        </div>
      </div>

      {/* Absence History */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 px-2 opacity-60">Status Overview</h3>
        
        <div className="space-y-3">
          {absences.map((abs) => (
            <Card key={abs.id} className="p-5 rounded-[2rem] border-none shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  abs.type === 'Sick Leave' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                )}>
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{abs.type}</h4>
                  <p className="text-xs font-medium text-slate-400">{abs.start} — {abs.end}</p>
                </div>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                abs.status === 'Approved' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                {abs.status}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 bg-white opacity-10 rounded-full" />
        <h4 className="text-xl font-black mb-2">Planning Leave?</h4>
        <p className="text-blue-100 text-sm font-medium leading-relaxed mb-6">
          Please submit your requests at least 14 days in advance for approval by the dispatcher.
        </p>
        <button className="bg-white text-blue-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Request Now
        </button>
      </div>

    </div>
  )
}
