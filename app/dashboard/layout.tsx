'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { BottomNav } from '@/components/layout/BottomNav'
import { RealtimeConnectionBanner } from '@/lib/realtime/connectionMonitor'
import { useUser } from '@/lib/user-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'
import Image from 'next/image'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAdmin } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && profile) {
      // Synchronize with middleware: Only 'employee' role is forced through onboarding walkthrough.
      // Admins and Dispatchers bypass directly to the Operations Console.
      const isEmployee = profile.role === 'employee'
      const needsOnboarding = profile.onboarding_completed === false && isEmployee
      
      if (needsOnboarding) {
        router.replace('/onboarding')
      }
    } else if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, profile, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-12">
        <div className="relative animate-in fade-in zoom-in duration-1000">
           <div className="flex flex-col items-center gap-6">
              <Image 
                src="/logo-3.png" 
                alt="LokShift" 
                width={200} 
                height={56} 
                className="w-48 h-auto object-contain" 
                priority 
              />
              <span className="text-[12px] font-black uppercase tracking-[0.5em] text-blue-600 opacity-60">Operations Center</span>
           </div>
        </div>
        
        <div className="flex flex-col items-center gap-4 max-w-[280px] text-center">
            <Spinner className="h-6 w-6 text-blue-600" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Syncing Operational Data</p>
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Universal Real-Time Synchronization Enabled</p>
            </div>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {/* Realtime disconnection banner — auto-shows when WebSocket drops */}
      <RealtimeConnectionBanner />

      <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans">
        {/* Sidebar: Desktop Only */}
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Subtle background glow for Ops Center feel */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/20 blur-[120px] pointer-events-none rounded-full" />
          
          {/* Header: All Sizes */}
          <DashboardHeader />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-10 py-8 md:py-12 pb-32 md:pb-12 scroll-smooth">
            <div className="max-w-[1700px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom Nav: Mobile Only */}
        <BottomNav />
      </div>
    </>
  )
}
