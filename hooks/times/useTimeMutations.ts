import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, TimeEntryFormData } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { actionToasts } from '@/lib/toast/actionToasts'
import { sendNotification } from '@/lib/notifications/service'

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
      const payload = {
        employee_id: profile.id,
        organization_id: profile.organization_id,
        date: data.date,
        start_time: `${data.date}T${data.startTime}:00`,
        end_time: `${data.date}T${data.endTime}:00`,
        break_minutes: data.breakMinutes,
        customer_id: data.customerId || null,
        location: data.location || null,
        notes: data.notes || null,
        is_verified: false,
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

      // Notify the employee their entry was approved
      if (employeeId) {
        await sendNotification({
          userId: employeeId,
          title: '✅ Time Entry Approved',
          message: `Your time entry${entryDate ? ` for ${new Date(entryDate).toLocaleDateString()}` : ''} has been approved.`,
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
