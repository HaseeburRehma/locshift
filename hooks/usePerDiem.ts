import { useState, useEffect, useCallback } from 'react'
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

  const fetchPerDiems = useCallback(async () => {
    if (!profile?.organization_id) return
    setLoading(true)

    let query = supabase
      .from('per_diems')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('date', { ascending: false })

    if (!isAdmin && !isDispatcher) {
      query = query.eq('employee_id', profile.id)
    }

    const { data, error } = await query
    if (!error) setPerDiems(data || [])
    else console.error('[usePerDiem] Fetch error:', error)
    setLoading(false)
  }, [profile, isAdmin, isDispatcher])

  useEffect(() => {
    fetchPerDiems()
    if (!profile?.organization_id) return

    const channel = supabase
      .channel(`per-diems-sync-${profile.organization_id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'per_diems',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setPerDiems(prev => [payload.new as PerDiem, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setPerDiems(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
        } else if (payload.eventType === 'DELETE') {
          setPerDiems(prev => prev.filter(p => p.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, fetchPerDiems])

  const createPerDiem = async (data: Partial<PerDiem>) => {
    if (!profile?.id || !profile?.organization_id) return
    try {
      const { error } = await supabase.from('per_diems').insert({
        ...data,
        employee_id: profile.id,
        organization_id: profile.organization_id,
        status: 'submitted'
      })
      if (error) throw error
      actionToasts.perDiemSubmitted()
      return true
    } catch (err: any) {
      actionToasts.genericError(err.message)
      return false
    }
  }

  const updatePerDiemStatus = async (id: string, status: 'approved' | 'rejected') => {
    const perDiem = perDiems.find(p => p.id === id)

    // Optimistic update
    setPerDiems(prev => prev.map(p => p.id === id ? { ...p, status } : p))

    try {
      const { error } = await supabase
        .from('per_diems')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      // Notify the employee
      if (perDiem?.employee_id) {
        await sendNotification({
          userId: perDiem.employee_id,
          title: status === 'approved' ? '✅ Per Diem Approved' : '❌ Per Diem Rejected',
          message: `Your per diem claim${(perDiem as any).amount ? ` of €${(perDiem as any).amount}` : ''} has been ${status}.`,
          module: 'plans',
          moduleId: id
        })
      }

      status === 'approved' ? actionToasts.perDiemApproved() : actionToasts.perDiemRejected()
      return true
    } catch (err: any) {
      // Rollback
      setPerDiems(prev => prev.map(p =>
        p.id === id ? { ...p, status: perDiem?.status || 'submitted' } : p
      ))
      actionToasts.genericError(err.message)
      return false
    }
  }

  return { perDiems, loading, createPerDiem, updatePerDiemStatus, refresh: fetchPerDiems }
}
