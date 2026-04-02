import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { startOfWeek, endOfWeek } from 'date-fns'

export type TimeFilter = 'all' | 'pending' | 'approved' | 'this_week'

export function useTimeEntries(filter: TimeFilter = 'all') {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.organization_id) return

    const fetchEntries = async () => {
      setLoading(true)
      
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          employee:profiles!employee_id(id, full_name, avatar_url, role),
          customer:customers(id, name),
          verifier:profiles!verified_by(id, full_name)
        `)
        .eq('organization_id', profile.organization_id)
        .order('date', { ascending: false })

      // RBAC: Employees only see their own
      if (!isAdmin && !isDispatcher) {
        query = query.eq('employee_id', profile.id)
      }

      // Filter Logic
      if (filter === 'pending')   query = query.eq('is_verified', false)
      if (filter === 'approved')  query = query.eq('is_verified', true)
      if (filter === 'this_week') {
        const now = new Date()
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString()
        query = query.gte('date', weekStart).lte('date', weekEnd)
      }

      const { data, error } = await query
      if (!error) {
        setEntries(data as any || [])
      } else {
        console.error('[useTimeEntries] Fetch error:', error)
      }
      setLoading(false)
    }

    fetchEntries()

    // Real-time synchronization
    const channel = supabase
      .channel('time-entries-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => fetchEntries())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, isAdmin, isDispatcher, filter, supabase])

  return { entries, loading }
}
