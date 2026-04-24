'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Pencil,
  Map as MapIcon,
  Search,
  Moon,
  Hotel,
  ArrowRight,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/lib/supabase/client'
import type { Plan, ShiftTemplate } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProfiles } from '@/hooks/useProfiles'
import { useCustomers } from '@/hooks/useCustomers'
import { usePlans } from '@/hooks/plans/usePlans'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { toast } from 'sonner'
import { sendNotification } from '@/lib/notifications/service'
import LocationPickerModal from './LocationPickerModal'
import { ShiftTemplatePicker, type TemplatePayload } from './ShiftTemplatePicker'
import { BetriebsstelleSelector } from './BetriebsstelleSelector'

interface PlanFormProps {
  onSuccess?: () => void
  initialPlan?: Plan
}

export function PlanForm({ onSuccess, initialPlan }: PlanFormProps) {
  const isEditing = !!initialPlan
  const router = useRouter()
  const { locale } = useTranslation()
  const { profile: currentUser, isAdmin, isDispatcher } = useUser()
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

  // Phase 2 #11 — overnight stay + hotel
  const [overnightStay, setOvernightStay] = useState<boolean>(initialPlan?.overnight_stay ?? false)
  const [hotelAddress, setHotelAddress] = useState<string>(initialPlan?.hotel_address ?? '')

  // Phase 3 #1 — Start / Destination Betriebsstellen
  const [startLocationId, setStartLocationId] = useState<string | null>(initialPlan?.start_location_id ?? null)
  const [destinationLocationId, setDestinationLocationId] = useState<string | null>(initialPlan?.destination_location_id ?? null)
  // Phase 3 #10 — Gastfahrt (employee travels as passenger)
  const [isGastfahrt, setIsGastfahrt] = useState<boolean>(initialPlan?.is_gastfahrt ?? false)

  // Phase 2 #8 — shift templates
  const applyTemplate = (tpl: ShiftTemplate) => {
    if (tpl.customer_id) setCustomerId(tpl.customer_id)
    setStartTime(tpl.start_time)
    setEndTime(tpl.end_time)
    if (tpl.route) setRoute(tpl.route)
    if (tpl.location) setLocation(tpl.location)
    if (tpl.notes) setNotes(tpl.notes)
    setOvernightStay(tpl.overnight_stay)
    setHotelAddress(tpl.hotel_address ?? '')
    if (tpl.duration_days > 1) {
      // Spread the end date across the template's duration
      const baseEnd = new Date(`${startDate}T${tpl.end_time}:00`)
      baseEnd.setDate(baseEnd.getDate() + (tpl.duration_days - 1))
      setEndDate(baseEnd.toISOString().split('T')[0])
    } else {
      setEndDate(startDate)
    }
    toast.success(locale === 'de' ? `Vorlage „${tpl.name}" übernommen` : `Template "${tpl.name}" applied`)
  }

  const buildTemplatePayload = (): TemplatePayload => {
    // Duration measured in whole calendar days (inclusive).
    const start = new Date(`${startDate}T00:00:00`)
    const end = new Date(`${endDate}T00:00:00`)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1)

    return {
      name: '',                                // filled by the picker dialog
      customer_id: customerId && customerId !== 'null' ? customerId : null,
      start_time: startTime,
      end_time: endTime,
      duration_days: days,
      route: route || null,
      location: location || null,
      overnight_stay: overnightStay,
      hotel_address: hotelAddress || null,
      notes: notes || null,
    }
  }

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

    // Physical Location is optional — see change-request #2 (Rheinmaasrail).
    // The DB column is already nullable; only this form-level check was blocking saves.

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
            overnight_stay: overnightStay,
            hotel_address: hotelAddress || null,
            // Phase 3 #1 + #10
            start_location_id: startLocationId,
            destination_location_id: destinationLocationId,
            is_gastfahrt: isGastfahrt,
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
            title: '📋 Schicht aktualisiert',
            message: `Ihre Schicht ab ${startLabel}${location ? ` (${location})` : ''} wurde aktualisiert.`,
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
              overnight_stay: overnightStay,
              hotel_address: hotelAddress || null,
              // Phase 3 #1 + #10
              start_location_id: startLocationId,
              destination_location_id: destinationLocationId,
              is_gastfahrt: isGastfahrt,
            })

            const startLabel = currentStart.toLocaleString(locale === 'de' ? 'de-DE' : 'en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            })
            await sendNotification({
              userId: empId,
              title: '📋 Neue Schicht zugewiesen',
              message: `Ihnen wurde eine neue Schicht ab ${startLabel}${location ? ` (${location})` : ''} zugewiesen.`,
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
              {/* Shift Template picker (Phase 2 #8) — admin/dispatcher only in create mode */}
              {!isEditing && (isAdmin || isDispatcher) && (
                <ShiftTemplatePicker
                  onApply={applyTemplate}
                  getCurrentPayload={buildTemplatePayload}
                  canSave={true}
                  locale={locale}
                />
              )}

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
                      <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest">
                        {locale === 'en' ? 'Physical Location (optional)' : 'Physischer Standort (optional)'}
                      </Label>
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

              {/* Betriebsstellen + Gastfahrt Section (Phase 3 #1 + #10) ─ */}
              <div className="pt-8 border-t border-slate-50 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">
                    {locale === 'de' ? 'Start- & Zielort' : 'Start & Destination'}
                  </h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">
                    {locale === 'de' ? 'Betriebsstellen · Fahrtart' : 'Operational Locations · Travel Mode'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5">
                  <BetriebsstelleSelector
                    value={startLocationId}
                    onChange={setStartLocationId}
                    kind="start"
                    locale={locale}
                  />
                  <div className="flex items-center justify-center text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                  <BetriebsstelleSelector
                    value={destinationLocationId}
                    onChange={setDestinationLocationId}
                    kind="destination"
                    locale={locale}
                  />
                </div>

                {/* Phase 3 #10 — Gastfahrt toggle */}
                <label className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {locale === 'de' ? 'Gastfahrt' : 'Passenger Travel (Gastfahrt)'}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none mt-0.5">
                        {locale === 'de'
                          ? 'Mitarbeiter reist als Beifahrer (kein aktives Fahren)'
                          : 'Employee travels as passenger (not driving)'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={isGastfahrt} onCheckedChange={setIsGastfahrt} />
                </label>
              </div>

              {/* Overnight Stay Section (Phase 2 #11) ──────────────────── */}
              <div className="pt-8 border-t border-slate-50 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-none">
                    {locale === 'de' ? 'Übernachtung & Spesen' : 'Overnight & Allowance'}
                  </h3>
                  <p className="text-[10px] font-semibold uppercase text-gray-400 tracking-[0.1em] mt-1.5">
                    {locale === 'de' ? 'Auswärtstätigkeit' : 'Away-from-home trip'}
                  </p>
                </div>

                <label className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {locale === 'de' ? 'Übernachtung erforderlich' : 'Requires overnight stay'}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none mt-0.5">
                        {locale === 'de'
                          ? 'Voller Spesensatz (€28) wird automatisch angewendet'
                          : 'Full allowance (€28) auto-applied'}
                      </p>
                    </div>
                  </div>
                  <Switch checked={overnightStay} onCheckedChange={setOvernightStay} />
                </label>

                {overnightStay && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-semibold uppercase text-gray-400 tracking-widest px-1">
                      {locale === 'de' ? 'Hoteladresse' : 'Hotel Address'}
                    </Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center pointer-events-none">
                        <Hotel className="w-4 h-4 text-blue-600" />
                      </div>
                      <Input
                        placeholder={locale === 'de' ? 'Hotel oder Unterkunft' : 'Hotel or lodging'}
                        value={hotelAddress}
                        onChange={(e) => setHotelAddress(e.target.value)}
                        className="h-14 pl-14 rounded-xl border border-slate-100 bg-slate-50/30 font-semibold focus:bg-white transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
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
