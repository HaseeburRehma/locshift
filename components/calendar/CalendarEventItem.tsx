'use client'

import React from 'react'
import { CalendarEvent, EVENT_COLORS } from '@/lib/types'
import { MapPin, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalendarEventItemProps {
  event: CalendarEvent
  onClick: () => void
}

export function CalendarEventItem({ event, onClick }: CalendarEventItemProps) {
  const isShift = event.event_type === 'shift'

  const startTime = new Date(event.start_time).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })
  
  const endTime = new Date(event.end_time).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  })

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group flex items-center justify-between p-4 rounded-[1.25rem] border transition-all cursor-pointer hover:shadow-md active:scale-[0.99]",
        "border-transparent"
      )}
      style={{ 
        backgroundColor: `${event.color}08`, // Very light background
        borderLeft: `5px solid ${event.color}`
      }}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <div 
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border border-black/5"
          style={{ backgroundColor: `${event.color}15`, color: event.color }}
        >
          {event.event_type === 'birthday' && '🎂'}
          {event.event_type === 'meeting' && '👥'}
          {event.event_type === 'sick_leave' && '🏥'}
          {event.event_type === 'shift' && <Clock className="w-5 h-5" />}
          {(['event', 'holiday', 'other'].includes(event.event_type)) && '📅'}
        </div>

        <div className="flex flex-col gap-0.5 overflow-hidden">
          <h4 className="font-bold text-gray-900 truncate leading-tight">
            {event.title}
          </h4>
          {event.location && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        {event.is_all_day ? (
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
            All day
          </span>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-gray-900 leading-none">
              {startTime}
            </span>
            <span className="text-[10px] font-bold text-gray-400 mt-1">
              – {endTime}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
