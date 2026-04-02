import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeEntry } from '@/lib/types'
import { useUser } from '@/lib/user-context'

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return

    const fetchEntries = async () => {
      setLoading(true)
      let query = supabase
        .from('time_entries')
        .select('*, employee:profiles!employee_id(id, full_name, avatar_url, role)')
        .eq('organization_id', profile.organization_id)
        .order('date', { ascending: false })

      if (!isAdmin && !isDispatcher) {
        query = query.eq('employee_id', profile.id)
      }

      const { data, error } = await query
      if (!error) setEntries(data as any || [])
      setLoading(false)
    }

    fetchEntries()

    const channel = supabase
      .channel('time-entries-realtime')
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
  }, [profile, isAdmin, isDispatcher])

  const verifyEntry = async (entryId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('time_entries')
      .update({ 
        is_verified: true, 
        verified_by: user.id, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', entryId)
    
    if (error) throw error
  }

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)
    
    if (error) throw error
  }

  return { entries, loading, verifyEntry, deleteEntry }
}
