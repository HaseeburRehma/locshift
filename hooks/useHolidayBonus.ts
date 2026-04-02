import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { HolidayBonus } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export function useHolidayBonus() {
  const [bonuses, setBonuses] = useState<HolidayBonus[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher } = useUser()
  const supabase = createClient()

  const fetchBonuses = useCallback(async () => {
    if (!profile?.organization_id) return
    setLoading(true)

    let query = supabase
      .from('holiday_bonuses')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (!isAdmin && !isDispatcher) {
      query = query.eq('employee_id', profile.id)
    }

    const { data, error } = await query
    if (!error) {
      setBonuses(data || [])
    } else {
      console.error('[useHolidayBonus] Fetch error:', error)
    }
    setLoading(false)
  }, [profile, isAdmin, isDispatcher, supabase])

  useEffect(() => {
    fetchBonuses()

    if (!profile?.organization_id) return

    const channel = supabase
      .channel('holiday-bonuses-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'holiday_bonuses', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => fetchBonuses())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, fetchBonuses, supabase])

  const createHolidayBonus = async (data: Partial<HolidayBonus>) => {
    if (!profile?.organization_id) return
    try {
      const { error } = await supabase.from('holiday_bonuses').insert({
        ...data,
        organization_id: profile.organization_id
      })
      if (error) throw error
      toast.success('Holiday bonus distributed')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to distribute bonus')
      return false
    }
  }

  const deleteHolidayBonus = async (id: string) => {
    try {
      const { error } = await supabase.from('holiday_bonuses').delete().eq('id', id)
      if (error) throw error
      toast.success('Bonus deleted')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bonus')
      return false
    }
  }

  const totalPaidThisYear = bonuses
    .filter(b => new Date(b.created_at).getFullYear() === new Date().getFullYear())
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

  return { 
    bonuses, 
    loading, 
    createHolidayBonus, 
    deleteHolidayBonus, 
    totalPaidThisYear,
    refresh: fetchBonuses 
  }
}
