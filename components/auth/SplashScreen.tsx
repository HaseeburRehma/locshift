'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = useState(1)

  useEffect(() => {
    const timer1 = setTimeout(() => setState(2), 800)
    const timer2 = setTimeout(() => setState(3), 1600)
    const timer3 = setTimeout(() => {
      onComplete()
    }, 2500)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [onComplete])

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-500 ${state === 1 ? 'bg-white' : 'bg-[#0064E0]'}`}>
      <div className="relative flex items-center justify-center overflow-hidden">
        {state >= 2 && (
          <div className={`transition-all duration-700 ease-in-out transform ${state === 3 ? 'w-[200px]' : 'w-[80px]'} h-[80px] flex items-center`}>
            <Image
              src="/logo-1.png" // Using the white logo provided
              alt="LokShift"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        )}
      </div>
    </div>
  )
}
