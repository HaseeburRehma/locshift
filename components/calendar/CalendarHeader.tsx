'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/i18n'

interface CalendarHeaderProps {
  currentDate: Date
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onNewEvent: () => void
  isAdminOrDispatcher: boolean
}

export function CalendarHeader({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onNewEvent,
  isAdminOrDispatcher
}: CalendarHeaderProps) {
  const { t, locale } = useTranslation()

  const monthYear = currentDate.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 capitalize">
          {monthYear}
        </h2>
        <div className="flex items-center bg-gray-100 rounded-2xl p-1 shadow-inner">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onPrevMonth}
            className="h-8 w-8 rounded-xl hover:bg-white transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToday}
            className="h-8 px-3 rounded-xl font-bold text-xs hover:bg-white transition-all mx-1"
          >
            Today
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNextMonth}
            className="h-8 w-8 rounded-xl hover:bg-white transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-11 rounded-xl px-4 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 md:flex hidden gap-2"
        >
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        
        {isAdminOrDispatcher && (
          <Button 
            onClick={onNewEvent}
            className="h-11 rounded-xl px-6 bg-[#0064E0] text-white font-bold shadow-lg shadow-blue-500/20 hover:bg-[#0050B3] transition-all gap-2"
          >
            <Plus className="w-5 h-5" />
            {locale === 'de' ? 'Ereignis hinzufügen' : 'New Event'}
          </Button>
        )}
      </div>
    </div>
  )
}
