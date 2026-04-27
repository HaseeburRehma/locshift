'use client'

import React, { useState, useEffect } from 'react'
import { TimesList } from '@/components/time/TimesList'
import { TimeEntryForm } from '@/components/time/TimeEntryForm'
import { TimeEntryDetails } from '@/components/time/TimeEntryDetails'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useProfiles } from '@/hooks/useProfiles'

import { updateTimeEntryStatus } from '@/app/actions/time-entries'
import { calculateSpesen, DEFAULT_SPESEN_RATES } from '@/lib/spesen'
// Phase 5 #4/#5/#6 — PDF export from the Time Tracking section itself.
import { exportWorkingTimePdf, slugify } from '@/lib/pdf/exportPdf'
import { format } from 'date-fns'

export default function TimesPage() {
  const [view, setView] = useState<'list' | 'add' | 'details' | 'edit'>('list')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])
  const [fetching, setFetching] = useState(true)
  
  const { user, profile, isAdmin, isDispatcher } = useUser()
  const { clockIn, clockOut } = useTimeTracking()
  const { profiles: employeeProfiles } = useProfiles()
  const supabase = createClient()

  const canAddManually = isAdmin || isDispatcher

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!profile?.organization_id || !user) return
    const newStatus = !currentStatus

    // Optimistic UI update
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_verified: newStatus } : e))

    const result = await updateTimeEntryStatus(id, newStatus, newStatus ? user.id : null)

    if (!result.success) {
      console.error('Update status failed:', result.error)
      toast.error('Statusaktualisierung fehlgeschlagen')
      // Revert on failure
      fetchData()
    } else {
      toast.success(newStatus ? 'Zeiteintrag genehmigt' : 'Zeiteintrag auf ausstehend gesetzt')
    }
  }

  // Phase 6 #4 — admin/dispatcher hard-delete with confirm dialog.
  // Optimistic removal + reload on failure. RLS already restricts DELETE
  // to admin/dispatcher (see 20260424120000_security_baseline.sql).
  const handleDelete = async (entry: TimeEntry) => {
    if (!profile?.organization_id) return
    const confirmed = window.confirm(
      `Diesen Zeiteintrag wirklich löschen?\n\n${entry.date} · ${entry.employee?.full_name ?? 'Mitarbeiter'} · ${entry.net_hours?.toFixed?.(2) ?? '0.00'}h`,
    )
    if (!confirmed) return

    const previous = entries
    setEntries(prev => prev.filter(e => e.id !== entry.id))

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entry.id)

    if (error) {
      console.error('[times] delete failed', error)
      toast.error(error.message || 'Eintrag konnte nicht gelöscht werden')
      setEntries(previous) // rollback
      return
    }
    toast.success('Zeiteintrag gelöscht')
  }

  // Phase 2 #3 — promote a planned entry to an actual (worked) one.
  const handleConvertPlanned = async (id: string) => {
    if (!profile?.organization_id) return
    // Optimistic local flip
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_planned: false } : e))
    const { error } = await supabase
      .from('time_entries')
      .update({ is_planned: false })
      .eq('id', id)
    if (error) {
      console.error('[times] convert planned failed', error)
      toast.error('Konnte nicht als tatsächlich markiert werden')
      fetchData()
      return
    }
    toast.success('Als tatsächliche Zeit markiert')
  }

  const fetchData = async () => {
    if (!user || !profile?.organization_id) return
    setFetching(true)
    
    // Fetch entries (Phase 3: include joined Betriebsstellen)
    const { data: entriesData, error: entriesError } = await supabase
      .from('time_entries')
      .select('*, employee:profiles!employee_id(id, full_name, avatar_url, role), customer:customers(id, name), verifier:profiles!verified_by(id, full_name), plan:plans(location, customer:customers(id, name)), start_location:operational_locations!start_location_id(id, name, short_code, type), destination_location:operational_locations!destination_location_id(id, name, short_code, type)')
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })

    // Filter by employee if not admin/dispatcher
    const filteredEntries = (isAdmin || isDispatcher)
      ? entriesData 
      : (entriesData?.filter((e: TimeEntry) => e.employee_id === user.id) || [])

    if (entriesError) toast.error('Zeiteinträge konnten nicht geladen werden')
    else setEntries(filteredEntries || [])

    // Fetch customers
    const { data: customersData } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)

    setCustomers(customersData || [])
    setFetching(false)
  }

  useEffect(() => {
    fetchData()
  }, [user, profile, isAdmin, isDispatcher])

  const handleAddSubmit = async (data: TimeEntryFormData) => {
    if (!user || !profile?.organization_id) return

    // Phase 2 #3 — employees may submit planned (future) entries for
    // themselves. Actual-time entries remain admin/dispatcher only
    // (live clock-in/out handles the employee actual-time flow).
    if (!canAddManually && !data.isPlanned) {
      toast.error('Nur Admins können tatsächliche Zeiten manuell eintragen. Nutzen Sie den „Geplante Zeit"-Schalter, um eine Voranmeldung zu speichern.')
      return
    }

    const startDateTime = `${data.date}T${data.startTime}:00`
    const endDateTime = `${data.date}T${data.endTime}:00`

    const start = new Date(startDateTime).getTime()
    const end = new Date(endDateTime).getTime()
    const netHours = Math.max(0, (end - start) / (1000 * 60 * 60) - (data.breakMinutes / 60))

    // Phase 2 #11 — compute Spesen from org rates (falls back to German defaults).
    const mealAllowance = calculateSpesen(netHours, !!data.overnightStay, {
      partial: (profile as any)?.organization?.spesen_rate_partial ?? DEFAULT_SPESEN_RATES.partial,
      full: (profile as any)?.organization?.spesen_rate_full ?? DEFAULT_SPESEN_RATES.full,
    })

    const { error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: user.id,
        date: data.date,
        start_time: startDateTime,
        end_time: endDateTime,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        net_hours: Number(netHours.toFixed(2)),
        overnight_stay: !!data.overnightStay,
        hotel_address: data.hotelAddress || null,
        meal_allowance: Number(mealAllowance.toFixed(2)),
        is_planned: !!data.isPlanned,
        // Phase 3 #1 + #10
        start_location_id: data.startLocationId ?? null,
        destination_location_id: data.destinationLocationId ?? null,
        is_gastfahrt: !!data.isGastfahrt,
      })

    if (error) {
      toast.error('Eintrag konnte nicht erstellt werden')
      return
    }

    toast.success(data.isPlanned ? 'Geplante Zeit gespeichert' : 'Zeiteintrag erstellt')
    setView('list')
    fetchData()
  }

  const handleEditSubmit = async (data: TimeEntryFormData) => {
    if (!selectedEntryId || !profile?.organization_id) return

    const startDateTime = `${data.date}T${data.startTime}:00`
    const endDateTime = `${data.date}T${data.endTime}:00`

    const start = new Date(startDateTime).getTime()
    const end = new Date(endDateTime).getTime()
    const netHours = Math.max(0, (end - start) / (1000 * 60 * 60) - (data.breakMinutes / 60))

    const mealAllowance = calculateSpesen(netHours, !!data.overnightStay, {
      partial: (profile as any)?.organization?.spesen_rate_partial ?? DEFAULT_SPESEN_RATES.partial,
      full: (profile as any)?.organization?.spesen_rate_full ?? DEFAULT_SPESEN_RATES.full,
    })

    const { error } = await supabase
      .from('time_entries')
      .update({
        date: data.date,
        start_time: startDateTime,
        end_time: endDateTime,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        net_hours: Number(netHours.toFixed(2)),
        overnight_stay: !!data.overnightStay,
        hotel_address: data.hotelAddress || null,
        meal_allowance: Number(mealAllowance.toFixed(2)),
        is_planned: !!data.isPlanned,
        // Phase 3 #1 + #10
        start_location_id: data.startLocationId ?? null,
        destination_location_id: data.destinationLocationId ?? null,
        is_gastfahrt: !!data.isGastfahrt,
      })
      .eq('id', selectedEntryId)

    if (error) {
      toast.error('Eintrag konnte nicht aktualisiert werden')
      return
    }

    toast.success('Zeiteintrag aktualisiert')
    setView('details')
    fetchData()
  }

  const selectedEntry = entries.find(e => e.id === selectedEntryId)

  if (fetching) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full bg-white md:bg-transparent min-h-screen">
      <div className="max-w-[1600px] mx-auto md:px-6 md:py-8 lg:px-8">
        {view === 'list' && (
          <TimesList
            entries={entries}
            userRole={profile?.role}
            employees={employeeProfiles}
            onEntryClick={(id) => {
              setSelectedEntryId(id)
              setView('details')
            }}
            onAddClick={() => {
              // Phase 2 #3 — all roles can submit planned times. The TimeEntryForm
              // exposes a toggle that flips the new row into is_planned = true.
              setView('add')
            }}
            onToggleStatus={canAddManually ? handleToggleStatus : undefined}
            onConvertPlanned={handleConvertPlanned}
            onDelete={canAddManually ? handleDelete : undefined}
            onExportPdf={({ entries: filtered, employeeName }) => {
              // Phase 5 #4/#5/#6 — Produce an "Arbeitszeitbericht" from the
              // currently-filtered rows. For employees the page already pre-
              // scopes entries to user.id, so this becomes a self-export.
              if (filtered.length === 0) {
                toast.error('Keine Einträge zum Exportieren gefunden.')
                return
              }

              const title = 'Arbeitszeitbericht'
              const today = new Date()
              const stamp = format(today, 'yyyy-MM-dd')

              const subtitleParts: string[] = []
              if (employeeName) subtitleParts.push(employeeName)
              else if (!canAddManually && profile?.full_name) subtitleParts.push(profile.full_name)
              subtitleParts.push(format(today, 'dd.MM.yyyy'))

              const filenameBase = employeeName
                ? `arbeitszeitbericht_${slugify(employeeName)}_${stamp}`
                : (!canAddManually && profile?.full_name)
                  ? `meine-zeiterfassung_${slugify(profile.full_name)}_${stamp}`
                  : `arbeitszeitbericht_${stamp}`

              exportWorkingTimePdf(filtered, {
                title,
                subtitle: subtitleParts.join(' · '),
                filename: filenameBase,
                // Hide the "Employee" column on single-person exports (cleaner
                // for self-export and admin-single-employee export).
                showEmployee: canAddManually && !employeeName,
                locale: 'de',
              })

              toast.success('PDF heruntergeladen.')
            }}
          />
        )}

        {view === 'add' && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm 
              onBack={() => setView('list')}
              onSubmit={handleAddSubmit}
              customers={customers}
            />
          </div>
        )}

        {view === 'details' && selectedEntry && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryDetails 
              entry={selectedEntry}
              onBack={() => setView('list')}
              onEdit={() => setView('edit')}
            />
          </div>
        )}

        {view === 'edit' && selectedEntry && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm 
              initialData={selectedEntry}
              onBack={() => setView('details')}
              onSubmit={handleEditSubmit}
              customers={customers}
            />
          </div>
        )}
      </div>
    </div>
  )
}
