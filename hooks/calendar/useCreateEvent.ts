import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEventFormData } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'
import { sendNotification } from '@/lib/notifications/service'

/**
 * Supabase PostgrestError uses non-enumerable properties — passing it directly
 * to console.error prints `{}` which is why the original log was useless.
 * normalizeError() pulls out the fields we actually care about so the console
 * shows message / code / details / hint.
 */
function normalizeError(err: any): Record<string, unknown> {
  if (!err) return { message: 'unknown error' }
  if (typeof err === 'string') return { message: err }
  return {
    message: err.message ?? err.error_description ?? String(err),
    code: err.code,
    details: err.details,
    hint: err.hint,
    status: err.status,
    statusText: err.statusText,
  }
}

export function useCreateEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, profile } = useUser()
  const supabase = createClient()

  const createEvent = async (data: CalendarEventFormData) => {
    if (!user || !profile?.organization_id) {
      toast.error('Sie müssen angemeldet sein, um Termine zu erstellen')
      return null
    }

    setIsSubmitting(true)
    try {
      // 1. Special Handling for SHIFTS (Insert into 'plans' table)
      if (data.event_type === 'shift') {
        const employeeId = data.member_ids[0]
        if (!employeeId) {
          toast.error('Bitte einen Mitarbeiter für die Schicht auswählen')
          setIsSubmitting(false)
          return null
        }

        const { data: plan, error: planError } = await supabase
          .from('plans')
          .insert({
            organization_id: profile.organization_id,
            employee_id: employeeId,
            creator_id: user.id,
            route: data.title, // Title acts as Route in the sheet UI
            location: data.location || '',
            start_time: data.start_time,
            end_time: data.end_time,
            status: 'assigned',
            notes: data.description || '',
          })
          .select()
          .single()

        if (planError) throw planError

        // 1b. Notify Assigned Employee through the canonical notification service
        await sendNotification({
          userId: employeeId,
          title: '📋 New Shift Assigned',
          message: `You have been assigned to: ${data.title}`,
          module: 'plans',
          moduleId: plan.id,
        })

        toast.success('Schicht erfolgreich zugewiesen')
        return plan
      }

      // 2. Regular CALENDAR EVENTS — Phase 4 #7 persists reminder_minutes_before
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          organization_id: profile.organization_id,
          creator_id: user.id,
          title: data.title,
          description: data.description || '',
          event_type: data.event_type,
          start_time: data.start_time,
          end_time: data.end_time,
          is_all_day: data.is_all_day,
          color: data.color,
          location: data.location || '',
          reminder_minutes_before:
            data.reminder_minutes_before === undefined || data.reminder_minutes_before === null
              ? null
              : Number(data.reminder_minutes_before),
        })
        .select()
        .single()

      if (eventError) throw eventError

      // 3. Insert members + notify invited attendees exactly once (Phase 4 #9)
      if (data.member_ids.length > 0) {
        const memberInserts = data.member_ids.map(uid => ({
          event_id: event.id,
          user_id: uid,
        }))
        const { error: memberError } = await supabase
          .from('calendar_event_members')
          .insert(memberInserts)

        if (memberError) throw memberError

        // Fire notifications via the canonical helper (single source of truth)
        const startLabel = new Date(data.start_time).toLocaleString(undefined, {
          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })
        await Promise.all(
          data.member_ids
            .filter(uid => uid !== user.id) // Don't notify the creator themselves
            .map(uid =>
              sendNotification({
                userId: uid,
                title: `📅 Added to event: ${data.title}`,
                message: `You have been invited to "${data.title}" on ${startLabel}${data.location ? ` · ${data.location}` : ''}.`,
                module: 'calendar',
                moduleId: event.id,
              })
            )
        )
      }

      toast.success('Termin erfolgreich erstellt')
      return event
    } catch (err: any) {
      const detail = normalizeError(err)
      console.error('[useCreateEvent] Error:', detail)
      // Surface the most useful field to the user so they don't just see a
      // generic toast when the actual problem is e.g. a missing RLS helper.
      const userMsg =
        (detail.message as string)
        || (detail.hint as string)
        || (detail.code as string)
        || 'Termin konnte nicht erstellt werden'
      toast.error(userMsg)
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateEvent = async (id: string, data: Partial<CalendarEventFormData>) => {
    setIsSubmitting(true)
    try {
      // Build update payload — only include fields that were explicitly provided
      const updatePayload: Record<string, any> = {
        title: data.title,
        description: data.description,
        event_type: data.event_type,
        start_time: data.start_time,
        end_time: data.end_time,
        is_all_day: data.is_all_day,
        color: data.color,
        location: data.location,
      }

      // Reminder field handled explicitly so clearing it (null) is supported.
      if ('reminder_minutes_before' in data) {
        updatePayload.reminder_minutes_before =
          data.reminder_minutes_before === undefined || data.reminder_minutes_before === null
            ? null
            : Number(data.reminder_minutes_before)
        // Reset "sent" marker so a new reminder window can fire
        updatePayload.reminder_sent_at = null
      }

      const { error: eventError } = await supabase
        .from('calendar_events')
        .update(updatePayload)
        .eq('id', id)

      if (eventError) throw eventError

      // Update members if provided
      if (data.member_ids) {
        // Snapshot current members to detect newcomers after the replace
        const { data: existingRows } = await supabase
          .from('calendar_event_members')
          .select('user_id')
          .eq('event_id', id)
        const existingIds = new Set((existingRows || []).map(r => r.user_id))

        // Simple approach: delete all and re-insert
        await supabase.from('calendar_event_members').delete().eq('event_id', id)

        if (data.member_ids.length > 0) {
          const memberInserts = data.member_ids.map(uid => ({
            event_id: id,
            user_id: uid,
          }))
          await supabase.from('calendar_event_members').insert(memberInserts)

          // Notify newcomers only (people that weren't already invited)
          const newcomers = data.member_ids.filter(uid => !existingIds.has(uid) && uid !== user?.id)
          if (newcomers.length > 0 && data.title) {
            const startLabel = data.start_time
              ? new Date(data.start_time).toLocaleString(undefined, {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })
              : ''
            await Promise.all(
              newcomers.map(uid =>
                sendNotification({
                  userId: uid,
                  title: `📅 Added to event: ${data.title}`,
                  message: `You have been invited to "${data.title}"${startLabel ? ` on ${startLabel}` : ''}${data.location ? ` · ${data.location}` : ''}.`,
                  module: 'calendar',
                  moduleId: id,
                })
              )
            )
          }
        }
      }

      toast.success('Termin aktualisiert')
      return true
    } catch (err: any) {
      const detail = normalizeError(err)
      console.error('[useCreateEvent] update error:', detail)
      toast.error((detail.message as string) || (detail.hint as string) || 'Aktualisierung fehlgeschlagen')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const deleteEvent = async (id: string) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', id)
      if (error) throw error
      toast.success('Termin gelöscht')
      return true
    } catch (err: any) {
      const detail = normalizeError(err)
      console.error('[useCreateEvent] delete error:', detail)
      toast.error((detail.message as string) || (detail.hint as string) || 'Löschen fehlgeschlagen')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return { createEvent, updateEvent, deleteEvent, isSubmitting }
}
