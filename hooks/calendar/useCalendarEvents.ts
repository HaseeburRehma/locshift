import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent, EVENT_COLORS } from '@/lib/types'
import { useUser } from '@/lib/user-context'

export function useCalendarEvents(year: number, month: number) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const isAdminOrDispatcher = profile?.role === 'admin' || profile?.role === 'dispatcher'
  const orgId = profile?.organization_id
  const userId = profile?.id

  useEffect(() => {
    if (!orgId || !userId) return

    const fetchAll = async () => {
      setIsLoading(true)
      
      const startOfMonth = new Date(year, month - 1, 1).toISOString()
      const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

      try {
        // 1. Fetch from calendar_events with member filtering for employees
        let calQuery = supabase
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

        // Employees only see events they created or are members of, plus public ones
        if (!isAdminOrDispatcher) {
          // This is a simplified filter; real DB policy handles some, but frontend needs to filter merged data
          // We won't change the query but we'll filter in JS to handle the complex "member" logic reliably
        }

        const { data: calData, error: calError } = await calQuery
        if (calError) throw calError

        // 2. Fetch from plans (existing shifts)
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

        // Employees only see their own plans
        if (!isAdminOrDispatcher) {
            planQuery = planQuery.eq('employee_id', profile.id)
        }

        const { data: planData, error: planError } = await planQuery
        if (planError) throw planError

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

      } catch (err: any) {
        console.error('[useCalendarEvents] Fetch error detail:', {
          message: err.message,
          error: err,
          orgId,
          userId
        })
      } finally {
        setIsLoading(false)
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
