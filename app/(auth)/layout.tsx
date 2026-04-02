'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import SplashScreen from '@/components/auth/SplashScreen'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true)
  const pathname = usePathname()
  const isBlueBg = pathname === '/login'

  useEffect(() => {
    // Check if user already saw the splash in this session
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash')
    if (hasSeenSplash) {
      setShowSplash(false)
    }
  }, [])

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true')
    setShowSplash(false)
  }

  return (
    <div className={`min-h-screen ${isBlueBg ? 'bg-[#0064E0]' : 'bg-white'} flex items-center justify-center relative overflow-hidden`}>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      {/* Background Decor (Subtle train tracks or gradients can go here) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]" />
      </div>

      <main className={`relative z-10 w-full transition-opacity duration-700 ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </main>
    </div>
  )
}
