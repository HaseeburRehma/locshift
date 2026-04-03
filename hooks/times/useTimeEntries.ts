'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchEntries = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)
    
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

    // RBAC: Employees only see their own mission history
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
      console.error('[useTimeEntries] Operational fetch error:', error)
    }
    setLoading(false)
  }, [profile, isAdmin, isDispatcher, filter, supabase])

  useEffect(() => {
    fetchEntries()

    if (!profile?.organization_id) return

    // Real-time synchronization for mission history / time records
    const channel = supabase
      .channel(`time-entries-sync-hub-${profile.organization_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, (payload: any) => {
        console.log('[useTimeEntries] Live operational sync update:', payload)
        fetchEntries(true) // Silent background refresh for zero-delay mission reflection
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useTimeEntries] Successfully connected to operational stream')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, isAdmin, isDispatcher, filter, fetchEntries, supabase])

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
