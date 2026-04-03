'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, FileText, Check, ChevronLeft, Pencil } from 'lucide-react'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser?.organization_id) return
    
    const isBulk = !isEditing && isBulkEmployees
    const targetEmployees = isBulk ? selectedEmployees : [employeeId]
    
    if (targetEmployees.length === 0 || !targetEmployees[0]) {
      toast.error(locale === 'en' ? 'Please select an employee' : 'Bitte wählen Sie einen Mitarbeiter aus')
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

      const resolvedCustomerId = (customerId === 'null' || !customerId) ? null : customerId
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pl-1">
                      <Label className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Target Employee(s)</Label>
                      {!isEditing && (
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-500">
                          <input type="checkbox" checked={isBulkEmployees} onChange={e => setIsBulkEmployees(e.target.checked)} className="rounded text-[#0064E0] border-gray-200 focus:ring-[#0064E0]" />
                          Assign Multiple
                        </label>
                      )}
                    </div>

                    {!isBulkEmployees ? (
                      <Select value={employeeId} onValueChange={setEmployeeId}>
                        <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-6 focus:ring-[#0064E0]/10 transition-all shadow-sm">
                          <SelectValue placeholder="Identify Personnel" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-gray-100 shadow-xl max-h-64">
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id} className="font-bold py-3">
                              {p.full_name} <span className="text-xs opacity-50 ml-2">({p.role})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="max-h-56 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
                        {profiles.map(p => (
                          <label key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-gray-100 shadow-sm">
                            <input 
                              type="checkbox" 
                              checked={selectedEmployees.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedEmployees(s => [...s, p.id])
                                else setSelectedEmployees(s => s.filter(id => id !== p.id))
                              }}
                              className="rounded w-4 h-4 text-[#0064E0] border-gray-200 focus:ring-[#0064E0]" 
                            />
                            <div>
                              <p className="font-bold text-sm text-gray-900 leading-none">{p.full_name}</p>
                              <p className="text-[10px] font-black uppercase tracking-tight text-gray-400 mt-0.5">{p.role}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
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

                {!isEditing && (
                  <div className="pt-2">
                    <div className="bg-white/50 border border-emerald-100/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold text-emerald-900">Repeat Daily</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60">Copy to next consecutive days</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          min="0"
                          max="30" 
                          value={repeatDays}
                          onChange={(e) => setRepeatDays(e.target.value)}
                          className="w-20 h-10 rounded-xl bg-white border-emerald-100 font-bold px-3 text-center"
                        />
                        <span className="text-xs font-bold text-emerald-600/80">Days</span>
                      </div>
                    </div>
                  </div>
                )}
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
                <>{isEditing ? 'Saving...' : 'Deploying...'}</>
              ) : (
                <>
                  {isEditing ? <Pencil className="w-5 h-5" /> : <Check className="w-6 h-6" />}
                  {isEditing ? 'Save Changes' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
