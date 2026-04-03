'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry, Profile } from '@/lib/types'
import { useUser } from '@/lib/user-context'

export interface ActiveShift extends TimeEntry {
  employee: Profile
}

export function useActiveShifts() {
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const fetchActive = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    const { data, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        employee:profiles!employee_id(id, full_name, avatar_url, role)
      `)
      .eq('organization_id', profile.organization_id)
      .is('end_time', null)

    if (error) {
      console.error('[useActiveShifts] Operational monitor error:', error)
      setLoading(false)
      return
    }

    setActiveShifts(data || [])
    setLoading(false)
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchActive()

    if (!profile?.organization_id) return

    // Real-time listener for current organization's active mission shifts
    // Performs 'silent' synchronizaton to prevent UI flicker on admin dashboard
    const channel = supabase
      .channel(`active-shifts-monitor-hub-${profile.organization_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, (payload: any) => {
        console.log('[useActiveShifts] Personnel status update:', payload)
        fetchActive(true) // Silent refetch for mission-critical monitoring
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useActiveShifts] Successfully connected to live personnel stream')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchActive, supabase])

  return { activeShifts, loading, refresh: fetchActive }
}
