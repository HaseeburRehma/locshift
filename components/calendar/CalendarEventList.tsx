'use client'

import React from 'react'
import { CalendarEvent } from '@/lib/types'
import { CalendarEventItem } from './CalendarEventItem'
import { useTranslation } from '@/lib/i18n'
import Image from 'next/image'

interface CalendarEventListProps {
  date: Date
  events: CalendarEvent[]
  onEditEvent: (event: CalendarEvent) => void
}

export function CalendarEventList({ date, events, onEditEvent }: CalendarEventListProps) {
  const { locale } = useTranslation()

  const dateHeading = date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight">
          {dateHeading}
        </h3>
        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
          {events.length} {events.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
          <div className="relative w-32 h-32 opacity-20 grayscale">
            <Image src="/Illustration (1).png" alt="No events" fill className="object-contain" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-gray-900">
              {locale === 'de' ? 'Keine Ereignisse' : 'No Events Today'}
            </h4>
            <p className="text-xs text-gray-400 font-medium max-w-[200px] leading-relaxed">
              {locale === 'de' ? 'Genießen Sie Ihren Tag oder fügen Sie ein neues Ereignis hinzu.' : 'Enjoy your day or add a new event using the button above.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
          {events.map((event) => (
            <CalendarEventItem 
              key={event.id} 
              event={event} 
              onClick={() => onEditEvent(event)} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
