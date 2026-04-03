'use client'

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

  const fetchBonuses = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

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
      console.error('[useHolidayBonus] Operational fetch error:', error)
    }
    setLoading(false)
  }, [profile, isAdmin, isDispatcher, supabase])

  useEffect(() => {
    fetchBonuses()

    if (!profile?.organization_id) return

    // Real-time synchronization for holiday bonus distribution
    const channel = supabase
      .channel(`holiday-bonuses-sync-hub-${profile.organization_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'holiday_bonuses', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, (payload: any) => {
        console.log('[useHolidayBonus] Live operational update:', payload)
        fetchBonuses(true) // Silent background synchronization
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[useHolidayBonus] Connected to bonus monitoring stream')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile, fetchBonuses, supabase])

  const createHolidayBonus = async (data: Partial<HolidayBonus>) => {
    if (!profile?.organization_id) return
    try {
      const { data: newBonus, error } = await supabase
        .from('holiday_bonuses')
        .insert({
           ...data,
           organization_id: profile.organization_id
        })
        .select()
        .single()

      if (error) throw error

      // Immediate local sync for zero-delay reflection
      setBonuses(prev => [newBonus, ...prev])
      toast.success('Holiday bonus distributed')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to distribute bonus')
      return false
    }
  }

  const deleteHolidayBonus = async (id: string) => {
    // Optimistic local removal for instant responsive feel
    setBonuses(prev => prev.filter(b => b.id !== id))

    try {
      const { error } = await supabase.from('holiday_bonuses').delete().eq('id', id)
      if (error) throw error
      toast.success('Bonus deleted')
      return true
    } catch (err: any) {
      // Rollback on audit failure
      fetchBonuses(true)
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
