'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, Clock, MapPin, FileText, User, Save, Moon, Hotel, CalendarClock, ArrowRight, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { format } from 'date-fns'
import { calculateSpesen, DEFAULT_SPESEN_RATES, spesenTierLabel } from '@/lib/spesen'
import { calculateShiftTimes } from '@/lib/time/shift-hours'
import { BetriebsstelleSelector } from '@/components/shared/BetriebsstelleSelector'
import { useOperationalLocations } from '@/hooks/useOperationalLocations'
import { useTranslation } from '@/lib/i18n'

interface TimeEntryFormProps {
  onBack: () => void
  onSubmit: (data: TimeEntryFormData) => void
  customers: { id: string, name: string }[]
  initialData?: TimeEntry
  /** Phase 2 #11 — org-configured Spesen rates (defaults to German §9 pauschalen). */
  spesenRates?: { partial: number; full: number }
  /** Phase 2 #3 — show planned-entry toggle (hidden for e.g. clock-out flow). */
  allowPlanned?: boolean
  /**
   * Locale override. When omitted, the form reads from the global
   * useTranslation() context so the language toggle in the header
   * actually flips this surface too.
   */
  locale?: 'de' | 'en'
  /**
   * Client CR May 2026 — Admin / dispatcher employee picker.
   * When this prop is supplied (and non-empty), the form renders an
   * employee selector at the top so the admin can record / edit a
   * shift on behalf of any team member. The selected id is passed
   * back via TimeEntryFormData.employeeId.
   *
   * Employees viewing their own form do NOT receive this prop, so the
   * picker stays hidden for them.
   */
  employees?: { id: string; full_name: string }[]
  /** Pre-select an employee (used on edit, where the row already has one). */
  defaultEmployeeId?: string
}

