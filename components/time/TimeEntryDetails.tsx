'use client'

import React from 'react'
import { ArrowLeft, Edit2, Clock, User, MapPin, CheckCircle2, FileText, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
      <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </Button>
        <h1 className="text-lg font-black tracking-tight text-gray-900">Time Details</h1>
        <Button variant="ghost" size="icon" onClick={onEdit} className="rounded-full bg-blue-50">
          <Edit2 className="w-4 h-4 text-blue-600" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Hero Section */}
        <div className="p-8 flex flex-col items-center justify-center space-y-4 bg-gradient-to-b from-white to-gray-50/50">
          <div className="space-y-1 text-center">
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Hours</p>
            <h2 className="text-5xl font-black text-blue-600 tracking-tighter tabular-nums">
              {entry.net_hours ? entry.net_hours.toFixed(1) : '0.0'} hrs
            </h2>
          </div>
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {entry.is_verified ? 'Approved' : 'Pending'}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="px-4 space-y-6">
          <div className="grid grid-cols-1 gap-4">
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
              label="Break" 
              value={`${entry.break_minutes} mins`} 
            />
            <DetailItem 
              icon={<User className="w-5 h-5 text-blue-600" />} 
              label="Customer" 
              value={entry.customer?.name || 'Manual Entry'} 
            />
            <DetailItem 
              icon={<MapPin className="w-5 h-5 text-blue-600" />} 
              label="Location" 
              value={entry.location || 'Not Specified'} 
            />
            {entry.is_verified && (
              <DetailItem 
                icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} 
                label="Approved by" 
                value={entry.verifier?.full_name || 'Administrator'} 
              />
            )}
          </div>

          <div className="h-px bg-gray-100 w-full my-8" />

          {/* Notes Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Notes</h3>
            </div>
            <Card className="p-4 rounded-3xl border-gray-100 bg-gray-50/50 shadow-none">
              <p className="text-sm font-bold text-gray-700 leading-relaxed">
                {entry.notes || 'No additional notes provided for this shift.'}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-3xl bg-white border border-gray-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <span className="text-sm font-black text-gray-900">{value}</span>
    </div>
  )
}
