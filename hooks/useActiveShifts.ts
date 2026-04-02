import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (!profile?.organization_id) return

    const fetchActive = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          employee:profiles!employee_id(id, full_name, avatar_url, role)
        `)
        .eq('organization_id', profile.organization_id)
        .is('end_time', null)

      if (error) {
        console.error('[useActiveShifts] Fetch error:', error)
        return
      }

      setActiveShifts(data || [])
      setLoading(false)
    }

    fetchActive()

    // Real-time listener for current organization's shifts
    const channel = supabase
      .channel('active-shifts-monitor')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'time_entries', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => fetchActive())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, supabase])

  return { activeShifts, loading }
}
