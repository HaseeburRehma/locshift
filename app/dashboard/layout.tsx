'use client'

import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { BottomNav } from '@/components/layout/BottomNav'
import { RealtimeConnectionBanner } from '@/lib/realtime/connectionMonitor'
import { useUser } from '@/lib/user-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { Zap } from 'lucide-react'
import Image from 'next/image'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAdmin } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user && profile) {
      const needsOnboarding = profile.onboarding_completed === false && !isAdmin
      if (needsOnboarding) router.replace('/onboarding')
    } else if (!isLoading && !user) {
      router.replace('/login')
    }
  }, [user, profile, isLoading, isAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-8">
        <div className="relative">
          <Image 
            src="/logo-3.png" 
            alt="LokShift" 
            width={180} 
            height={40} 
            className="h-10 w-auto animate-pulse"
          />
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-full animate-bounce" />
        </div>
        <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-500">
          <Spinner className="h-4 w-4 text-blue-600" />
          Initializing Ops Center
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      {/* Realtime disconnection banner — auto-shows when WebSocket drops */}
      <RealtimeConnectionBanner />

      <div className="flex h-screen bg-[#fafafa] overflow-hidden font-sans">
        {/* Sidebar: Desktop Only */}
        <Sidebar />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header: All Sizes */}
          <DashboardHeader />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 pb-32 md:pb-8">
            <div className="max-w-[1600px] mx-auto">
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
