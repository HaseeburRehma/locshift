'use client'

import React from 'react'
import { CalendarEventType, EVENT_COLORS } from '@/lib/types'
import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface EventTypeSelectorProps {
  value: CalendarEventType
  onChange: (value: CalendarEventType) => void
}

const TYPES: { label: string; value: CalendarEventType; icon: string }[] = [
  { label: 'Event', value: 'event', icon: '📅' },
  { label: 'Birthday', value: 'birthday', icon: '🎂' },
  { label: 'Meeting', value: 'meeting', icon: '👥' },
  { label: 'Sick Leave', value: 'sick_leave', icon: '🏥' },
  { label: 'Holiday', value: 'holiday', icon: '🌴' },
  { label: 'Shift', value: 'shift', icon: '🕒' },
  { label: 'Other', value: 'other', icon: '📍' },
]

export function EventTypeSelector({ value, onChange }: EventTypeSelectorProps) {
  const current = TYPES.find(t => t.value === value) || TYPES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-14 justify-between px-4 bg-gray-50 border-gray-100 rounded-2xl hover:bg-gray-100 transition-all font-bold group"
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-sm"
              style={{ backgroundColor: `${EVENT_COLORS[value]}15`, color: EVENT_COLORS[value] }}
            >
              {current.icon}
            </div>
            <span className="text-gray-900">{current.label}</span>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] p-2 rounded-2xl shadow-2xl border-gray-100 animate-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2">
        {TYPES.map((type) => (
          <DropdownMenuItem
            key={type.value}
            onClick={() => onChange(type.value)}
            className="flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors focus:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{type.icon}</span>
              <span className="font-bold text-gray-700 text-sm">{type.label}</span>
            </div>
            {value === type.value && (
              <Check className="w-4 h-4 text-[#0064E0]" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
