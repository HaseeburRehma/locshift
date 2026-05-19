import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { actionToasts } from '@/lib/toast/actionToasts'
import { sendNotification } from '@/lib/notifications/service'
import { calculateSpesen, DEFAULT_SPESEN_RATES } from '@/lib/spesen'
import { calculateShiftTimes } from '@/lib/time/shift-hours'

export function useTimeMutations() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { profile } = useUser()
  const supabase = createClient()

  /**
   * Create a new time entry with optimistic feedback.
   * ⚠️ IMPORTANT: Never include net_hours in the payload (GENERATED column)
   */
  const createTimeEntry = useCallback(async (data: TimeEntryFormData) => {
    if (!profile?.id || !profile?.organization_id) return

    setIsSubmitting(true)
    try {
      // Phase 2 #11 — Spesen is computed client-side so the row carries
      // the snapshot value (org rate changes don't retroactively rewrite
      // past entries).
      //
      // Overnight-shift fix (May 2026): use calculateShiftTimes so a
      // shift like 23:00 → 06:00 is correctly stored with end_time on
      // the next calendar day (was previously stored same-day, which
      // made netHours go negative and clamp to 0).
      const shift = calculateShiftTimes(
        data.date,
        data.startTime,
        data.endTime,
        data.breakMinutes ?? 0,
      )
      const netHours = shift.netHours
      const mealAllowance = calculateSpesen(netHours, !!data.overnightStay, {
        partial: (profile as any)?.organization?.spesen_rate_partial ?? DEFAULT_SPESEN_RATES.partial,
        full: (profile as any)?.organization?.spesen_rate_full ?? DEFAULT_SPESEN_RATES.full,
      })

      const payload = {
        employee_id: profile.id,
        organization_id: profile.organization_id,
        date: data.date,
        start_time: shift.startISO,
        end_time: shift.endISO,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        is_verified: false,
        // Phase 2 additions
        overnight_stay: !!data.overnightStay,
        hotel_address: data.hotelAddress || null,
        meal_allowance: Number(mealAllowance.toFixed(2)),
        is_planned: !!data.isPlanned,
        // Phase 3 #1 + #10
        start_location_id: data.startLocationId ?? null,
        destination_location_id: data.destinationLocationId ?? null,
        is_gastfahrt: !!data.isGastfahrt,
        // net_hours is NOT included — it is a GENERATED column
      }

      const { error } = await supabase.from('time_entries').insert(payload)
      if (error) throw error

      actionToasts.timeSubmitted()
      return true
    } catch (err: any) {
      console.error('[useTimeMutations] Create error:', err)
      actionToasts.genericError(err.message || 'Failed to submit time entry')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [profile, supabase])

  /**
   * Admin verification of a time entry — optimistic, with notification.
   * ⚠️ IMPORTANT: Never include net_hours in the update payload.
   */
  const verifyTimeEntry = useCallback(async (
    entryId: string,
    employeeId?: string,
    entryDate?: string
  ) => {
    if (!profile?.id || profile.role === 'employee') return

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          is_verified: true,
          verified_by: profile.id,
          updated_at: new Date().toISOString()
          // net_hours NOT included
        } as any)
        .eq('id', entryId)

      if (error) throw error

      actionToasts.timeVerified()

      // Notify the employee their entry was approved.
      // Stored DE-canonical; the panel's translateNotification flips to
      // EN automatically when the UI locale is English.
      if (employeeId) {
        const dateStr = entryDate ? new Date(entryDate).toLocaleDateString('de-DE') : null
        await sendNotification({
          userId: employeeId,
          title: '✅ Zeiteintrag genehmigt',
          message: dateStr
            ? `Ihr Zeiteintrag vom ${dateStr} wurde genehmigt.`
            : 'Ihr Zeiteintrag wurde genehmigt.',
          module: 'shifts',
          moduleId: entryId
        })
      }

      return true
    } catch (err: any) {
      console.error('[useTimeMutations] Verify error:', err)
      actionToasts.genericError(err.message || 'Failed to verify entry')
      return false
    }
  }, [profile, supabase])

  /**
   * Deletion of unverified entries only.
   */
  const deleteTimeEntry = useCallback(async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)
        .eq('is_verified', false) // Safety guard

      if (error) throw error
      actionToasts.timeDeleted()
      return true
    } catch (err: any) {
      console.error('[useTimeMutations] Delete error:', err)
      actionToasts.genericError(err.message || 'Failed to delete entry')
      return false
    }
  }, [supabase])

  return { createTimeEntry, verifyTimeEntry, deleteTimeEntry, isSubmitting }
}
