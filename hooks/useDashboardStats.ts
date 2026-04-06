import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { startOfWeek, endOfWeek, format, startOfDay } from 'date-fns'

export function useDashboardStats() {
  const { profile, isAdmin, isDispatcher } = useUser()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
    const startOfToday = startOfDay(now).toISOString()

    try {
      if (isAdmin || isDispatcher) {
        const [
          { count: activeCount },
          { count: openPlansCount },
          { data: timeEntries },
          { count: unreadCount }
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true })
            .eq('is_active', true).eq('organization_id', profile.organization_id),
          supabase.from('plans').select('*', { count: 'exact', head: true })
            .in('status', ['assigned', 'draft']).eq('organization_id', profile.organization_id),
          supabase.from('time_entries').select('net_hours')
            .eq('organization_id', profile.organization_id).gte('date', firstDayOfMonth.split('T')[0]),
          supabase.from('notifications').select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id).eq('is_read', false)
        ])

        const totalHours = (timeEntries || []).reduce((acc: number, curr: any) =>
          acc + (Number(curr.net_hours) || 0), 0)

        const { data: upcomingShifts } = await supabase
          .from('plans')
          .select('*, employee:profiles!employee_id(*)')
          .eq('organization_id', profile.organization_id)
          .gte('start_time', startOfToday)
          .order('start_time', { ascending: true })
          .limit(5)

        const { data: upcomingEvents } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('organization_id', profile.organization_id)
          .gte('start_time', startOfToday)
          .order('start_time', { ascending: true })
          .limit(3)

        const { data: activeEmployeesList } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .eq('organization_id', profile.organization_id)
          .eq('is_active', true)
          .limit(6)

        setStats({
          activeEmployees: activeCount || 0,
          openPlans: openPlansCount || 0,
          totalHours: Math.round(totalHours),
          unreadChats: unreadCount || 0,
          upcomingShifts: upcomingShifts || [],
          upcomingEvents: upcomingEvents || [],
          activeEmployeesList: activeEmployeesList || []
        })
      } else {
        const [
          { data: nextShifts },
          { data: userTimeEntries },
          { data: weeklyEntries },
          { data: userPerDiems }
        ] = await Promise.all([
          supabase.from('plans').select('*, customer:customers(*)').eq('employee_id', profile.id)
            .gte('start_time', now.toISOString()).order('start_time', { ascending: true }).limit(2),
          supabase.from('time_entries').select('net_hours').eq('employee_id', profile.id)
            .gte('date', firstDayOfMonth.split('T')[0]),
          supabase.from('time_entries').select('net_hours').eq('employee_id', profile.id)
            .gte('date', weekStart.split('T')[0])
            .lte('date', weekEnd.split('T')[0]),
          supabase.from('per_diems').select('amount').eq('employee_id', profile.id)
            .gte('date', firstDayOfMonth.split('T')[0])
        ])

        const actualHours = (userTimeEntries || []).reduce((acc: number, curr: any) =>
          acc + (Number(curr.net_hours) || 0), 0)
        
        const weeklyHours = (weeklyEntries || []).reduce((acc: number, curr: any) =>
          acc + (Number(curr.net_hours) || 0), 0)

        const perDiemTotal = (userPerDiems || []).reduce((acc: number, curr: any) =>
          acc + (Number(curr.amount) || 0), 0)
        
        const balance = actualHours - (profile.target_hours || 160) // assuming monthly balance if comparing to monthly entries

        setStats({ 
          nextShifts: nextShifts || [],
          hoursBalance: Math.round(balance), 
          monthlyPerDiem: perDiemTotal,
          weeklyHours: weeklyHours,
          targetWeeklyHours: 40 // Default to 40 for now or derive from target_hours/4
        })
      }
    } catch (err) {
      console.error('[useDashboardStats] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin, isDispatcher])

  useEffect(() => {
    if (!profile) return
    fetchStats()

    const channel = supabase
      .channel(`dashboard-stats-${profile.organization_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}` }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries',
        filter: `organization_id=eq.${profile.organization_id}` }, fetchStats)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, isAdmin, isDispatcher, fetchStats])

  return { stats, loading, refresh: fetchStats }
}
