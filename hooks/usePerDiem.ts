'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PerDiem } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { actionToasts } from '@/lib/toast/actionToasts'
import { sendNotification } from '@/lib/notifications/service'

export function usePerDiem() {
  const [perDiems, setPerDiems] = useState<PerDiem[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher } = useUser()
  const supabase = createClient()

  const fetchPerDiems = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    let query = supabase
      .from('per_diems')
      .select('*, plan:plans(*, customer:customers(*))')
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })

    if (!isAdmin && !isDispatcher) {
      query = query.eq('employee_id', profile.id)
    }

    const { data, error } = await query
    if (!error) {
      setPerDiems(data || [])
    } else {
      console.error('[usePerDiem] Detailed Fetch Error:', JSON.stringify(error, null, 2))
      toast.error('Failed to sync per diem data. Please ensure the latest database migrations are applied.')
    }
    setLoading(false)
  }, [profile, isAdmin, isDispatcher, supabase])

  useEffect(() => {
    fetchPerDiems()
    if (!profile?.organization_id) return

    const channel = supabase
      .channel(`per-diems-sync-hub-${profile.organization_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'per_diems',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        console.log('[usePerDiem] Operational status update:', payload)
        // Silent refetch for parity with other users
        fetchPerDiems(true)
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log('[usePerDiem] Connected to per-diems HUD stream')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [profile, fetchPerDiems, supabase])

  const createPerDiem = async (data: Partial<PerDiem>) => {
    if (!profile?.id || !profile?.organization_id) return
    try {
      const { data: newEntry, error } = await supabase
        .from('per_diems')
        .insert({
           ...data,
           employee_id: profile.id,
           organization_id: profile.organization_id,
           status: 'submitted'
        })
        .select()
        .single()

      if (error) throw error
      
      // Immediate local sync for zero-delay mission reflection
      setPerDiems(prev => [newEntry, ...prev])
      actionToasts.perDiemSubmitted()
      return true
    } catch (err: any) {
      console.error('[usePerDiem] Detailed Create Error:', err)
      actionToasts.genericError(err.message || 'Failed to submit claim')
      return false
    }
  }

  const updatePerDiemStatus = async (id: string, status: 'approved' | 'rejected') => {
    const perDiem = perDiems.find(p => p.id === id)

    // Optimistic local update for Command Center responsiveness
    setPerDiems(prev => prev.map(p => p.id === id ? { ...p, status } : p))

    try {
      const { error } = await supabase
        .from('per_diems')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Notify the employee about the audit result
      if (perDiem?.employee_id) {
        await sendNotification({
          userId: perDiem.employee_id,
          title: status === 'approved' ? '✅ Per Diem Approved' : '❌ Per Diem Rejected',
          message: `Your per diem claim has been ${status}.`,
          module: 'plans',
          moduleId: id
        })
      }

      status === 'approved' ? actionToasts.perDiemApproved() : actionToasts.perDiemRejected()
      return true
    } catch (err: any) {
      // Rollback logic
      fetchPerDiems(true)
      actionToasts.genericError(err.message)
      return false
    }
  }

  return { perDiems, loading, createPerDiem, updatePerDiemStatus, refresh: fetchPerDiems }
}
