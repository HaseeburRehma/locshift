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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary animate-pulse">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <Spinner className="h-6 w-6 text-primary" />
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
