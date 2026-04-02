'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, FileText, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfiles } from '@/hooks/useProfiles'
import { useCustomers } from '@/hooks/useCustomers'
import { usePlans } from '@/hooks/plans/usePlans'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { sendNotification } from '@/lib/notifications/service'

export function PlanForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter()
  const { locale } = useTranslation()
  const { profile: currentUser } = useUser()
  const { profiles, loading: loadingProfiles } = useProfiles()
  const { customers, loading: loadingCustomers } = useCustomers()
  const { createPlan } = usePlans()

  const [loading, setLoading] = useState(false)
  
  // Form State
  const [employeeId, setEmployeeId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('08:00')
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [endTime, setEndTime] = useState('17:00')
  const [route, setRoute] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.organization_id) return
    if (!employeeId) {
      toast.error(locale === 'en' ? 'Please select an employee' : 'Bitte wählen Sie einen Mitarbeiter aus')
      return
    }

    try {
      setLoading(true)
      
      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString()

      // Simple validation
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        toast.error(locale === 'en' ? 'End time must be after start time' : 'Die Endzeit muss nach der Startzeit liegen')
        setLoading(false)
        return
      }

      const newPlan = await createPlan({
        organization_id: currentUser.organization_id,
        employee_id: employeeId,
        creator_id: currentUser.id,
        customer_id: (customerId === 'null' || !customerId) ? null : customerId,
        start_time: startDateTime,
        end_time: endDateTime,
        route: route || null,
        location: location || null,
        notes: notes || null,
        status: 'assigned',
        rejection_reason: null
      })

      // Fire notification to assigned employee
      const assignedEmployee = profiles.find(p => p.id === employeeId)
      const startLabel = new Date(startDateTime).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      })
      await sendNotification({
        userId: employeeId,
        title: '📋 New Shift Assigned',
        message: `You have been assigned a new shift starting ${startLabel}${location ? ` at ${location}` : ''}.`,
        module: 'plans',
        moduleId: newPlan?.id
      })

      toast.success(locale === 'en' ? 'Plan created successfully' : 'Plan erfolgreich erstellt')
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <Card className="border-none rounded-[3rem] shadow-2xl bg-white overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-x divide-gray-100">
            {/* Left Column: Context (Assignment & Logistics) */}
            <div className="p-10 space-y-12">
              {/* Assignment Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                    <Users className="w-6 h-6 text-[#0064E0]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none">Assignment</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Personnel & Clients</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Target Employee</Label>
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-6 focus:ring-[#0064E0]/10 transition-all shadow-sm">
                        <SelectValue placeholder="Identify Personnel" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                            {p.full_name} <span className="text-xs opacity-50 ml-2">({p.role})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest pl-1">Customer / Project</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-6 shadow-sm">
                        <SelectValue placeholder="Optional Client Selection" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                        <SelectItem value="null" className="font-bold py-3 text-gray-400 italic">No specific client</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Logistics Section */}
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100">
                    <MapPin className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none">Logistics</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Routes & Coordinates</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Route Designation</Label>
                    <Input 
                      placeholder="e.g. Frankfurt Main Hub - Night Shift" 
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black px-6 focus:ring-orange-500/10 transition-all border-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Physical Location</Label>
                    <Input 
                      placeholder="Specific Terminal or Street Address" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-black px-6 border-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Execution (Timeline & Notes) */}
            <div className="p-10 space-y-12 bg-gray-50/30">
              {/* Timeline Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <Clock className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none">Timeline</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Window</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-white font-black px-6 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Start Time</Label>
                    <Input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-white font-black px-6 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">End Date</Label>
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-white font-black px-6 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">End Time</Label>
                    <Input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-14 rounded-2xl border-none bg-white font-black px-6 shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-100">
                    <FileText className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 leading-none">Mission Notes</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Operational Directives</p>
                  </div>
                </div>

                <Textarea 
                  placeholder="Detailed deployment instructions, safety protocols, or internal reminders..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[180px] rounded-[2rem] border-none bg-white font-black p-6 focus:ring-purple-500/10 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Master Footer Action Bar */}
          <div className="p-10 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <Button 
              type="button" 
              variant="ghost" 
              className="h-14 rounded-2xl px-10 font-black text-gray-400 hover:text-gray-900 hover:bg-white"
              onClick={() => router.back()}
            >
              Discard Changes
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="h-14 px-20 rounded-2xl bg-gray-900 hover:bg-black text-white font-bold text-lg shadow-2xl transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 gap-3"
            >
              {loading ? (
                <>Deploying...</>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Create
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
