// app/dashboard/live/page.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { Profile, Plan } from '@/lib/types'
import { Upload, Navigation, MapPin, Clock, AlertCircle } from 'lucide-react'
import { UploadBottomSheet } from '@/components/live/UploadBottomSheet'

export default function LiveShiftPage() {
  const { user } = useUser()
  const supabase = createClient()
  const [currentShift, setCurrentShift] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUploadOpen, setIsUploadOpen] = useState(false)

  useEffect(() => {
    async function fetchShift() {
      if (!user) return
      
      const today = new Date().toISOString().split('T')[0]
      try {
        const { data } = await supabase
          .from('plans')
          .select('*')
          .eq('employee_id', user.id)
          .eq('start_time', today)
          .single()
          
        setCurrentShift(data as Plan)
      } catch (err) {
        console.error('No shift found', err)
      } finally {
        setLoading(false)
      }
    }
    fetchShift()

    if (user) {
      // Subscribe to real-time changes
      const channel = supabase
        .channel('live-shift')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'plans',
            filter: `employee_id=eq.${user?.id}`,
          },
          (payload: any) => {
            console.log('Realtime shift update', payload)
            if (payload.new) {
               const newShift = payload.new as Plan
               const today = new Date().toISOString().split('T')[0]
               if (newShift.start_time?.startsWith(today)) {
                  setCurrentShift(newShift)
               }
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user, supabase])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-8 h-8 border-4 border-[#0064E0] border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium italic">Fetching your live mission...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">Live Mission</h2>
            <p className="text-muted-foreground font-medium">Real-time shift management.</p>
         </div>
         {currentShift && (
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-900 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Upload className="w-5 h-5" />
            </button>
         )}
      </div>

      {!currentShift ? (
        <div className="text-center space-y-4 pt-10 px-4">
          <p className="text-[17px] text-gray-500 font-medium leading-relaxed mb-8">
            No shift is scheduled for you yet. Check again later.
          </p>
          
          <div className="relative w-full aspect-[322/214] max-w-[322px] mx-auto animate-in fade-in zoom-in duration-700">
            <img 
              src="/assets/illustrations/illustration 1.png" 
              alt="No shift scheduled"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as any).src = 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Sun%20with%20Face.png'
              }}
            />
          </div>
        </div>
      ) : (
        <div className="w-full bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[24px] p-6 space-y-6">
           <div className="flex gap-4 border-b border-gray-100 pb-5">
             <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
               <Navigation className="text-orange-500 w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-gray-900 text-[18px] leading-tight mb-1">
                 Route: {currentShift.route || 'Frankfurt → Berlin'}
               </h3>
               <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                 <Clock className="w-3.5 h-3.5" /> 
                 {new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(currentShift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </p>
             </div>
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-medium text-gray-500">Status</span>
                <span className="flex items-center gap-1.5 font-bold text-[#0064E0] bg-blue-50 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0064E0] animate-pulse" />
                  {currentShift.status === 'confirmed' ? 'Confirmed' : (currentShift.status as string)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="font-medium text-gray-500">Location</span>
                <span className="font-semibold text-gray-900 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {currentShift.location || 'Gleis 7, Frankfurt Hbf'}
                </span>
              </div>
           </div>

           <div className="flex gap-3 pt-4 border-t border-gray-100">
             <button className="flex-1 py-3.5 bg-[#0064E0] text-white rounded-xl text-[14px] font-semibold hover:bg-[#0050B3] transition-colors shadow-sm">
               Mark Complete
             </button>
             <button className="flex-1 py-3.5 bg-red-50 text-red-600 rounded-xl text-[14px] font-semibold hover:bg-red-100 transition-colors">
               Report Issue
             </button>
           </div>
        </div>
      )}

      <UploadBottomSheet 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        shiftId={currentShift?.id as string}
      />
    </div>
  )
}
