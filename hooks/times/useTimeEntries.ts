'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'
import { berlinDateKey } from '@/lib/time/berlin'
import { addDays } from '@/lib/time/shift-hours'
import { weekStartOf } from '@/lib/plans/week'

export type TimeFilter = 'all' | 'pending' | 'approved' | 'this_week'

export function useTimeEntries(filter: TimeFilter = 'all') {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher } = useUser()
  const supabase = createClient()
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  const fetchEntries = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)
    const orgId = profile.organization_id

    // Rebuilt per page: PostgREST caps each response at 1000 rows.
    const build = (from: number, to: number) => {
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          employee:profiles!employee_id(id, full_name, avatar_url, role),
          customer:customers(id, name),
          verifier:profiles!verified_by(id, full_name)
        `)
        .eq('organization_id', orgId)

      // RBAC: Employees only see their own mission history
      if (!isAdmin && !isDispatcher) {
        query = query.eq('employee_id', profile.id)
      }

      // Filter Logic
      if (filter === 'pending')   query = query.eq('is_verified', false)
      if (filter === 'approved')  query = query.eq('is_verified', true)
      if (filter === 'this_week') {
        // `date` is a calendar date: compare with German week date keys.
        const monday = weekStartOf(berlinDateKey())
        query = query.gte('date', monday).lte('date', addDays(monday, 6))
      }

      return query
        .order('date', { ascending: false })
        .order('id', { ascending: true })
        .range(from, to)
    }

    const { data, error } = await fetchAllPages<TimeEntry>(build)
    if (!error) {
      setEntries(data)
    } else {
      console.error('[useTimeEntries] Operational fetch error:', error)
    }
    setLoading(false)
  }, [profile, isAdmin, isDispatcher, filter, supabase])

  const scheduleRefresh = useCoalescedRefetch(() => fetchEntries(true))

  useEffect(() => {
    fetchEntries()

    if (!profile?.organization_id) return

    // Real-time synchronization for mission history / time records
    // (bursts coalesced into one silent refetch)
    const channel = supabase
      .channel(`time-entries-sync-hub-${profile.organization_id}-${suffix.current}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => scheduleRefresh())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, isAdmin, isDispatcher, filter, fetchEntries, supabase, scheduleRefresh])

  const verifyEntry = useCallback(async (id: string, isVerified: boolean) => {
    // Immediate local update for zero-delay reflection in Command Center
    setEntries(prev => prev.map(e => e.id === id ? { ...e, is_verified: isVerified } : e))

    const { error } = await supabase
      .from('time_entries')
      .update({ is_verified: isVerified, verified_by: profile?.id })
      .eq('id', id)

    if (error) {
      // Rollback on audit failure
      fetchEntries(true)
      throw error
    }
  }, [profile?.id, fetchEntries, supabase])

  return { entries, loading, verifyEntry, refresh: fetchEntries }
}