export function TimeEntryForm({
  onBack,
  onSubmit,
  customers,
  initialData,
  spesenRates = DEFAULT_SPESEN_RATES,
  allowPlanned = true,
  locale: localeProp,
  employees,
  defaultEmployeeId,
}: TimeEntryFormProps) {
  // Read from global i18n context so the EN/DE switch in the header
  // actually applies to this form. The optional prop still wins, so
  // any callers that pass `locale` explicitly keep their behaviour.
  const { locale: contextLocale } = useTranslation()
  const locale: 'de' | 'en' = (localeProp ?? contextLocale) as 'de' | 'en'
  const showEmployeePicker = Array.isArray(employees) && employees.length > 0
  const [formData, setFormData] = useState<TimeEntryFormData>({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    startTime: initialData ? format(new Date(initialData.start_time), 'HH:mm') : '08:00',
    endTime: initialData?.end_time ? format(new Date(initialData.end_time), 'HH:mm') : '16:00',
    // Default to 0 minutes — clients reported that 30 was a surprise pre-fill
    // because most shifts they log are short and don't include a break.
    // `??` (not `||`) so a genuine 0 from `initialData` isn't replaced.
    breakMinutes: initialData?.break_minutes ?? 0,
    customerId: initialData?.customer_id || '',
    location: initialData?.location || '',
    notes: initialData?.notes || '',
    overnightStay: initialData?.overnight_stay ?? false,
    hotelAddress: initialData?.hotel_address ?? '',
    isPlanned: initialData?.is_planned ?? false,
    // Phase 3 #1 + #10
    startLocationId: initialData?.start_location_id ?? null,
    destinationLocationId: initialData?.destination_location_id ?? null,
    isGastfahrt: initialData?.is_gastfahrt ?? false,
    // Client CR May 2026 — admin entry for other employees
    employeeId: initialData?.employee_id || defaultEmployeeId || '',
  })

  const isEdit = !!initialData

  // Single source of truth for both Betriebsstellen selectors.
  const { locations: opLocations, loading: opLocationsLoading } = useOperationalLocations()

  // Live Spesen preview — computed from current form values.
  // Overnight-shift fix (May 2026): use calculateShiftTimes so a shift
  // like 23:00 → 06:00 previews 7 hrs instead of 0.
  const spesenPreview = (() => {
    const shift = calculateShiftTimes(
      formData.date,
      formData.startTime,
      formData.endTime,
      formData.breakMinutes ?? 0,
    )
    const amount = calculateSpesen(shift.netHours, !!formData.overnightStay, spesenRates)
    return { netHours: shift.netHours, amount, isOvernight: shift.isOvernight }
  })()

  const t = (de: string, en: string) => (locale === 'de' ? de : en)

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </Button>
        <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase">
          {isEdit ? t('Zeiteintrag bearbeiten', 'Edit Time Entry') : t('Zeiteintrag hinzufügen', 'Add Time Entry')}
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Employee Selector — admin/dispatcher only ────────────── */}
            {showEmployeePicker && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  {t('Mitarbeiter', 'Employee')}
                </label>
                <Select
                  value={formData.employeeId || ''}
                  onValueChange={(val) => setFormData({ ...formData, employeeId: val })}
                >
                  <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-4 border-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600" />
                      </div>
                      <SelectValue placeholder={t('Mitarbeiter auswählen', 'Select employee')} />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 max-h-[320px]">
                    {employees!.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="font-bold py-3">
                        {e.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 ml-1 leading-tight">
                  {t(
                    'Admin: Diese Schicht wird für den ausgewählten Mitarbeiter gespeichert.',
                    'Admin: this shift will be recorded for the selected employee.',
                  )}
                </p>
              </div>
            )}

            {/* Date Field */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Datum', 'Date')}</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center transition-all group-focus-within:bg-blue-100">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <Input 
                    type="date"
                    value={formData.date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                    className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2 focus:border-blue-500/20"
                    />
                </div>
            </div>

            {/* Break Duration */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Pausendauer (Minuten)', 'Break Duration (Minutes)')}</label>
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <Input 
                    type="number"
                    value={formData.breakMinutes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                    placeholder={t('0 Min.', '0 Mins')}
                    className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                    />
                </div>
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Startzeit', 'Start Time')}</label>
                    <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, startTime: e.target.value })}
                        className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                    />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Endzeit', 'End Time')}</label>
                    <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endTime: e.target.value })}
                        className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                    />
                    </div>
                </div>
                {spesenPreview.isOvernight && (
                  <div className="col-span-2 -mt-1">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700 bg-blue-50/70 border border-blue-100 rounded-xl px-3 py-2">
                      <Moon className="w-4 h-4" />
                      {t(
                        `Nachtschicht erkannt — Ende am Folgetag (${spesenPreview.netHours.toFixed(2)} Std.)`,
                        `Overnight shift detected — ends next day (${spesenPreview.netHours.toFixed(2)} hrs)`,
                      )}
                    </div>
                  </div>
                )}
            </div>

            {/* Overnight Stay + Spesen preview — placed directly after the
                time fields because the decision to stay overnight follows
                naturally from "when does the shift end?". Previously this
                lived below Notes/Planned, where employees on shorter
                screens missed it and every Stundenzettel exported as
                "nein". */}
            <div className="md:col-span-2 space-y-4">
              <label className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border-2 border-gray-100 cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">
                      {t('Übernachtung', 'Overnight stay')}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none mt-0.5">
                      {t(
                        `Voller Spesensatz €${spesenRates.full.toFixed(0)}`,
                        `Full allowance €${spesenRates.full.toFixed(0)}`,
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!formData.overnightStay}
                  onCheckedChange={(v) => setFormData({ ...formData, overnightStay: v })}
                />
              </label>

              {formData.overnightStay && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                    {t('Hoteladresse', 'Hotel Address')}
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Hotel className="w-5 h-5 text-blue-600" />
                    </div>
                    <Input
                      value={formData.hotelAddress || ''}
                      onChange={(e) => setFormData({ ...formData, hotelAddress: e.target.value })}
                      placeholder={t('Hotel oder Unterkunft', 'Hotel or lodging')}
                      className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    {t('Spesen (Voransicht)', 'Meal Allowance (preview)')}
                  </p>
                  <p className="text-[11px] font-semibold text-blue-700/80 mt-0.5">
                    {spesenTierLabel(spesenPreview.amount, spesenRates, locale)}
                    {' · '}
                    {spesenPreview.netHours.toFixed(2)} {t('Std.', 'hrs')}
                  </p>
                </div>
                <p className="text-2xl font-black text-blue-700 tabular-nums">
                  €{spesenPreview.amount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Select Customer */}
            <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Kunde auswählen', 'Select Customer')}</label>
            <Select 
                value={formData.customerId} 
                onValueChange={(val) => setFormData({ ...formData, customerId: val })}
            >
                <SelectTrigger className="h-14 rounded-2xl border-gray-100 bg-gray-50/50 font-bold px-4 border-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <SelectValue placeholder={t('Kunde auswählen', 'Select Customer')} />
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
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Standort (optional)', 'Location (Optional)')}</label>
            <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <Input 
                value={formData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, location: e.target.value })}
                placeholder={t('Standort eingeben', 'Enter Location')}
                className="h-14 pl-16 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                />
            </div>
            </div>

            {/* Notes Section - Full Width */}
            <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('Notizen (optional)', 'Notes (Optional)')}</label>
            <div className="relative group">
                <div className="absolute left-4 top-4 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <Textarea
                value={formData.notes || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('Notizen hinzufügen', 'Add Notes')}
                className="min-h-32 pl-16 pt-6 rounded-2xl border-gray-100 bg-gray-50/50 font-bold focus:bg-white transition-all border-2"
                />
            </div>
            </div>

            {/* Planned Entry toggle (Phase 2 #3) ───────────────────── */}
            {allowPlanned && (
              <div className="md:col-span-2">
                <label className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border-2 border-gray-100 cursor-pointer hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <CalendarClock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        {t('Geplante Zeit (in der Zukunft)', 'Planned entry (in the future)')}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none mt-0.5">
                        {t(
                          'Als Voranmeldung speichern — später als tatsächlich markieren',
                          'Store as pre-announcement — mark as actual later',
                        )}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={!!formData.isPlanned}
                    onCheckedChange={(v) => setFormData({ ...formData, isPlanned: v })}
                  />
                </label>
              </div>
            )}

            {/* Betriebsstellen + Gastfahrt (Phase 3 #1 + #10) ───────── */}
            <div className="md:col-span-2 space-y-4 pt-2">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {t('Start- & Zielort', 'Start & Destination')}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mt-1">
                  {t('Betriebsstellen · Fahrtart', 'Operational Locations · Travel Mode')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <BetriebsstelleSelector
                  value={formData.startLocationId ?? null}
                  onChange={(v) => setFormData({ ...formData, startLocationId: v })}
                  kind="start"
                  locale={locale}
                  locations={opLocations}
                  loading={opLocationsLoading}
                  excludeId={formData.destinationLocationId ?? null}
                />
                <div className="flex items-center justify-center text-slate-300">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <BetriebsstelleSelector
                  value={formData.destinationLocationId ?? null}
                  onChange={(v) => setFormData({ ...formData, destinationLocationId: v })}
                  kind="destination"
                  locale={locale}
                  locations={opLocations}
                  loading={opLocationsLoading}
                  excludeId={formData.startLocationId ?? null}
                />
              </div>

              <label className="flex items-center justify-between p-5 rounded-2xl bg-slate-50/50 border-2 border-gray-100 cursor-pointer hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">
                      {t('Gastfahrt', 'Passenger Travel (Gastfahrt)')}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 leading-none mt-0.5">
                      {t(
                        'Mitarbeiter reist als Beifahrer (kein aktives Fahren)',
                        'Employee travels as passenger (not driving)',
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={!!formData.isGastfahrt}
                  onCheckedChange={(v) => setFormData({ ...formData, isGastfahrt: v })}
                />
              </label>
            </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="p-4 md:p-8 bg-white border-t border-gray-100 sticky bottom-0 z-20 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <Button 
          onClick={() => onSubmit(formData)}
          className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-xl shadow-blue-100 gap-3"
        >
          {isEdit ? <Save className="w-5 h-5" /> : null}
          {isEdit ? t('Eintrag aktualisieren', 'Update Entry') : t('Zeiteintrag speichern', 'Submit Time Entry')}
        </Button>
      </div>
    </div>
  )
}
