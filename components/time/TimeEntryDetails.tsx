'use client'

import React from 'react'
import { ArrowLeft, Edit2, Clock, User, MapPin, CheckCircle2, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TimeEntry } from '@/lib/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface TimeEntryDetailsProps {
  entry: TimeEntry
  onBack: () => void
  onEdit: () => void
}

export function TimeEntryDetails({ entry, onBack, onEdit }: TimeEntryDetailsProps) {
  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-50 transition-all">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </Button>
        <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase italic">Time Details</h1>
        <Button variant="ghost" size="icon" onClick={onEdit} className="rounded-full bg-blue-50 hover:bg-blue-100 transition-all">
          <Edit2 className="w-4 h-4 text-blue-600" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Hero Section */}
        <div className="p-8 md:p-16 flex flex-col items-center justify-center space-y-4 bg-gradient-to-b from-white to-slate-50/30 border-b border-slate-50">
          <div className="space-y-1 text-center">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Operational Duration</p>
            <h2 className="text-6xl md:text-8xl font-black text-blue-600 tracking-tighter tabular-nums leading-none">
              {entry.net_hours ? entry.net_hours.toFixed(1) : '0.0'}
              <span className="text-xl md:text-2xl ml-1 opacity-50">h</span>
            </h2>
          </div>
          <Badge className={cn(
            "px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border-none shadow-sm",
            entry.is_verified ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
          )}>
            {entry.is_verified ? 'Approved & Verified' : 'Pending Verification'}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="px-4 md:px-12 py-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DetailItem 
              icon={<Clock className="w-5 h-5 text-blue-600" />} 
              label="Start Time" 
              value={format(new Date(entry.start_time), 'HH:mm')} 
            />
            <DetailItem 
              icon={<Clock className="w-5 h-5 text-blue-600" />} 
              label="End Time" 
              value={entry.end_time ? format(new Date(entry.end_time), 'HH:mm') : 'Ongoing'} 
            />
            <DetailItem 
              icon={<Clock className="w-5 h-5 text-blue-600" />} 
              label="Break Duration" 
              value={`${entry.break_minutes} mins`} 
            />
            <DetailItem 
              icon={<User className="w-5 h-5 text-blue-600" />} 
              label="Customer / Project" 
              value={entry.customer?.name || entry.plan?.customer?.name || 'Base Operation'} 
            />
            <DetailItem 
              icon={<MapPin className="w-5 h-5 text-blue-600" />} 
              label="Assigned Location" 
              value={
                <div>
                  <span className="block">{entry.location || entry.plan?.location || 'Fleet Default'}</span>
                  {entry.latitude && entry.longitude && (
                    <a 
                      href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 mt-1 font-bold"
                      onClick={e => e.stopPropagation()}
                    >
                      <MapPin className="w-3 h-3" /> Mission Coordinates
                    </a>
                  )}
                </div> as any
              } 
            />
            {entry.is_verified && (
              <DetailItem 
                icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} 
                label="Verified By" 
                value={entry.verifier?.full_name || 'System Auto'} 
              />
            )}
          </div>

          <div className="h-px bg-slate-100 w-full" />

          {/* Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Operational Remarks</h3>
            </div>
            <div className="p-8 rounded-[2rem] border border-slate-100 bg-slate-50/30 text-gray-700 leading-relaxed font-bold italic shadow-inner">
                "{entry.notes || 'No additional notes provided for this shift.'}"
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-gray-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center min-w-[40px]">
          {icon}
        </div>
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-sm font-black text-gray-900 text-right">{value}</div>
    </div>
  )
}
