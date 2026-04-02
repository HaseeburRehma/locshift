import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { useUser } from '@/lib/user-context'

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const { profile: currentUser } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser?.organization_id) return

    const fetchProfiles = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', currentUser.organization_id)
        .order('full_name', { ascending: true })

      if (!error) setProfiles(data || [])
      setLoading(false)
    }

    fetchProfiles()

    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles', 
        filter: `organization_id=eq.${currentUser.organization_id}` 
      }, () => fetchProfiles())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser?.organization_id])

  return { profiles, loading }
}
