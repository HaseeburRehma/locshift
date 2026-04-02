import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { actionToasts } from '@/lib/toast/actionToasts'
import { sendNotification } from '@/lib/notifications/service'
import { toast } from 'sonner'

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const { profile, isAdmin, isDispatcher, user } = useUser()
  const supabase = createClient()

  const fetchPlans = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    let query = supabase
      .from('plans')
      .select('*, employee:profiles!employee_id(*), customer:customers(*)')
      .eq('organization_id', profile.organization_id)
      .order('start_time', { ascending: false })

    if (!isAdmin && !isDispatcher) {
      query = query.eq('employee_id', profile.id)
    }

    const { data, error } = await query
    if (!error) setPlans(data || [])
    setLoading(false)
  }, [profile, isAdmin, isDispatcher])

  useEffect(() => {
    if (!profile) return
    fetchPlans()

    const channel = supabase
      .channel(`plans-realtime-${profile.organization_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        // Fetch full plan with joins for the new row
        supabase
          .from('plans')
          .select('*, employee:profiles!employee_id(*), customer:customers(*)')
          .eq('id', payload.new.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setPlans(prev => {
                // Remove optimistic temp entry if it exists, then add real one
                const filtered = prev.filter(p => !p.id.startsWith('temp-'))
                if (filtered.find(p => p.id === data.id)) return filtered
                return [data, ...filtered]
              })
            }
          })
        // Notify current user if they are the assigned employee
        if (payload.new.employee_id === profile.id) {
          toast.info('📋 New shift assigned to you', {
            description: 'Check your schedule for details.',
            action: { label: 'View', onClick: () => window.location.href = '/dashboard/plans' }
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        // Update in place — animate the status badge, no refetch
        setPlans(prev => prev.map(p =>
          p.id === payload.new.id ? { ...p, ...payload.new } : p
        ))
        // Show status-change toasts for the creator/admins
        const { old: old_, new: new_ } = payload
        if (old_?.status === 'assigned' && new_?.status === 'confirmed') {
          toast.success('✅ Plan confirmed by employee')
        }
        if (old_?.status === 'assigned' && new_?.status === 'rejected') {
          toast.error('❌ Plan rejected by employee')
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        // Fade out handled by _deleting flag; remove on DB confirm
        setPlans(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, isAdmin, isDispatcher, fetchPlans])

  /** Optimistic status update with rollback */
  const updatePlanStatus = useCallback(async (
    planId: string,
    status: Plan['status'],
    reason?: string
  ) => {
    const previous = plans.find(p => p.id === planId)

    // Optimistic update
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, status, _updating: true } : p
    ))

    const { error } = await supabase
      .from('plans')
      .update({
        status,
        rejection_reason: reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)

    if (error) {
      // Rollback
      setPlans(prev => prev.map(p =>
        p.id === planId ? { ...p, status: previous?.status || 'assigned', _updating: false } : p
      ))
      actionToasts.genericError('Failed to update plan status')
      throw error
    }

    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, _updating: false } : p
    ))

    // Notify the plan creator/admin of the status change
    if (previous?.creator_id && previous.creator_id !== profile?.id) {
      await sendNotification({
        userId: previous.creator_id,
        title: status === 'confirmed' ? '✅ Plan Confirmed' : '❌ Plan Rejected',
        message: `${profile?.full_name} ${status} the shift on ${new Date(previous.start_time).toLocaleDateString()}`,
        module: 'plans',
        moduleId: planId
      })
    }

    if (status === 'confirmed') actionToasts.planConfirmed()
    else if (status === 'rejected') actionToasts.planRejected()
    else if (status === 'cancelled') actionToasts.planCancelled()
  }, [plans, profile, supabase])

  /** Optimistic plan creation with rollback */
  const createPlan = useCallback(async (
    planData: Omit<Plan, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const tempId = `temp-${Date.now()}`
    const optimistic = { ...planData, id: tempId, _loading: true } as any
    setPlans(prev => [optimistic, ...prev])

    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert(planData)
      .select('*, employee:profiles!employee_id(*), customer:customers(*)')
      .single()

    if (error) {
      setPlans(prev => prev.filter(p => p.id !== tempId)) // Rollback
      console.error('[usePlans] Create error:', error)
      throw error
    }

    // Replace optimistic entry with real data
    setPlans(prev => prev.map(p => p.id === tempId ? newPlan : p))
    return newPlan
  }, [supabase])

  /** Optimistic delete with rollback */
  const deletePlan = useCallback(async (planId: string) => {
    const previous = plans.find(p => p.id === planId)

    // Trigger fade-out animation
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, _deleting: true } : p))

    // Wait for animation then remove
    setTimeout(async () => {
      const { error } = await supabase.from('plans').delete().eq('id', planId)
      if (error) {
        // Rollback
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, _deleting: false } : p))
        actionToasts.genericError('Failed to delete plan')
        return
      }
      setPlans(prev => prev.filter(p => p.id !== planId))
      actionToasts.planDeleted()
    }, 300)
  }, [plans, supabase])

  return { plans, loading, updatePlanStatus, createPlan, deletePlan, refresh: fetchPlans }
}
