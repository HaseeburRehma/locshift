'use client'

import React, { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'

interface PermissionsScreenProps {
  onBack: () => void
  onComplete: () => void
}

export function PermissionsScreen({ onBack, onComplete }: PermissionsScreenProps) {
  const [loading, setLoading] = useState(false)

  const requestPermission = async () => {
    setLoading(true)
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          // Already granted
        } else if (Notification.permission !== 'denied') {
          await Notification.requestPermission()
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      onComplete()
    }
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto items-center animate-in fade-in duration-500 bg-white">
      {/* Header & Progress */}
      <div className="w-full flex items-center justify-between pt-8 px-6">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-[#0064E0] hover:bg-blue-50 rounded-full transition-all"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <div 
              key={idx}
              className={`h-1.5 duration-300 rounded-full ${
                idx === 3 ? 'w-12 bg-[#0064E0]' : 'w-12 bg-gray-100'
              }`}
            />
          ))}
        </div>

        <div className="w-10" />
      </div>

      {/* Illustration Area */}
      <div className="flex-1 flex items-center justify-center w-full px-8">
        <div className="w-full aspect-square relative">
          <Image 
            src="/walkthrough4.png" 
            alt="Push Notifications"
            fill
            className="object-contain animate-in zoom-in-95 duration-500"
          />
        </div>
      </div>

      {/* Text Content */}
      <div className="w-full px-10 pb-16 text-center space-y-4">
        <h2 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
          Stay Informed with Push Notification
        </h2>
        <p className="text-[15px] text-gray-400 leading-relaxed font-medium px-4">
          Lorem ipsum dolor sit amet consectetur. Pharetra justo volutpat tempus sit diam.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full px-8 pb-12 space-y-3">
        <button
          onClick={requestPermission}
          disabled={loading}
          className="w-full h-14 bg-[#0064E0] text-white rounded-xl font-bold text-[16px] hover:bg-[#0050B3] transition-transform active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:opacity-50"
        >
          {loading ? 'Requesting...' : 'Allow Notifications'}
        </button>
        
        <button
          onClick={onComplete}
          className="w-full h-14 bg-white text-[#0064E0] border-2 border-[#EBF2FF] rounded-xl font-bold text-[16px] hover:bg-blue-50 transition-all font-bold"
        >
          Not Now
        </button>
      </div>
    </div>
  )
}
