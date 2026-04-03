'use client'

import React from 'react'
import { ChevronRight, Calendar, Clock, User, Filter, Plus, ArrowRight, Navigation as NavIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TimeEntry, UserRole } from '@/lib/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface TimesListProps {
  entries: TimeEntry[]
  userRole?: UserRole
  onEntryClick: (id: string) => void
  onAddClick: () => void
}

export function TimesList({ entries, userRole, onEntryClick, onAddClick }: TimesListProps) {
  const canAdd = userRole === 'admin' || userRole === 'dispatcher'

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.date
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {} as Record<string, TimeEntry[]>)

  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col h-full bg-slate-50/40 md:bg-transparent">
      {/* Header Area */}
      <div className="flex flex-col gap-4 p-4 md:p-0 md:mb-8 bg-white md:bg-transparent border-b border-slate-100 md:border-none sticky top-0 md:relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-none">Times Explorer</h1>
              <p className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Shift logs & Operational History</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="icon" className="rounded-xl bg-white shadow-sm border border-slate-200/60 md:h-11 md:w-11">
                <Filter className="w-4 h-4 text-slate-500" />
             </Button>
             {canAdd && (
                <Button 
                  onClick={onAddClick}
                  className="hidden md:flex h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[11px] tracking-widest px-6 gap-2 shadow-md shadow-blue-100"
                >
                  <Plus className="w-4 h-4" />
                  Manual Entry
                </Button>
             )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:mt-4">
          <Badge variant="secondary" className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer whitespace-nowrap">
            All Logs
          </Badge>
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 hover:bg-slate-50 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer whitespace-nowrap">
            Pending Approval
          </Badge>
          <Badge variant="outline" className="bg-white border-slate-200 text-slate-400 hover:bg-slate-50 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer whitespace-nowrap">
            Verified
          </Badge>
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-0 space-y-10 pb-32">
        {sortedDates.map((date) => (
          <div key={date} className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 {format(new Date(date), 'eeee, d. MMMM', { locale: de })}
              </h3>
              <div className="h-px flex-1 bg-slate-100/60 mx-4 hidden md:block" />
              <Badge variant="outline" className="bg-slate-50 text-slate-400 border-none text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                {groupedEntries[date].length} {groupedEntries[date].length === 1 ? 'Entry' : 'Entries'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedEntries[date].map((entry) => (
                <Card 
                  key={entry.id}
                  onClick={() => onEntryClick(entry.id)}
                  className="p-5 border border-slate-200/60 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98] cursor-pointer bg-white group relative"
                >
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                          <Clock className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Operational Window</p>
                          <p className="text-base font-black text-slate-900 tracking-tight">
                            {format(new Date(entry.start_time), 'HH:mm')} — {entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Active'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[20px] font-black text-blue-600 tracking-tighter tabular-nums leading-none">
                          {entry.net_hours ? entry.net_hours.toFixed(1) : '0.0'}
                          <span className="text-[10px] ml-0.5 opacity-60">h</span>
                        </p>
                      </div>
                    </div>

                    <div className="h-px bg-slate-50 w-full" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-50">
                          <NavIcon className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-xs font-bold text-slate-600 truncate max-w-[120px]">
                          {entry.customer?.name || 'Base Mission'}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "font-black text-[9px] uppercase tracking-[0.2em] px-3 py-1 rounded-lg border-none",
                        entry.is_verified ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                      )}>
                        {entry.is_verified ? 'Verified' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
        
        {sortedDates.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center opacity-30 text-slate-400">
            <Clock className="w-16 h-16 mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Zero activity logs</p>
          </div>
        )}
      </div>

      {/* Floating Action Button (Mobile Only) */}
      {canAdd && (
        <Button 
          onClick={onAddClick}
          className="md:hidden fixed bottom-24 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-200 z-20 flex items-center justify-center p-0 scale-100 active:scale-90 transition-transform"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </Button>
      )}
    </div>
  )
}
