import React from 'react'
import { TimeEntry } from '@/lib/types'
import { StatusBadge } from './StatusBadge'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'

interface TimeEntryCardProps {
  entry: TimeEntry
  onClick?: (entry: TimeEntry) => void
}

export function TimeEntryCard({ entry, onClick }: TimeEntryCardProps) {
  const status = entry.is_verified ? 'approved' : 'pending'
  const netHoursFormatted = parseFloat((entry.net_hours || 0).toString()).toFixed(1)

  return (
    <div 
      onClick={() => onClick && onClick(entry)}
      className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl shadow-gray-50 flex items-center justify-between hover:shadow-2xl hover:shadow-blue-50 transition-all active:scale-[0.98] duration-300 group cursor-pointer"
    >
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-xl font-black text-gray-900 group-hover:text-[#0064E0] transition-colors">
            {format(new Date(entry.date), 'EEE, MMM d, yyyy')}
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</span>
            <span className="text-md font-bold text-gray-900">
              {format(new Date(entry.start_time), 'HH:mm')}
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time</span>
            <span className="text-md font-bold text-gray-900">
              {format(new Date(entry.end_time), 'HH:mm')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Hours</span>
            <span className="text-xl font-black text-[#0064E0] tracking-tighter tabular-nums">
              {netHoursFormatted} hrs
            </span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</span>
            <span className="text-md font-bold text-gray-900 truncate">
              {entry.customer?.name || '---'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="ml-6 w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300">
        <ChevronRight className="w-6 h-6 text-gray-300" />
      </div>
    </div>
  )
}
