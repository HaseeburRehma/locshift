'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { WalkthroughCarousel } from '@/components/onboarding/WalkthroughCarousel'
import { PermissionsScreen } from '@/components/onboarding/PermissionsScreen'
import { useUser } from '@/lib/user-context'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, role, isLoading } = useUser()
  const [showPermissions, setShowPermissions] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isLoading && user) {
      // 1. Skip if already completed (DB driven)
      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
        return
      }

      // 2. Skip for non-employees (Admins/Dispatchers)
      if (role !== 'employee') {
        router.replace('/dashboard')
        return
      }
      setChecking(false)
    }
    
    const timer = setTimeout(() => {
      if (isLoading || !user) {
        setChecking(false)
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [router, user, profile, isLoading, role])

  const handleFinishOnboarding = async () => {
    if (!user) return
    
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      // Update Database
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('id', user.id)
      
      // Sync Auth Metadata so Middleware is aware instantly
      await supabase.auth.updateUser({
        data: { onboarding_completed: true }
      })
      
      router.push('/dashboard')
    } catch (err: any) {
      console.error('[Onboarding] Failed to save completion:', err)
      router.push('/dashboard')
    }
  }

  if (checking || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-10 w-10 bg-[#0064E0] rounded-xl opacity-20" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initialising Onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center overflow-x-hidden">
      {!showPermissions ? (
        <WalkthroughCarousel onComplete={() => setShowPermissions(true)} />
      ) : (
        <PermissionsScreen 
          onBack={() => setShowPermissions(false)} 
          onComplete={handleFinishOnboarding} 
        />
      )}
    </div>
  )
}
