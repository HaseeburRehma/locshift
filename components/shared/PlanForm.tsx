'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Check, 
  Pencil,
  Map as MapIcon,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import type { Plan } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfiles } from '@/hooks/useProfiles'
import { useCustomers } from '@/hooks/useCustomers'
import { usePlans } from '@/hooks/plans/usePlans'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { sendNotification } from '@/lib/notifications/service'
import LocationPickerModal from './LocationPickerModal'

interface PlanFormProps {
  onSuccess?: () => void
  initialPlan?: Plan
}

export function PlanForm({ onSuccess, initialPlan }: PlanFormProps) {
  const isEditing = !!initialPlan
  const router = useRouter()
  const { locale } = useTranslation()
  const { profile: currentUser } = useUser()
  const { profiles, loading: loadingProfiles } = useProfiles()
  const { customers, loading: loadingCustomers } = useCustomers()
  const { createPlan } = usePlans()

  const [loading, setLoading] = useState(false)

  // Form State — pre-populated from initialPlan when editing
  const [employeeId, setEmployeeId] = useState(initialPlan?.employee_id ?? '')
  const [isBulkEmployees, setIsBulkEmployees] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [repeatDays, setRepeatDays] = useState('0')

  const [customerId, setCustomerId] = useState(initialPlan?.customer_id ?? '')
  const [startDate, setStartDate] = useState(
    initialPlan ? initialPlan.start_time.split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [startTime, setStartTime] = useState(
    initialPlan ? new Date(initialPlan.start_time).toTimeString().slice(0, 5) : '08:00'
  )
  const [endDate, setEndDate] = useState(
    initialPlan ? initialPlan.end_time.split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [endTime, setEndTime] = useState(
    initialPlan ? new Date(initialPlan.end_time).toTimeString().slice(0, 5) : '17:00'
  )
  const [route, setRoute] = useState(initialPlan?.route ?? '')
  const [location, setLocation] = useState(initialPlan?.location ?? '')
  const [notes, setNotes] = useState(initialPlan?.notes ?? '')
  const [isMapOpen, setIsMapOpen] = useState(false)

  const handleLocationSelect = (data: { address: string }) => {
    setLocation(data.address)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.organization_id) return
    
    const isBulk = !isEditing && isBulkEmployees
    const targetEmployees = isBulk ? selectedEmployees : [employeeId]

    if (targetEmployees.length === 0 || !targetEmployees[0]) {
      toast.error(locale === 'en' ? 'Personnel selection is required' : 'Personalwahl ist erforderlich')
      return
    }

    if (!customerId || customerId === 'null') {
      toast.error(locale === 'en' ? 'Customer/Project is required' : 'Kunde/Projekt ist erforderlich')
      return
    }

    if (!route.trim()) {
      toast.error(locale === 'en' ? 'Route designation is required' : 'Routenbezeichnung ist erforderlich')
      return
    }

    if (!location.trim()) {
      toast.error(locale === 'en' ? 'Physical location is required' : 'Physischer Standort ist erforderlich')
      return
    }

    try {
      setLoading(true)

      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString()
      const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString()

      if (new Date(startDateTime) >= new Date(endDateTime)) {
        toast.error(locale === 'en' ? 'End time must be after start time' : 'Die Endzeit muss nach der Startzeit liegen')
        setLoading(false)
        return
      }

      const resolvedCustomerId = customerId
      const repeatCount = (!isEditing && parseInt(repeatDays, 10)) || 0

      if (isEditing && initialPlan) {
        // ── EDIT MODE: direct supabase UPDATE ─────────────────────────────
        const supabase = createClient()
        const { error } = await supabase
          .from('plans')
          .update({
            employee_id: employeeId,
            customer_id: resolvedCustomerId,
            start_time: startDateTime,
            end_time: endDateTime,
            route: route || null,
            location: location || null,
            notes: notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialPlan.id)

        if (error) throw error

        const startLabel = new Date(startDateTime).toLocaleString('en-GB', {
          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })

        // Notify employee if reassigned
        if (employeeId !== initialPlan.employee_id) {
          await sendNotification({
            userId: employeeId,
            title: '📋 Shift Updated',
            message: `Your shift starting ${startLabel}${location ? ` at ${location}` : ''} has been updated.`,
            module: 'plans',
            moduleId: initialPlan.id,
          })
        }

        toast.success(locale === 'en' ? 'Plan updated successfully' : 'Plan erfolgreich aktualisiert')
      } else {
        // ── CREATE MODE (BULK SUPPORT) ────────────────────────────────────
        for (const empId of targetEmployees) {
          for (let d = 0; d <= repeatCount; d++) {
            const currentStart = new Date(startDateTime)
            currentStart.setDate(currentStart.getDate() + d)
            const currentEnd = new Date(endDateTime)
            currentEnd.setDate(currentEnd.getDate() + d)

            const newPlan = await createPlan({
              organization_id: currentUser.organization_id,
              employee_id: empId,
              creator_id: currentUser.id,
              customer_id: resolvedCustomerId,
              start_time: currentStart.toISOString(),
              end_time: currentEnd.toISOString(),
              route: route || null,
              location: location || null,
              notes: notes || null,
              status: 'assigned',
              rejection_reason: null,
            })

            const startLabel = currentStart.toLocaleString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })
            await sendNotification({
              userId: empId,
              title: '📋 New Shift Assigned',
              message: `You have been assigned a new shift starting ${startLabel}${location ? ` at ${location}` : ''}.`,
              module: 'plans',
              moduleId: newPlan?.id,
            })
          }
        }

        const msg = (targetEmployees.length > 1 || repeatCount > 0)
          ? (locale === 'en' ? 'Plans successfully created for multiple dates/employees' : 'Pläne für mehrere Tage/Mitarbeiter erfolgreich erstellt')
          : (locale === 'en' ? 'Plan created successfully' : 'Plan erfolgreich erstellt')
        
        toast.success(msg)
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/dashboard/plans')
      }
    } catch (error: any) {
      toast.error(error.message || (isEditing ? 'Failed to update plan' : 'Failed to create plan'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <Card className="border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 bg-white overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-slate-50">
            {/* Left Column - Core Logistics */}
            <div className="p-10 space-y-12">
              {/* Assignment Section */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Assignment</h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">Personnel & Clients</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Target Employee(s)</Label>
                      {!isEditing && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            checked={isBulkEmployees} 
                            onChange={e => setIsBulkEmployees(e.target.checked)} 
                            className="w-4 h-4 rounded text-[#0064E0] border-gray-200 focus:ring-[#0064E0] transition-all" 
                          />
                          <span className="text-[11px] font-semibold text-gray-500 group-hover:text-gray-900 transition-colors">Assign Multiple</span>
                        </label>
                      )}
                    </div>

                    {!isBulkEmployees ? (
                      <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 hover:shadow-sm transition-all text-sm">
                          <SelectValue placeholder="Identify Personnel" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-semibold py-3 rounded-xl">
                              {p.full_name} <span className="text-[9px] font-medium uppercase opacity-40 ml-2">({p.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/20 p-4 space-y-1">
                        {profiles.map(p => (
                          <label key={p.id} className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-white hover:shadow-sm transition-all cursor-pointer group border border-transparent">
                            <input 
                              type="checkbox" 
                              checked={selectedEmployees.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEmployees(s => [...s, p.id])
                                else setSelectedEmployees(s => s.filter(id => id !== p.id))
                              }}
                              className="w-4 h-4 rounded text-[#0064E0] border-gray-200 focus:ring-[#0064E0]" 
                            />
                            <div>
                              <p className="font-bold text-sm text-gray-900 group-hover:text-[#0064E0] transition-colors">{p.full_name}</p>
                              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">{p.role}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest px-1">Customer / Project</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 hover:shadow-sm transition-all text-sm">
                        <SelectValue placeholder="Optional Client Selection" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-gray-100 shadow-2xl p-2">
                        <SelectItem value="null" className="font-semibold py-3 rounded-xl text-gray-400 italic">No specific client</SelectItem>
                        {customers.map(c => (
                          <SelectItem key={c.id} value={c.id} className="font-semibold py-3 rounded-xl">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Logistics Section */}
              <div className="pt-8 border-t border-slate-50 space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Logistics</h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">Routes & Coordinates</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest px-1">Route Designation</Label>
                    <Input 
                      placeholder="e.g. Frankfurt Main Hub - Night Shift" 
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white focus:shadow-md transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">Physical Location</Label>
                      <button 
                        type="button"
                        onClick={() => setIsMapOpen(true)}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#0064E0] hover:text-blue-800 transition-colors"
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        Pick on Map
                      </button>
                    </div>
                    <div className="relative group">
                      <Input 
                        placeholder="Street Address or GPS Coordinates" 
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="h-14 pr-12 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white transition-all text-sm"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <Search className="w-4 h-4 text-slate-300 group-focus-within:text-[#0064E0] transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Operational Detail */}
            <div className="p-10 space-y-12 bg-white">
              {/* Timeline Section */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Timeline</h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">Operational Window</p>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest pl-1">Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest pl-1">Start Time</Label>
                    <Input 
                      type="time" 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest pl-1">End Date</Label>
                    <Input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest pl-1">End Time</Label>
                    <Input 
                      type="time" 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold px-6 focus:bg-white transition-all text-sm"
                    />
                  </div>
                </div>

                {!isEditing && (
                  <div className="pt-2">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex items-center justify-between group transition-all hover:bg-slate-50">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-900">Repeat Daily</p>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none">Copy to next consecutive days</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input 
                          type="number"
                          min="0"
                          max="30" 
                          value={repeatDays}
                          onChange={(e) => setRepeatDays(e.target.value)}
                          className="w-16 h-10 rounded-lg bg-white border-slate-200 font-bold px-3 text-center text-slate-900 shadow-sm"
                        />
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Days</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="pt-8 border-t border-slate-50 space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">Mission Notes</h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">Operational Directives</p>
                </div>

                <Textarea 
                  placeholder="Detailed deployment instructions, safety protocols, or internal reminders..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[220px] rounded-2xl border-slate-100 bg-slate-50/30 font-semibold p-6 focus:bg-white focus:shadow-md transition-all text-sm leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-10 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              className="h-14 rounded-2xl px-10 font-bold text-gray-400 hover:text-gray-900 hover:bg-white transition-all uppercase tracking-widest text-[10px]"
              onClick={() => router.back()}
            >
              Discard Changes
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-14 px-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-xl shadow-slate-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 gap-3"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>{isEditing ? 'Saving...' : 'Deploying...'}</span>
                </div>
              ) : (
                <>
                  {isEditing ? <Pencil className="w-5 h-5 ml-[-4px]" /> : <Check className="w-6 h-6" />}
                  {isEditing ? 'Save Changes' : 'Create Mission'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      <LocationPickerModal 
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelect={handleLocationSelect}
        initialAddress={location}
      />
    </div>
  )
}
