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
import { calculateShiftTimes } from '@/lib/time/shift-hours'
// Phase 5 #4/#5/#6 — PDF export from the Time Tracking section itself.
import { exportWorkingTimePdf, slugify } from '@/lib/pdf/exportPdf'
// Client CR May 2026 — Stundenzettel PDF (per-employee monthly timesheet
// mirroring the client's Excel template).
import { exportStundenzettelPdf } from '@/lib/pdf/stundenzettel'
import { format } from 'date-fns'
import { useTranslation } from '@/lib/i18n'

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
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const canAddManually = isAdmin || isDispatcher

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    if (!profile?.organization_id || !user) return
    const newStatus = !currentStatus

    // Optimistic UI update
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_verified: newStatus } : e))

    const result = await updateTimeEntryStatus(id, newStatus, newStatus ? user.id : null)

    if (!result.success) {
      console.error('Update status failed:', result.error)
      toast.error(L('Statusaktualisierung fehlgeschlagen', 'Status update failed'))
      // Revert on failure
      fetchData()
    } else {
      toast.success(newStatus
        ? L('Zeiteintrag genehmigt', 'Time entry approved')
        : L('Zeiteintrag auf ausstehend gesetzt', 'Time entry marked pending'))
    }
  }

  // Phase 6 #4 — admin/dispatcher hard-delete with confirm dialog.
  // Optimistic removal + reload on failure. RLS already restricts DELETE
  // to admin/dispatcher (see 20260424120000_security_baseline.sql).
  const handleDelete = async (entry: TimeEntry) => {
    if (!profile?.organization_id) return
    const employeeLabel = entry.employee?.full_name ?? L('Mitarbeiter', 'Employee')
    const confirmed = window.confirm(
      L(
        `Diesen Zeiteintrag wirklich löschen?\n\n${entry.date} · ${employeeLabel} · ${entry.net_hours?.toFixed?.(2) ?? '0.00'}h`,
        `Really delete this time entry?\n\n${entry.date} · ${employeeLabel} · ${entry.net_hours?.toFixed?.(2) ?? '0.00'}h`,
      ),
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
      toast.error(error.message || L('Eintrag konnte nicht gelöscht werden', 'Failed to delete entry'))
      setEntries(previous) // rollback
      return
    }
    toast.success(L('Zeiteintrag gelöscht', 'Time entry deleted'))
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
      toast.error(L('Konnte nicht als tatsächlich markiert werden', 'Could not mark as actual'))
      fetchData()
      return
    }
    toast.success(L('Als tatsächliche Zeit markiert', 'Marked as actual time'))
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

    if (entriesError) toast.error(L('Zeiteinträge konnten nicht geladen werden', 'Failed to load time entries'))
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
      toast.error(L(
        'Nur Admins können tatsächliche Zeiten manuell eintragen. Nutzen Sie den „Geplante Zeit"-Schalter, um eine Voranmeldung zu speichern.',
        'Only admins can manually enter actual times. Use the "Planned time" toggle to save a pre-announcement.',
      ))
      return
    }

    // Overnight-shift fix (May 2026) — calculateShiftTimes pushes the
    // end timestamp to the next day when end < start, so a 23:00 → 06:00
    // shift now records 7 hours instead of 0.
    const shift = calculateShiftTimes(data.date, data.startTime, data.endTime, data.breakMinutes)
    const startDateTime = shift.startISO
    const endDateTime = shift.endISO
    const netHours = shift.netHours

    // Phase 2 #11 — compute Spesen from org rates (falls back to German defaults).
    const mealAllowance = calculateSpesen(netHours, !!data.overnightStay, {
      partial: (profile as any)?.organization?.spesen_rate_partial ?? DEFAULT_SPESEN_RATES.partial,
      full: (profile as any)?.organization?.spesen_rate_full ?? DEFAULT_SPESEN_RATES.full,
    })

    // Client CR May 2026 — Admin/Dispatcher can record a shift for another
    // employee. The picker on TimeEntryForm sets data.employeeId; for an
    // employee filling in their own entry, it stays empty and we fall
    // back to their own auth user id. RLS still enforces (employee_id ==
    // auth.uid OR caller is admin/dispatcher in org).
    const targetEmployeeId =
      canAddManually && data.employeeId ? data.employeeId : user.id

    if (canAddManually && !data.employeeId) {
      toast.error(L('Bitte einen Mitarbeiter auswählen.', 'Please select an employee.'))
      return
    }

    const { error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: targetEmployeeId,
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
      toast.error(L('Eintrag konnte nicht erstellt werden', 'Failed to create entry'))
      return
    }

    toast.success(data.isPlanned
      ? L('Geplante Zeit gespeichert', 'Planned time saved')
      : L('Zeiteintrag erstellt', 'Time entry created'))
    setView('list')
    fetchData()
  }

  const handleEditSubmit = async (data: TimeEntryFormData) => {
    if (!selectedEntryId || !profile?.organization_id) return

    // Overnight-shift fix (May 2026) — same helper as the insert path so
    // an edit that flips the times into an overnight shift recalculates
    // correctly.
    const shift = calculateShiftTimes(data.date, data.startTime, data.endTime, data.breakMinutes)
    const startDateTime = shift.startISO
    const endDateTime = shift.endISO
    const netHours = shift.netHours

    const mealAllowance = calculateSpesen(netHours, !!data.overnightStay, {
      partial: (profile as any)?.organization?.spesen_rate_partial ?? DEFAULT_SPESEN_RATES.partial,
      full: (profile as any)?.organization?.spesen_rate_full ?? DEFAULT_SPESEN_RATES.full,
    })

    // Client CR May 2026 — admin / dispatcher may reassign the row to a
    // different employee through the picker on TimeEntryForm. Employees
    // never see the picker, so data.employeeId stays empty for them and
    // we leave the field untouched.
    const updatePayload: Record<string, unknown> = {
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
    }
    if (canAddManually && data.employeeId) {
      updatePayload.employee_id = data.employeeId
    }

    const { error } = await supabase
      .from('time_entries')
      .update(updatePayload)
      .eq('id', selectedEntryId)

    if (error) {
      toast.error(L('Eintrag konnte nicht aktualisiert werden', 'Failed to update entry'))
      return
    }

    toast.success(L('Zeiteintrag aktualisiert', 'Time entry updated'))
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
                toast.error(L('Keine Einträge zum Exportieren gefunden.', 'No entries to export.'))
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

              toast.success(L('PDF heruntergeladen.', 'PDF downloaded.'))
            }}
            onExportStundenzettel={canAddManually
              ? ({ entries: filtered, employeeId, employeeName }) => {
                  // The list passes us the currently-filtered slice. The
                  // Stundenzettel is always per-employee per-month, so we
                  // pick the dominant month from the filtered set (the
                  // most recent date present) and then restrict the rows
                  // to that month. This guarantees the PDF header and the
                  // table contents agree even if the active filter spans
                  // multiple months.
                  if (filtered.length === 0) {
                    toast.error(L('Keine Einträge für Stundenzettel.', 'No entries for timesheet.'))
                    return
                  }
                  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))
                  const monthKey = (sorted[0].date || '').slice(0, 7) // YYYY-MM
                  const monthEntries = filtered.filter((e) => (e.date || '').slice(0, 7) === monthKey)
                  if (monthEntries.length < filtered.length) {
                    toast.info(L(
                      `Stundenzettel nur für ${monthKey} — andere Monate ignoriert.`,
                      `Timesheet limited to ${monthKey} — other months skipped.`,
                    ))
                  }
                  exportStundenzettelPdf({
                    employeeName,
                    monthKey,
                    entries: monthEntries.map((e) => ({
                      date: e.date,
                      start_time: e.start_time,
                      end_time: e.end_time,
                      break_minutes: e.break_minutes,
                      net_hours: e.net_hours,
                      overnight_stay: e.overnight_stay,
                      meal_allowance: e.meal_allowance,
                      is_gastfahrt: e.is_gastfahrt,
                      notes: e.notes,
                    })),
                    filenameBase: `Stundenzettel_${slugify(employeeName)}_${monthKey}`,
                  })
                  toast.success(L('Stundenzettel heruntergeladen.', 'Timesheet downloaded.'))
                  void employeeId
                }
              : undefined}
          />
        )}

        {view === 'add' && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm
              onBack={() => setView('list')}
              onSubmit={handleAddSubmit}
              customers={customers}
              employees={canAddManually
                ? employeeProfiles
                    .filter((p) => p && p.id && p.full_name)
                    .map((p) => ({ id: p.id, full_name: p.full_name }))
                : undefined}
              // Admin doesn't get a pre-filled employee — they must explicitly
              // pick one so they never accidentally log a shift on their own
              // account when they meant another team member.
              defaultEmployeeId={undefined}
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
              employees={canAddManually
                ? employeeProfiles
                    .filter((p) => p && p.id && p.full_name)
                    .map((p) => ({ id: p.id, full_name: p.full_name }))
                : undefined}
              defaultEmployeeId={selectedEntry.employee_id}
            />
          </div>
        )}
      </div>
    </div>
  )
}
