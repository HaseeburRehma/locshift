'use client'

import React, { useState } from 'react'
import { ChevronLeft, Users, ShieldCheck, CheckSquare, Bell, Navigation } from 'lucide-react'
import Image from 'next/image'

const SLIDES = [
  {
    title: "Manage Your Team Effortlessly",
    subtitle: "Assign shifts, track employees, and keep operations running smoothly — all in one place.",
    icon: Users,
  },
  {
    title: "Secure & Role-Based Access",
    subtitle: "Admin, Dispatcher, and Employee roles keep your data safe and workflows efficient.",
    icon: ShieldCheck,
  },
  {
    title: "Your Shifts, Always Up To Date",
    subtitle: "View your Tagesplan, confirm assignments, and log working times from anywhere.",
    icon: CheckSquare,
  }
]

interface WalkthroughCarouselProps {
  onComplete: () => void
}

export function WalkthroughCarousel({ onComplete }: WalkthroughCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      onComplete()
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const activeSlide = SLIDES[currentSlide]
  const Icon = activeSlide.icon

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto items-center animate-in fade-in duration-500 bg-white">
      {/* Header & Progress */}
      <div className="w-full flex items-center justify-between pt-8 px-6">
        <div className="w-10">
          {currentSlide > 0 && (
            <button 
              onClick={prevSlide}
              className="p-2 -ml-2 text-[#0064E0] hover:bg-blue-50 rounded-full transition-all"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {SLIDES.map((_, idx) => (
            <div 
              key={idx}
              className={`h-1.5 duration-300 rounded-full ${
                idx === currentSlide ? 'w-12 bg-[#0064E0]' : 'w-4 bg-gray-100'
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
            src={`/walkthrough${currentSlide + 1}.png`} 
            alt={`Walkthrough ${currentSlide + 1}`}
            fill
            className="object-contain animate-in zoom-in-95 duration-500"
          />
        </div>
      </div>

      {/* Text Content */}
      <div className="w-full px-10 pb-16 text-center space-y-4">
        <h2 className="text-[26px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {activeSlide.title}
        </h2>
        <p className="text-[15px] text-gray-400 leading-relaxed font-medium px-4">
          Lorem ipsum dolor sit amet consectetur. Pharetra justo volutpat tempus sit diam.
        </p>
      </div>

      {/* Actions */}
      <div className="w-full px-8 pb-12 space-y-3">
        <button
          onClick={nextSlide}
          className="w-full h-14 bg-[#0064E0] text-white rounded-xl font-bold text-[16px] hover:bg-[#0050B3] transition-transform active:scale-[0.98] shadow-lg shadow-blue-500/20"
        >
          {currentSlide === SLIDES.length - 1 ? 'Get Started >' : 'Next >'}
        </button>
        
        <button
          onClick={onComplete}
          className="w-full h-14 bg-white text-[#0064E0] border-2 border-[#EBF2FF] rounded-xl font-bold text-[16px] hover:bg-blue-50 transition-all"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
