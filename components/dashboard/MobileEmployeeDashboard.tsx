'use client'

import React, { useEffect, useState } from 'react'
import { FilterChips } from './FilterChips'
import { createClient } from '@/lib/supabase/client'
import { Search, MapPin, Clock, CalendarDays, Navigation } from 'lucide-react'
import Image from 'next/image'

interface Props {
  user: any
  profile: any
}

export function MobileEmployeeDashboard({ user, profile }: Props) {
  const [todayPlan, setTodayPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchPlan() {
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      try {
        const { data } = await supabase
          .from('plans')
          .select('*')
          .eq('employee_id', user.id)
          .eq('date', today)
          .single()
        setTodayPlan(data)
      } catch (e) {
        console.error('No plan found', e)
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [user, supabase])

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'Employee'

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
        <input 
          type="text" 
          placeholder="search here..." 
          className="w-full h-14 bg-[#EBF2FF] border-none rounded-2xl pl-12 pr-4 outline-none text-[15px] placeholder:text-blue-300 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
        />
      </div>

      {/* Horizontal Chips */}
      <FilterChips />

      {/* Greeting */}
      <div className="pt-2">
        <p className="text-gray-500 text-[15px]">Hallo,</p>
        <h1 className="text-[28px] font-bold text-gray-900 leading-tight">{userName}</h1>
      </div>

      {/* States */}
      <div className="mt-8 flex flex-col items-center justify-center pt-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-4 border-[#0064E0] border-t-transparent animate-spin" />
          </div>
        ) : todayPlan ? (
           todayPlan.status === 'completed' ? (
              // State A - Shift Complete
              <div className="text-center space-y-6 w-full max-w-[280px]">
                <div className="w-full h-48 relative mx-auto flex items-center justify-center">
                  <div className="w-48 h-48 bg-[#EBF2FF] rounded-full absolute -z-10" />
                  <Navigation className="w-24 h-24 text-[#0064E0]" />
                  {/* Pseudo Bicycle graphic area */}
                </div>
                <div className="space-y-2">
                  <h2 className="text-[20px] font-bold text-gray-900 leading-snug">
                    Tagesplan erfolgreich abgeschlossen!
                  </h2>
                  <p className="text-gray-500 font-medium">Schönen Feierabend</p>
                </div>
              </div>
           ) : (
             // State B - Shift Active
             <div className="w-full bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                    <MapPin className="text-orange-500 w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-[17px]">Route: {todayPlan.route || 'Frankfurt → Berlin'}</h3>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" /> 08:00 – 16:00 | 8h
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                   <div className="flex items-center justify-between bg-blue-50/50 px-4 py-3 rounded-xl border border-blue-100/50">
                     <span className="text-sm font-semibold text-gray-600">Status</span>
                     <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#0064E0] bg-white px-3 py-1 rounded-full shadow-sm">
                       <span className="w-1.5 h-1.5 rounded-full bg-[#0064E0] animate-pulse" />
                       Active
                     </span>
                   </div>
                </div>

                <button 
                  onClick={() => window.location.href = '/dashboard/live'}
                  className="w-full h-12 mt-2 bg-gray-50 text-[#0064E0] border border-[#0064E0]/20 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
                >
                  View Details
                </button>
             </div>
           )
        ) : (
          // State C - No Shift Today
          <div className="text-center space-y-6 w-full max-w-[280px]">
            <div className="w-full h-48 relative mx-auto flex items-center justify-center">
              <div className="w-48 h-48 bg-orange-50 rounded-full absolute -z-10" />
              <CalendarDays className="w-24 h-24 text-orange-400" />
              {/* Pseudo Relaxing graphic area */}
            </div>
            <div className="space-y-2 pt-2">
              <h2 className="text-[22px] font-bold text-gray-900 leading-snug">
                Kein Tagesplan
              </h2>
              <p className="text-gray-500 font-medium">Heute haben Sie keinen Einsatz.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
