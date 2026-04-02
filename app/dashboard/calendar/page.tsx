'use client'

import React, { useState } from 'react'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { CalendarEventList } from '@/components/calendar/CalendarEventList'
import { NewEventSheet } from '@/components/calendar/NewEventSheet'
import { useCalendarEvents } from '@/hooks/calendar/useCalendarEvents'
import { useUser } from '@/lib/user-context'
import { CalendarEvent } from '@/lib/types'
import { Loader2 } from 'lucide-react'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null)

  const { isAdmin, isDispatcher, profile } = useUser()
  const { eventsByDate, isLoading } = useCalendarEvents(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1
  )

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
  }

  const handleNewEvent = () => {
    setEventToEdit(null)
    setIsSheetOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    // Only allow editing manual events, not 'plan' (shift) type which are read-only here
    if (event.id.startsWith('plan-')) return
    
    setEventToEdit(event)
    setIsSheetOpen(true)
  }

  const selectedDateKey = selectedDate.toISOString().split('T')[0]
  const selectedDayEvents = eventsByDate[selectedDateKey] || []

  return (
    <div className="flex flex-col gap-8 pb-20 md:pb-0">
      {/* Header */}
      <CalendarHeader 
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onToday={handleToday}
        onNewEvent={handleNewEvent}
        isAdminOrDispatcher={isAdmin || isDispatcher}
      />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40">
           <Loader2 className="w-12 h-12 text-[#0064E0] animate-spin mb-4" />
           <p className="text-gray-500 font-bold animate-pulse text-lg">
             Synchronizing Calendar...
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Grid */}
          <div className="lg:col-span-8 xl:col-span-9 order-1">
            <CalendarGrid 
              currentDate={currentDate}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              onSelectDate={handleSelectDate}
            />
          </div>

          {/* Event List / Details (Mobile below, Desktop side) */}
          <div className="lg:col-span-4 xl:col-span-3 order-2">
            <CalendarEventList 
              date={selectedDate}
              events={selectedDayEvents}
              onEditEvent={handleEditEvent}
            />
          </div>
        </div>
      )}

      {/* New/Edit Event Form */}
      <NewEventSheet 
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialDate={selectedDate}
        eventToEdit={eventToEdit}
      />
    </div>
  )
}
