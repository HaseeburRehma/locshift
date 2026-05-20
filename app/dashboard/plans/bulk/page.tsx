'use client'

/**
 * Bulk plan creation — closes spec §5.3 "Copy plan to multiple days" and
 * "Assign same plan to multiple employees".
 *
 * Conceptually the form takes a *template* (single time-of-day, customer,
 * location, notes) and fans it out across:
 *   - a date range  (one shift per day in [from..to])
 *   - a set of employees (one shift per employee)
 *
 * The cartesian product becomes the rows we insert in a single call via
 * usePlans.createBulkPlans. We keep the UI deliberately small — every field
 * also exists on the single-plan form, so this page only adds the multi-day
 * and multi-employee toggles on top.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CalendarPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { usePlans } from '@/hooks/plans/usePlans'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { Customer, Profile } from '@/lib/types'

export default function BulkPlansPage() {
  const router = useRouter()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { isAdmin, isDispatcher, profile } = useUser()
  const { createBulkPlans } = usePlans()

  const [employees, setEmployees] = useState<Profile[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [customerId, setCustomerId] = useState<string>('')
  const [fromDate, setFromDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [toDate, setToDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('06:00')
  const [endTime, setEndTime]     = useState('14:00')
  const [location, setLocation]   = useState('')
  const [notes, setNotes]         = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!profile?.organization_id) return
    const supabase = createClient()
    Promise.all([
      supabase.from('profiles').select('*').eq('organization_id', profile.organization_id).eq('role', 'employee').eq('is_active', true),
      supabase.from('customers').select('*').eq('organization_id', profile.organization_id).eq('is_active', true),
    ]).then(([emp, cust]) => {
      if (emp.data) setEmployees(emp.data as Profile[])
      if (cust.data) setCustomers(cust.data as Customer[])
    })
  }, [profile?.organization_id])

  const days = useMemo(() => {
    const start = parseISO(fromDate)
    const end = parseISO(toDate)
    const span = differenceInCalendarDays(end, start)
    if (span < 0) return []
    return Array.from({ length: span + 1 }, (_, i) => addDays(start, i))
  }, [fromDate, toDate])

  const totalPlans = days.length * selectedEmployees.length

  const toggleEmployee = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const selectAllEmployees = () => {
    setSelectedEmployees(prev => prev.length === employees.length ? [] : employees.map(e => e.id))
  }

  const onSubmit = async () => {
    if (selectedEmployees.length === 0) {
      toast.error(L('Bitte mindestens einen Mitarbeiter auswählen.', 'Pick at least one employee.'))
      return
    }
    if (days.length === 0) {
      toast.error(L('Ungültiger Zeitraum.', 'Invalid date range.'))
      return
    }

    setSubmitting(true)
    try {
      // Build one date entry per day, with the chosen times-of-day.
      const dateEntries = days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd')
        return {
          start_time: new Date(`${dateStr}T${startTime}:00`).toISOString(),
          end_time:   new Date(`${dateStr}T${endTime}:00`).toISOString(),
        }
      })

      await createBulkPlans(
        {
          organization_id: profile!.organization_id!,
          customer_id: customerId || null,
          status: 'assigned',
          notes: notes || null,
          location: location || null,
          created_by: profile!.id,
        } as any,
        { dates: dateEntries, employeeIds: selectedEmployees },
      )

      toast.success(L(
        `${totalPlans} Einsätze erstellt`,
        `${totalPlans} plans created`,
      ))
      router.push('/dashboard/plans')
    } catch (err: any) {
      console.error('[Bulk] Failed:', err)
      toast.error(err?.message || L('Massenerstellung fehlgeschlagen', 'Bulk creation failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAdmin && !isDispatcher) {
    return (
      <div className="max-w-md mx-auto py-20 text-center text-sm text-gray-500">
        {L('Nur Admin oder Disponent dürfen Mehrfachpläne anlegen.',
           'Only admins or dispatchers can bulk-create plans.')}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      <Link href="/dashboard/plans" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4" /> {L('Zurück zu Pläne', 'Back to Plans')}
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[#0064E0] to-[#0050B3] flex items-center justify-center shadow-xl shadow-blue-200/60">
          <CalendarPlus className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-[#0064E0] tracking-tight">
            {L('Mehrere Pläne anlegen', 'Bulk create plans')}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            {L('Mitarbeiter und Tage gleichzeitig zuweisen', 'Assign across employees and days at once')}
          </p>
        </div>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Von', 'From')}</Label>
          <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Bis', 'To')}</Label>
          <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Time-of-day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Startzeit', 'Start time')}</Label>
          <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Endzeit', 'End time')}</Label>
          <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>
      </div>

      {/* Customer */}
      <div className="space-y-2">
        <Label className="text-xs font-bold text-gray-500">{L('Kunde (optional)', 'Customer (optional)')}</Label>
        <select
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
          className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50/50 px-3 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/10 outline-none"
        >
          <option value="">{L('— Kein Kunde —', '— No customer —')}</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Location + notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Ort', 'Location')}</Label>
          <Input value={location} onChange={e => setLocation(e.target.value)} placeholder={L('Einsatzort', 'Work location')} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold text-gray-500">{L('Notizen', 'Notes')}</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Employee multi-select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-gray-500">
            {L('Mitarbeiter', 'Employees')} ({selectedEmployees.length}/{employees.length})
          </Label>
          <button
            onClick={selectAllEmployees}
            className="text-xs font-semibold text-[#0064E0] hover:underline"
          >
            {selectedEmployees.length === employees.length
              ? L('Alle abwählen', 'Deselect all')
              : L('Alle auswählen', 'Select all')}
          </button>
        </div>
        <div className="border border-gray-200 rounded-xl p-3 bg-white max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1">
          {employees.length === 0 ? (
            <div className="col-span-2 text-center text-sm text-gray-400 py-8">
              {L('Keine aktiven Mitarbeiter gefunden.', 'No active employees found.')}
            </div>
          ) : employees.map(emp => (
            <label key={emp.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEmployees.includes(emp.id)}
                onChange={() => toggleEmployee(emp.id)}
                className="h-4 w-4 rounded border-gray-300 text-[#0064E0] focus:ring-blue-500/20"
              />
              <span className="text-sm text-gray-700 truncate">{emp.full_name || emp.email}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary + submit */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-blue-50/40 border border-blue-100 rounded-2xl">
        <div className="text-sm">
          <p className="font-bold text-gray-900">
            {L('Vorschau:', 'Preview:')} {totalPlans} {L('Einsätze', 'plans')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {days.length} {L('Tag(e)', 'day(s)')} × {selectedEmployees.length} {L('Mitarbeiter', 'employee(s)')}
          </p>
        </div>
        <Button
          onClick={onSubmit}
          disabled={submitting || totalPlans === 0}
          className="h-12 rounded-xl px-8 font-bold bg-[#0064E0] hover:bg-blue-700 gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
          {L('Pläne erstellen', 'Create plans')}
        </Button>
      </div>
    </div>
  )
}
