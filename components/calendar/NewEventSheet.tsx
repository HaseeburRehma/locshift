'use client'

import React, { useState, useEffect } from 'react'
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Check, 
  Trash2, 
  ArrowLeft,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from '@/lib/i18n'
import { CalendarEvent, CalendarEventType, EVENT_COLORS, Profile } from '@/lib/types'
import { useCreateEvent } from '@/hooks/calendar/useCreateEvent'
import { EventTypeSelector } from './EventTypeSelector'
import { useUser } from '@/lib/user-context'
import { ContactPickerGrid } from '@/components/chat/ContactPickerGrid'
import { cn } from '@/lib/utils'
import { sendNotification } from '@/lib/notifications/service'

interface NewEventSheetProps {
  isOpen: boolean
  onClose: () => void
  initialDate?: Date
  eventToEdit?: CalendarEvent | null
}

export function NewEventSheet({ isOpen, onClose, initialDate, eventToEdit }: NewEventSheetProps) {
  const { t, locale } = useTranslation()
  const { user, profile } = useUser()
  const { createEvent, updateEvent, deleteEvent, isSubmitting } = useCreateEvent()
  
  const [step, setStep] = useState<'form' | 'members'>('form')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState<CalendarEventType>('event')
  const [isAllDay, setIsAllDay] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<Profile[]>([])

  // Initialize form when editing or opening
  useEffect(() => {
    if (isOpen) {
      if (eventToEdit) {
        setTitle(eventToEdit.title)
        setDescription(eventToEdit.description || '')
        setLocation(eventToEdit.location || '')
        setEventType(eventToEdit.event_type)
        setIsAllDay(eventToEdit.is_all_day)
        
        // Format dates for input type="datetime-local"
        const start = new Date(eventToEdit.start_time)
        const end = new Date(eventToEdit.end_time)
        setStartTime(new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
        setEndTime(new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
        
        setSelectedMembers(eventToEdit.members?.map(m => m.user) || [])
      } else {
        // New event defaults
        setTitle('')
        setDescription('')
        setLocation('')
        setEventType('event')
        setIsAllDay(false)
        
        const baseDate = initialDate || new Date()
        const start = new Date(baseDate)
        start.setHours(9, 0, 0, 0)
        const end = new Date(baseDate)
        end.setHours(10, 0, 0, 0)
        
        setStartTime(new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
        setEndTime(new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
        setSelectedMembers([])
      }
      setStep('form')
    }
  }, [isOpen, eventToEdit, initialDate])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return

    const data = {
      title,
      description,
      location,
      event_type: eventType,
      is_all_day: isAllDay,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      color: EVENT_COLORS[eventType],
      member_ids: selectedMembers.map(m => m.id)
    }

    let success = false
    if (eventToEdit) {
      success = await updateEvent(eventToEdit.id, data)
    } else {
      const result = await createEvent(data)
      success = !!result

      // Fire notifications to all selected members
      if (result && selectedMembers.length > 0) {
        const startLabel = new Date(startTime).toLocaleString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })
        await Promise.all(selectedMembers.map((member) =>
          sendNotification({
            userId: member.id,
            title: `📅 You've been added to "${title}"`,
            message: `You have been scheduled for an event on ${startLabel}${location ? ` at ${location}` : ''}.`,
            module: 'calendar',
            moduleId: result.id
          })
        ))
      }
    }

    if (success) {
      // Clear form before close
      setTitle('')
      setDescription('')
      setLocation('')
      setEventType('event')
      setSelectedMembers([])
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!eventToEdit) return
    if (confirm('Are you sure you want to delete this event?')) {
      const success = await deleteEvent(eventToEdit.id)
      if (success) onClose()
    }
  }

  const toggleMember = (p: Profile) => {
    setSelectedMembers(prev => 
      prev.find(m => m.id === p.id) 
        ? prev.filter(m => m.id !== p.id)
        : [...prev, p]
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Sheet/Modal */}
      <div className={cn(
        "relative w-full max-w-xl bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl transition-all duration-500 flex flex-col",
        "h-[94vh] md:h-[85vh] overflow-hidden",
        isOpen ? "translate-y-0 scale-100" : "translate-y-full md:scale-95"
      )}>
        
        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0064E0]">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-gray-900">
                  {eventToEdit ? (eventType === 'shift' ? 'Edit Shift' : 'Edit Event') : (eventType === 'shift' ? 'Assign Shift' : 'New Event')}
                </h2>
              </div>
              <button 
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
              
              {/* Type Selector */}
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 pl-1">Event Type</label>
                <EventTypeSelector value={eventType} onChange={setEventType} />
              </div>

              {/* Title / Route Input */}
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 pl-1">
                  {eventType === 'shift' ? 'Route / Plan Name' : 'Title'}
                </label>
                <Input 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={eventType === 'shift' ? 'e.g. Route 42: Berlin Hbf' : 'e.g. Team Meeting, Doctor...'}
                  className="h-14 bg-gray-50 border-gray-100 rounded-2xl px-4 font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none border-none"
                  required
                />
              </div>

              {/* Time Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[13px] font-black uppercase tracking-widest text-gray-400">Time & Date</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">All day</span>
                    <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="relative group">
                     <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500" />
                     <Input 
                        type="datetime-local"
                        value={startTime}
                        onChange={e => setStartTime(e.target.value)}
                        className="h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700"
                     />
                   </div>
                   <div className="relative group">
                     <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500" />
                     <Input 
                        type="datetime-local"
                        value={endTime}
                        onChange={e => setEndTime(e.target.value)}
                        className="h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700"
                     />
                   </div>
                </div>
              </div>

              {/* Location Input */}
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 pl-1">
                   {eventType === 'shift' ? 'Destination / Location' : 'Location'}
                </label>
                <div className="relative group">
                   <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-blue-500" />
                   <Input 
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder={eventType === 'shift' ? 'e.g. Berlin Central Station' : 'Add location...'}
                    className="h-14 pl-12 pr-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-900"
                    required={eventType === 'shift'}
                  />
                </div>
              </div>

              {/* Member Picker Trigger */}
              <div className="space-y-4">
               <div className="flex items-center justify-between px-1">
                   <label className="text-[13px] font-black uppercase tracking-widest text-gray-400">
                      {eventType === 'shift' ? 'Assigned Employee' : 'Members'}
                   </label>
                   <button 
                    type="button"
                    onClick={() => setStep('members')}
                    className="text-xs font-black text-[#0064E0] hover:underline"
                   >
                     {eventType === 'shift' ? '+ Assign Employee' : '+ Add Members'}
                   </button>
                </div>
                
                <div className="flex -space-x-2 overflow-hidden px-1">
                  {selectedMembers.length === 0 ? (
                    <p className="text-xs text-gray-400 font-medium italic">No members assigned.</p>
                  ) : (
                    selectedMembers.map(m => (
                      <div key={m.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-100 overflow-hidden" title={m.full_name || ''}>
                         {m.avatar_url ? (
                           <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center font-bold text-gray-400 text-xs">
                             {m.full_name?.[0].toUpperCase()}
                           </div>
                         )}
                      </div>
                    ))
                  )}
                  {selectedMembers.length > 5 && (
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 ring-2 ring-white text-[10px] font-bold text-gray-500">
                      +{selectedMembers.length - 5}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-widest text-gray-400 pl-1">Description</label>
                <Textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Optional notes or details..."
                  className="min-h-[100px] bg-gray-50 border-none rounded-2xl p-4 font-medium text-gray-700 resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 md:p-8 bg-gray-50/50 border-t border-gray-100 flex items-center gap-4">
              {eventToEdit && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDelete}
                  className="h-14 w-14 rounded-2xl p-0 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all shadow-sm"
                >
                  <Trash2 className="w-6 h-6" />
                </Button>
              )}
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-14 bg-[#0064E0] text-white rounded-[1.25rem] font-black text-lg shadow-lg shadow-blue-500/20 hover:bg-[#0050B3] transition-all disabled:opacity-50 gap-2"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>
                    <Check className="w-6 h-6" />
                    {eventToEdit ? 'Save Changes' : 'Create Event'}
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          /* Members Step */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep('form')}
                  className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-black text-gray-900">Select Members</h2>
              </div>
              <Button variant="ghost" onClick={() => setStep('form')} className="font-bold text-[#0064E0]">
                Done ({selectedMembers.length})
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden">
               <ContactPickerGrid 
                  organizationId={profile?.organization_id || ''}
                  currentUserId={user?.id || ''}
                  onSelect={toggleMember}
                  selectedIds={selectedMembers.map(m => m.id)}
               />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
