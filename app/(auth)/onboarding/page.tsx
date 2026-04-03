'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { WalkthroughCarousel } from '@/components/onboarding/WalkthroughCarousel'
import { PermissionsScreen } from '@/components/onboarding/PermissionsScreen'
import { useUser } from '@/lib/user-context'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, role, isLoading } = useUser()
  const [showPermissions, setShowPermissions] = useState(false)
  const [checking, setChecking] = useState(true)
  // Use a ref for the timeout so we don't need it in deps
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any existing safety timer before setting logic
    if (timerRef.current) clearTimeout(timerRef.current)

    // 1. Wait for User Context to finish initial load
    if (!isLoading) {
      if (!user) {
        // No session at all — middleware should have caught this, but redirect to be safe
        router.replace('/login')
        return
      }

      const isEmployee = role === 'employee' || profile?.role === 'employee'
      const isCompleted = profile?.onboarding_completed === true

      // 2. Bypass to dashboard for non-employees or already-completed employees
      if (isCompleted || !isEmployee) {
        router.replace('/dashboard')
        return
      }

      // 3. Employee who needs onboarding — show the walkthrough
      setChecking(false)
      return
    }

    // 4. Still loading — set a 5s safety timeout to fail gracefully
    timerRef.current = setTimeout(() => {
      console.warn('[Onboarding] Init timeout — falling through.')
      setChecking(false)
    }, 5000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // NOTE: 'checking' intentionally OMITTED from deps — it must not be here.
    // React requires a fixed-size dep array; adding state that this effect sets causes a loop.
  }, [isLoading, user, profile, role, router])

  const handleFinishOnboarding = async () => {
    if (!user) return
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      await supabase
        .from('profiles')
        .update({ onboarding_completed: true } as any)
        .eq('id', user.id)

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
