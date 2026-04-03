'use client'

import React, { useState } from 'react'
import { ArrowLeft, Calendar, Clock, MapPin, FileText, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimeEntryFormData } from '@/lib/types'

interface AddTimeEntryFormProps {
  onBack: () => void
  onSubmit: (data: TimeEntryFormData) => void
  customers: { id: string, name: string }[]
}

export function AddTimeEntryForm({ onBack, onSubmit, customers }: AddTimeEntryFormProps) {
  const [formData, setFormData] = useState<TimeEntryFormData>({
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '16:00',
    breakMinutes: 30,
    customerId: '',
    location: '',
    notes: ''
  })

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </Button>
        <h1 className="text-lg font-black tracking-tight text-gray-900">Add Time Entry</h1>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {/* Date Field */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center transition-all group-focus-within:bg-blue-100">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <Input 
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2 focus:border-blue-500/20"
            />
          </div>
        </div>

        {/* Time Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Start Time</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <Input 
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">End Time</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <Input 
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
              />
            </div>
          </div>
        </div>

        {/* Break Duration */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Break Duration (Minutes)</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <Input 
              type="number"
              value={formData.breakMinutes}
              onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
              placeholder="30 Mins"
              className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
            />
          </div>
        </div>

        {/* Select Customer */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Select Customer</label>
          <Select 
            value={formData.customerId} 
            onValueChange={(val) => setFormData({ ...formData, customerId: val })}
          >
            <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-4 border-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <SelectValue placeholder="Select Customer" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-gray-100">
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Location (Optional)</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <Input 
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter Location"
              className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Notes (Optional)</label>
          <div className="relative group">
            <div className="absolute left-4 top-4 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <Textarea 
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add Notes"
              className="min-h-32 pl-16 pt-6 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0 z-10 pb-32">
        <Button 
          onClick={() => onSubmit(formData)}
          className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-xl shadow-blue-100"
        >
          Submit Time Entry
        </Button>
      </div>
    </div>
  )
}
