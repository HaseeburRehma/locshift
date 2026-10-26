'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TimesList } from '@/components/time/TimesList'
import { TimeEntryForm } from '@/components/time/TimeEntryForm'
import { TimeEntryDetails } from '@/components/time/TimeEntryDetails'
import { ShiftClosingDialog } from '@/components/time/ShiftClosingDialog'
import { CorrectionRequestDialog } from '@/components/time/CorrectionRequestDialog'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useCorrections } from '@/hooks/times/useCorrections'
import { useUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import type { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { useProfiles } from '@/hooks/useProfiles'
import { calculateSpesen } from '@/lib/spesen'
import { calculateShiftTimes, localDateKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatHours, formatShiftRange } from '@/lib/time/format'
import { TIME_ENTRY_SELECT, dbErrorMessage, entryStatus } from '@/lib/times/entry-status'
import { sendNotification } from '@/lib/notifications/service'
import { exportWorkingTimePdf, slugify } from '@/lib/pdf/exportPdf'
import { useTranslation } from '@/lib/i18n'

export default function TimesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      }
    >
      <TimesPageInner />
    </Suspense>
  )
}

function TimesPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [view, setView] = useState<'list' | 'add' | 'details' | 'edit'>('list')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [fetching, setFetching] = useState(true)
  const [reviewEntry, setReviewEntry] = useState<TimeEntry | null>(null)
  const [correctionEntry, setCorrectionEntry] = useState<TimeEntry | null>(null)

  const { user, profile, isAdmin, isDispatcher, spesenRates } = useUser()
  const { submitEntry } = useTimeTracking()
  const { profiles: employeeProfiles } = useProfiles()
  const { corrections: pendingCorrections, requestCorrection } = useCorrections({ pendingOnly: true })
  const supabase = createClient()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const isManager = isAdmin || isDispatcher

  const fetchData = useCallback(async () => {
    if (!user || !profile?.organization_id) return
    let q = supabase
      .from('time_entries')
      .select(TIME_ENTRY_SELECT)
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1000)
    if (!isManager) q = q.eq('employee_id', user.id)
    const { data, error } = await q
    if (error) toast.error(L('Zeiteinträge konnten nicht geladen werden', 'Failed to load time entries'))
    else setEntries((data ?? []) as TimeEntry[])

    const { data: customersData } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('name')
    setCustomers(customersData || [])
    setFetching(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.organization_id, isManager, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Deep link: /dashboard/times?entry=<id>
  useEffect(() => {
    const id = searchParams.get('entry')
    if (id && entries.some((e) => e.id === id)) {
      setSelectedEntryId(id)
      setView('details')
    }
  }, [searchParams, entries])

  const pendingCorrectionIds = useMemo(
    () => new Set(pendingCorrections.map((c) => c.entry_id)),
    [pendingCorrections],
  )
  const approvalsCount = isManager
    ? pendingCorrections.length + entries.filter((e) => entryStatus(e) === 'submitted').length
    : 0

  const setApproved = async (entry: TimeEntry, approved: boolean) => {
    const { error } = await supabase
      .from('time_entries')
      .update({ is_verified: approved, verified_by: approved ? user?.id ?? null : null })
      .eq('id', entry.id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Freigabe konnte nicht gespeichert werden', 'Could not save approval')))
      return
    }
    toast.success(approved ? L('Zeiteintrag freigegeben', 'Time entry approved') : L('Freigabe zurückgenommen', 'Approval revoked'))
    if (approved && entry.employee_id !== user?.id) {
      void sendNotification({
        userId: entry.employee_id,
        title: 'Zeiteintrag freigegeben',
        message: `Ihr Zeiteintrag vom ${formatDateDE(entry.date)} (${formatShiftRange(entry.start_time, entry.end_time)}) wurde freigegeben.`,
        module: 'time_entries',
        moduleId: entry.id,
        link: `/dashboard/times?entry=${entry.id}`,
        skipEmail: true,
      })
    }
    fetchData()
  }

  const handleDelete = async (entry: TimeEntry) => {
    const employeeLabel = entry.employee?.full_name ?? L('Mitarbeiter', 'Employee')
    const confirmed = window.confirm(
      L(
        `Diesen Zeiteintrag wirklich löschen?\n\n${formatDateDE(entry.date)} · ${employeeLabel} · ${formatHours(entry.net_hours, 'de')} Std.\n\nDer Vorgang wird im Änderungsprotokoll festgehalten.`,
        `Really delete this time entry?\n\n${entry.date} · ${employeeLabel} · ${formatHours(entry.net_hours, 'en')} h`,
      ),
    )
    if (!confirmed) return
    const previous = entries
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    const { error } = await supabase.from('time_entries').delete().eq('id', entry.id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Eintrag konnte nicht gelöscht werden', 'Failed to delete entry')))
      setEntries(previous)
      return
    }
    toast.success(L('Zeiteintrag gelöscht', 'Time entry deleted'))
    if (view !== 'list') setView('list')
  }

  const handleConvertPlanned = async (id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, is_planned: false } : e)))
    const { error } = await supabase.from('time_entries').update({ is_planned: false }).eq('id', id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Konnte nicht als tatsächlich markiert werden', 'Could not mark as actual')))
      fetchData()
      return
    }
    toast.success(L('Als tatsächliche Zeit markiert', 'Marked as actual time'))
  }

  const findOverlaps = async (employeeId: string, startISO: string, endISO: string, excludeId?: string) => {
    let q = supabase
      .from('time_entries')
      .select('id, date, start_time, end_time, break_minutes, net_hours, employee_id')
      .eq('employee_id', employeeId)
      .eq('is_planned', false)
      .lt('start_time', endISO)
      .or(`end_time.gt.${startISO},end_time.is.null`)
    if (excludeId) q = q.neq('id', excludeId)
    const { data } = await q
    return (data ?? []) as TimeEntry[]
  }

  const handleAddSubmit = async (data: TimeEntryFormData) => {
    if (!user || !profile?.organization_id) return

    if (!isManager && !data.isPlanned) {
      toast.error(L(
        'Tatsächliche Zeiten erfassen Sie über „Schicht starten“ / „Beenden“. Hier können Sie eine geplante Zeit voranmelden.',
        'Record actual times with "Start shift" / "End". Here you can pre-announce a planned time.',
      ))
      return
    }

    const shift = calculateShiftTimes(data.date, data.startTime, data.endTime, data.breakMinutes)
    const targetEmployeeId = isManager && data.employeeId ? data.employeeId : user.id
    const onBehalf = targetEmployeeId !== user.id
    const now = new Date().toISOString()

    const { data: inserted, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: profile.organization_id,
        employee_id: targetEmployeeId,
        plan_id: data.planId ?? null,
        date: data.date,
        start_time: shift.startISO,
        end_time: shift.endISO,
        break_minutes: data.breakMinutes ?? 0,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        overnight_stay: !!data.overnightStay,
        hotel_address: data.hotelAddress || null,
        meal_allowance: calculateSpesen(shift.netHours, !!data.overnightStay, spesenRates),
        is_planned: !!data.isPlanned,
        start_location_id: data.startLocationId ?? null,
        destination_location_id: data.destinationLocationId ?? null,
        is_gastfahrt: !!data.isGastfahrt,
        // Entered by dispatch/admin → counts as submitted.
        submitted_at: !data.isPlanned && isManager ? now : null,
        is_verified: !data.isPlanned && isManager && !!data.approveNow,
        verified_by: !data.isPlanned && isManager && data.approveNow ? user.id : null,
      })
      .select('id')
      .single()

    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Eintrag konnte nicht erstellt werden', 'Failed to create entry')))
      return
    }

    if (onBehalf) {
      void sendNotification({
        userId: targetEmployeeId,
        title: 'Zeiten für Sie erfasst',
        message: `${profile.full_name ?? 'Die Disposition'} hat für Sie eine Schicht am ${formatDateDE(data.date)} (${data.startTime}–${data.endTime}, ${formatHours(shift.netHours, 'de')} Std.) erfasst.`,
        module: 'time_entries',
        moduleId: inserted?.id,
        link: inserted?.id ? `/dashboard/times?entry=${inserted.id}` : '/dashboard/times',
      })
    }

    toast.success(data.isPlanned ? L('Geplante Zeit gespeichert', 'Planned time saved') : L('Zeiteintrag gespeichert', 'Time entry saved'))
    setView('list')
    fetchData()
  }

  const selectedEntry = entries.find((e) => e.id === selectedEntryId)

  const handleEditSubmit = async (data: TimeEntryFormData) => {
    if (!selectedEntry || !profile?.organization_id) return
    const shift = calculateShiftTimes(data.date, data.startTime, data.endTime, data.breakMinutes)
    const payload: Record<string, unknown> = {
      plan_id: data.planId ?? selectedEntry.plan_id ?? null,
      date: data.date,
      start_time: shift.startISO,
      end_time: shift.endISO,
      break_minutes: data.breakMinutes ?? 0,
      customer_id: data.customerId || null,
      location: data.location || null,
      notes: data.notes || null,
      overnight_stay: !!data.overnightStay,
      hotel_address: data.hotelAddress || null,
      meal_allowance: calculateSpesen(shift.netHours, !!data.overnightStay, spesenRates),
      is_planned: !!data.isPlanned,
      start_location_id: data.startLocationId ?? null,
      destination_location_id: data.destinationLocationId ?? null,
      is_gastfahrt: !!data.isGastfahrt,
    }
    if (isManager && data.employeeId) payload.employee_id = data.employeeId
    if (data.changeReason?.trim()) payload.change_reason = `Änderung durch Disposition: ${data.changeReason.trim()}`

    const { error } = await supabase.from('time_entries').update(payload).eq('id', selectedEntry.id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Eintrag konnte nicht aktualisiert werden', 'Failed to update entry')))
      return
    }

    if (isManager && selectedEntry.submitted_at && selectedEntry.employee_id !== user?.id) {
      void sendNotification({
        userId: selectedEntry.employee_id,
        title: 'Zeiteintrag geändert',
        message: `Ihr Zeiteintrag vom ${formatDateDE(selectedEntry.date)} wurde von ${profile.full_name ?? 'der Disposition'} geändert: ${data.startTime}–${data.endTime}, ${formatHours(shift.netHours, 'de')} Std. Grund: ${data.changeReason?.trim() ?? '—'}`,
        module: 'time_entries',
        moduleId: selectedEntry.id,
        link: `/dashboard/times?entry=${selectedEntry.id}`,
      })
    }

    toast.success(L('Zeiteintrag aktualisiert', 'Time entry updated'))
    setView('details')
    fetchData()
  }

  const handleSubmitDraft = async (...args: Parameters<typeof submitEntry>) => {
    const ok = await submitEntry(...args)
    if (ok) fetchData()
    return ok
  }

  const handleRequestCorrection: typeof requestCorrection = async (...args) => {
    const ok = await requestCorrection(...args)
    if (ok) fetchData()
    return ok
  }

  if (fetching) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const employeeOptions = isManager
    ? employeeProfiles.filter((p) => p && p.id && p.full_name).map((p) => ({ id: p.id, full_name: p.full_name ?? '' }))
    : undefined

  const ownDraft = (e: TimeEntry) => e.employee_id === user?.id && entryStatus(e) === 'draft'
  const canRequestCorrection = (e: TimeEntry) =>
    e.employee_id === user?.id && !isManager && (entryStatus(e) === 'submitted' || entryStatus(e) === 'approved')
  const canEdit = (e: TimeEntry) => isManager || ownDraft(e) || (e.employee_id === user?.id && e.is_planned)

  return (
    <div className="h-full bg-white md:bg-transparent min-h-screen">
      <div className="max-w-[1600px] mx-auto md:px-6 md:py-8 lg:px-8">
        {view === 'list' && (
          <TimesList
            entries={entries}
            userRole={profile?.role}
            employees={employeeProfiles}
            currentUserId={user?.id}
            pendingCorrectionIds={pendingCorrectionIds}
            onEntryClick={(id) => {
              setSelectedEntryId(id)
              setView('details')
            }}
            onAddClick={() => setView('add')}
            onToggleStatus={isManager ? (id) => {
              const e = entries.find((x) => x.id === id)
              if (e) setApproved(e, !e.is_verified)
            } : undefined}
            onConvertPlanned={handleConvertPlanned}
            onDelete={isManager ? handleDelete : undefined}
            onReviewDraft={(e) => setReviewEntry(e)}
            onOpenApprovals={isManager ? () => router.push('/dashboard/times/approvals') : undefined}
            approvalsCount={approvalsCount}
            onOpenMonthlyReport={(employeeId) => {
              const month = localDateKey().slice(0, 7)
              const qs = new URLSearchParams({ month })
              if (employeeId) qs.set('employee', employeeId)
              router.push(`/dashboard/times/monthly?${qs.toString()}`)
            }}
            onExportPdf={({ entries: filtered, employeeName: activeName }) => {
              if (filtered.length === 0) {
                toast.error(L('Keine Einträge zum Exportieren gefunden.', 'No entries to export.'))
                return
              }
              const stamp = localDateKey()
              const subtitleParts: string[] = []
              if (activeName) subtitleParts.push(activeName)
              else if (!isManager && profile?.full_name) subtitleParts.push(profile.full_name)
              subtitleParts.push(formatDateDE(stamp))
              const filenameBase = activeName
                ? `arbeitszeitbericht_${slugify(activeName)}_${stamp}`
                : !isManager && profile?.full_name
                  ? `meine-zeiterfassung_${slugify(profile.full_name)}_${stamp}`
                  : `arbeitszeitbericht_${stamp}`
              exportWorkingTimePdf(filtered, {
                title: 'Arbeitszeitbericht',
                subtitle: subtitleParts.join(' · '),
                filename: filenameBase,
                showEmployee: isManager && !activeName,
                locale: 'de',
              })
              toast.success(L('PDF heruntergeladen.', 'PDF downloaded.'))
            }}
          />
        )}

        {view === 'add' && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryForm
              onBack={() => setView('list')}
              onSubmit={handleAddSubmit}
              customers={customers}
              employees={employeeOptions}
              defaultEmployeeId={undefined}
              allowApproveNow={isManager}
              findOverlaps={findOverlaps}
            />
          </div>
        )}

        {view === 'details' && selectedEntry && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[3rem] md:shadow-2xl md:overflow-hidden md:border md:border-slate-100">
            <TimeEntryDetails
              entry={selectedEntry}
              onBack={() => {
                setView('list')
                if (searchParams.get('entry')) router.replace('/dashboard/times')
              }}
              onEdit={canEdit(selectedEntry) ? () => setView('edit') : undefined}
              onSubmitDraft={ownDraft(selectedEntry) ? () => setReviewEntry(selectedEntry) : undefined}
              onRequestCorrection={canRequestCorrection(selectedEntry) ? () => setCorrectionEntry(selectedEntry) : undefined}
              onApprove={isManager && selectedEntry.end_time && !selectedEntry.is_verified && !selectedEntry.is_planned ? () => setApproved(selectedEntry, true) : undefined}
              onUnapprove={isManager && selectedEntry.is_verified ? () => setApproved(selectedEntry, false) : undefined}
              onDelete={isManager ? () => handleDelete(selectedEntry) : undefined}
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
              employees={employeeOptions}
              defaultEmployeeId={selectedEntry.employee_id}
              requireReason={isManager && !!selectedEntry.submitted_at}
              findOverlaps={findOverlaps}
            />
          </div>
        )}
      </div>

      <ShiftClosingDialog
        entry={reviewEntry}
        open={!!reviewEntry}
        onOpenChange={(o) => !o && setReviewEntry(null)}
        onSubmit={handleSubmitDraft}
      />
      <CorrectionRequestDialog
        entry={correctionEntry}
        open={!!correctionEntry}
        onOpenChange={(o) => !o && setCorrectionEntry(null)}
        onSubmit={handleRequestCorrection}
      />
    </div>
  )
}
