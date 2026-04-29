'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { CalendarEvent } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface CalendarDayCellProps {
  day: number
  isToday: boolean
  isSelected: boolean
  isOtherMonth?: boolean
  events: CalendarEvent[]
  onClick: () => void
}

export function CalendarDayCell({
  day,
  isToday,
  isSelected,
  isOtherMonth = false,
  events,
  onClick
}: CalendarDayCellProps) {
  const { locale } = useTranslation()
  const hasConflict = events.some((e: any) => e.hasConflict);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "min-h-[100px] md:min-h-[130px] p-2 bg-white border-r border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 flex flex-col group relative",
        isOtherMonth && "bg-gray-50/50 opacity-40",
        isSelected && "bg-blue-50/30 ring-1 ring-inset ring-blue-500/10"
      )}
    >
      {/* Date Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span 
          className={cn(
            "text-xs md:text-sm font-bold w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full transition-all shrink-0",
            isToday ? "bg-[#0064E0] text-white shadow-md animate-in zoom-in" : "text-gray-500",
            isSelected && !isToday && "border-2 border-[#0064E0] text-[#0064E0]"
          )}
        >
          {day}
        </span>
        
        {hasConflict && (
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={locale === 'de' ? 'Terminkonflikt erkannt' : 'Schedule Conflict detected'} />
        )}
      </div>

      {/* Events Pills (Desktop Only / Large Screens) */}
      <div className="flex-1 space-y-1 overflow-hidden hidden md:block">
        {events.slice(0, 3).map((event) => (
          <div 
            key={event.id}
            className="px-2 py-1 rounded-lg text-[10px] font-bold truncate leading-tight border border-black/5 flex items-center gap-1.5 transition-transform active:scale-[0.98]"
            style={{ 
              backgroundColor: `${event.color}15`, 
              color: event.color,
              borderLeftWidth: '3px',
              borderLeftColor: event.color
            }}
          >
            {event.event_type === 'birthday' && '🎂'}
            {event.event_type === 'meeting' && '👥'}
            {event.event_type === 'sick_leave' && '🏥'}
            <span className="truncate">{event.title}</span>
          </div>
        ))}
        {events.length > 3 && (
          <p className="text-[9px] font-black text-gray-400 pl-1">
            + {events.length - 3} more
          </p>
        )}
      </div>

      {/* Blue Dot Indicator (Mobile Only) */}
      <div className="md:hidden flex justify-center mt-auto pb-1">
         {events.length > 0 && (
           <div className="w-1.5 h-1.5 rounded-full bg-[#0064E0]" />
         )}
      </div>
    </div>
  )
}
