import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEventFormData, CalendarEventType } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export function useCreateEvent() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, profile } = useUser()
  const supabase = createClient()

  const createEvent = async (data: CalendarEventFormData) => {
    if (!user || !profile?.organization_id) {
      toast.error('You must be logged in to create events')
      return null
    }

    setIsSubmitting(true)
    try {
      // 1. Special Handling for SHIFTS (Insert into 'plans' table)
      if (data.event_type === 'shift') {
        const employeeId = data.member_ids[0]
        if (!employeeId) {
          toast.error('Please select an employee for the shift')
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

        // 1b. Notify Assigned Employee
        await supabase.from('notifications').insert({
          user_id: employeeId,
          title: 'New Shift Assigned',
          message: `You have been assigned to: ${data.title}`,
          type: 'info',
          link: '/dashboard/calendar'
        })

        toast.success('Shift assigned successfully')
        return plan
      }

      // 2. Regular CALENDAR EVENTS
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
        })
        .select()
        .single()

      if (eventError) throw eventError

      // 3. Insert members for regular events
      if (data.member_ids.length > 0) {
        const memberInserts = data.member_ids.map(uid => ({
          event_id: event.id,
          user_id: uid,
        }))
        const { error: memberError } = await supabase
          .from('calendar_event_members')
          .insert(memberInserts)
        
        if (memberError) throw memberError

        // 3b. Notify Invited Members
        const notificationInserts = data.member_ids.map(uid => ({
          user_id: uid,
          title: 'Added to Event',
          message: `You were added to: ${data.title}`,
          type: 'info',
          link: '/dashboard/calendar'
        }))
        await supabase.from('notifications').insert(notificationInserts)
      }

      toast.success('Event created successfully')
      return event
    } catch (err: any) {
      console.error('[useCreateEvent] Error:', err)
      toast.error(err.message || 'Failed to create event')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateEvent = async (id: string, data: Partial<CalendarEventFormData>) => {
    setIsSubmitting(true)
    try {
      const { error: eventError } = await supabase
        .from('calendar_events')
        .update({
          title: data.title,
          description: data.description,
          event_type: data.event_type,
          start_time: data.start_time,
          end_time: data.end_time,
          is_all_day: data.is_all_day,
          color: data.color,
          location: data.location,
        })
        .eq('id', id)

      if (eventError) throw eventError

      // Update members if provided
      if (data.member_ids) {
        // Simple approach: delete all and re-insert
        await supabase.from('calendar_event_members').delete().eq('event_id', id)
        
        if (data.member_ids.length > 0) {
          const memberInserts = data.member_ids.map(uid => ({
            event_id: id,
            user_id: uid,
          }))
          await supabase.from('calendar_event_members').insert(memberInserts)
        }
      }

      toast.success('Event updated')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
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
      toast.success('Event deleted')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  return { createEvent, updateEvent, deleteEvent, isSubmitting }
}
