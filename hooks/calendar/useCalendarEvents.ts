import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent, EVENT_COLORS } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'

/**
 * Supabase PostgrestError uses non-enumerable properties — spreading it
 * into a plain object literal prints `{}` which is why the original
 * `[useCalendarEvents] Fetch error detail: {}` log was useless.
 * This helper normalises every known error shape into a plain object that
 * serialises cleanly.
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

export function useCalendarEvents(year: number, month: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()
  const { locale } = useTranslation()

  const isAdminOrDispatcher = profile?.role === 'admin' || profile?.role === 'dispatcher'
  const orgId = profile?.organization_id
  const userId = profile?.id

  useEffect(() => {
    if (!orgId || !userId) return

    const fetchAll = async () => {
      setIsLoading(true)

      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

      // Fail-partially rather than fail-whole: each fetch is wrapped in its
      // own try/catch so a broken calendar_event_members join doesn't hide
      // plan data (and vice-versa). Every error is logged with the full
      // PostgrestError shape (message/code/details/hint).
      let calData: any[] = []
      let planData: any[] = []
      let hadError = false

      // 1. Calendar events with joined creator + invited members
      try {
        const calQuery = supabase
          .from('calendar_events')
          .select(`
            *,
            creator:profiles!creator_id(id, full_name, avatar_url, role),
            members:calendar_event_members(
              user:profiles(id, full_name, avatar_url, role)
            )
          `)
          .eq('organization_id', orgId)
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth)

        const { data, error } = await calQuery
        if (error) {
          hadError = true
          console.error('[useCalendarEvents] calendar_events fetch failed:', {
            ...normalizeError(error),
            orgId,
            userId,
            startOfMonth,
            endOfMonth,
          })
          // Common case: RLS policy not applied yet → point the user to the fix
          if (error.code === '42501') {
            toast.error(locale === 'de'
              ? 'Keine Berechtigung zum Laden der Termine. Bitte Administrator kontaktieren.'
              : 'You don\'t have permission to load events. Please contact your administrator.')
          }
        } else {
          calData = data ?? []
        }
      } catch (err) {
        hadError = true
        console.error('[useCalendarEvents] calendar_events threw:', normalizeError(err))
      }

      // 2. Plans (existing shifts) — independent of the calendar fetch
      try {
        let planQuery = supabase
          .from('plans')
          .select(`
            id,
            start_time,
            end_time,
            route,
            location,
            status,
            employee:profiles!employee_id(id, full_name, avatar_url, role)
          `)
          .eq('organization_id', orgId)
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth)

        if (!isAdminOrDispatcher) {
          planQuery = planQuery.eq('employee_id', profile.id)
        }

        const { data, error } = await planQuery
        if (error) {
          hadError = true
          console.error('[useCalendarEvents] plans fetch failed:', {
            ...normalizeError(error),
            orgId,
            userId,
          })
        } else {
          planData = data ?? []
        }
      } catch (err) {
        hadError = true
        console.error('[useCalendarEvents] plans threw:', normalizeError(err))
      }

      try {
        // Map plans to CalendarEvent shape
        const mappedPlans: CalendarEvent[] = (planData ?? []).map((plan: any) => ({
          id: `plan-${plan.id}`,
          organization_id: orgId,
          creator_id: 'system',
          title: plan.route || 'Work Shift',
          description: `Shift at ${plan.location || 'site'}. Status: ${plan.status}`,
          event_type: 'shift',
          start_time: plan.start_time,
          end_time: plan.end_time,
          is_all_day: false,
          color: EVENT_COLORS.shift,
          location: plan.location,
          created_at: plan.start_time,
          updated_at: plan.start_time,
          members: plan.employee ? [{ user: plan.employee }] : []
        }))

        // Final Filter for Employees (Calendar Events)
        let finalEvents = calData || []
        if (!isAdminOrDispatcher && userId) {
           finalEvents = finalEvents.filter((e: any) =>
             e.creator_id === userId ||
             e.event_type === 'birthday' ||
             e.event_type === 'holiday' ||
             e.members?.some((m: any) => m.user?.id === userId)
           )
        }

        setEvents([...finalEvents, ...mappedPlans])
      } catch (err) {
        console.error('[useCalendarEvents] mapping/setState threw:', normalizeError(err))
        hadError = true
      } finally {
        setIsLoading(false)
        if (hadError) {
          // Non-blocking user signal so the screen isn't silently empty
          toast.error(locale === 'de'
            ? 'Kalender konnte nicht vollständig geladen werden. Details in der Konsole.'
            : 'The calendar could not be loaded completely. Details in the console.')
        }
      }
    }

    fetchAll()

    // Real-time listener for both tables
    const channel = supabase
      .channel(`calendar-updates-${orgId}-${year}-${month}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `organization_id=eq.${orgId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `organization_id=eq.${orgId}` }, () => fetchAll())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, orgId, userId, year, month, profile?.role])

  // Advanced Conflict Detection: detect if any events/shifts overlap for the SAME user
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    
    // 1. Group by date first
    events.forEach(event => {
      const dateKey = event.start_time.split('T')[0]
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push({ ...event }) // Clone to avoid mutation
    })

    // 2. For each date, sort and detect conflicts in O(N log N)
    Object.keys(map).forEach(dateKey => {
      const dayEvents = map[dateKey].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )

      // Use a simple tracking map for member end times
      const memberLastEnd: Record<string, number> = {}

      dayEvents.forEach(event => {
        const start = new Date(event.start_time).getTime()
        const end = new Date(event.end_time || event.start_time).getTime()
        const members = event.members?.map((m: any) => m.user?.id) || ['unassigned']

        let conflict = false
        members.forEach(memberId => {
          if (memberLastEnd[memberId] && memberLastEnd[memberId] > start) {
            conflict = true
          }
          memberLastEnd[memberId] = Math.max(memberLastEnd[memberId] || 0, end)
        })

        if (conflict) {
          (event as any).hasConflict = true
        }
      })
    })

    return map
  }, [events])

  return { events, eventsByDate, isLoading }
}
