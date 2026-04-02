'use client'

import React from 'react'
import { CalendarDayCell } from './CalendarDayCell'
import { CalendarEvent } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CalendarGridProps {
  currentDate: Date
  eventsByDate: Record<string, CalendarEvent[]>
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function CalendarGrid({
  currentDate,
  eventsByDate,
  selectedDate,
  onSelectDate
}: CalendarGridProps) {
  const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // Previous month days fill
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => ({
    day: daysInPrevMonth - firstDayOfMonth + i + 1,
    isOther: true,
    monthOffset: -1
  }))

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    isOther: false,
    monthOffset: 0
  }))

  // Next month days fill
  const totalCells = 42 // 6 rows * 7 days
  const remainingCells = totalCells - (prevMonthDays.length + currentMonthDays.length)
  const nextMonthDays = Array.from({ length: remainingCells }, (_, i) => ({
    day: i + 1,
    isOther: true,
    monthOffset: 1
  }))

  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]

  const today = new Date()
  const isToday = (d: number, mOffset: number) => {
    const targetDate = new Date(year, month + mOffset, d)
    return targetDate.toDateString() === today.toDateString()
  }

  const isSelected = (d: number, mOffset: number) => {
    const targetDate = new Date(year, month + mOffset, d)
    return targetDate.toDateString() === selectedDate.toDateString()
  }

  const getEventsForDay = (d: number, mOffset: number) => {
    const targetDate = new Date(year, month + mOffset, d)
    const key = targetDate.toISOString().split('T')[0]
    return eventsByDate[key] || []
  }

  return (
    <div className="w-full bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden animate-in fade-in zoom-in duration-500">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
        {daysOfWeek.map((day) => (
          <div key={day} className="py-4 text-center text-[10px] md:text-sm font-black text-gray-400 tracking-widest uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {allDays.map((dateObj, idx) => {
          const dayEvents = getEventsForDay(dateObj.day, dateObj.monthOffset)
          return (
            <CalendarDayCell 
              key={idx}
              day={dateObj.day}
              isToday={isToday(dateObj.day, dateObj.monthOffset)}
              isSelected={isSelected(dateObj.day, dateObj.monthOffset)}
              isOtherMonth={dateObj.isOther}
              events={dayEvents}
              onClick={() => onSelectDate(new Date(year, month + dateObj.monthOffset, dateObj.day))}
            />
          )
        })}
      </div>
    </div>
  )
}
