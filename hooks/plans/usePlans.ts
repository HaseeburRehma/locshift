'use client'

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

  const fetchPlans = useCallback(async (isSilent = false) => {
    if (!profile) return
    if (!isSilent) setLoading(true)
    
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
  }, [profile, isAdmin, isDispatcher, supabase])

  useEffect(() => {
    if (!profile) return
    fetchPlans()

    // Real-time mission synchronization HUD
    const channel = supabase
      .channel(`plans-realtime-hub-${profile.organization_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}`
      }, async (payload: any) => {
        console.log('[usePlans] Real-time INSERT detected:', payload.new.id)
        
        // Fetch full plan with joins for the new row immediately (silent)
        const { data, error } = await supabase
          .from('plans')
          .select('*, employee:profiles!employee_id(*), customer:customers(*)')
          .eq('id', payload.new.id)
          .single()

        if (data && !error) {
          setPlans(prev => {
            // Remove optimistic temp entry if it exists, then add real one
            const filtered = prev.filter(p => !p.id.startsWith('temp-') && p.id !== data.id)
            return [data, ...filtered]
          })
        } else {
          // Fallback silent refetch if single fetch fails
          fetchPlans(true)
        }

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
        // Sync local update from other sources
        setPlans(prev => prev.map(p =>
          p.id === payload.new.id ? { ...p, ...payload.new } : p
        ))
        
        const { old: old_, new: new_ } = payload
        if (old_?.status === 'assigned' && new_?.status === 'confirmed') {
          toast.success('✅ Plan confirmed by employee')
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'plans',
        filter: `organization_id=eq.${profile.organization_id}`
      }, (payload: any) => {
        setPlans(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe((status: `${import('@supabase/supabase-js').REALTIME_SUBSCRIBE_STATES}`) => {
        if (status === 'SUBSCRIBED') {
          console.log('[usePlans] Connected to mission HUD stream')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [profile, isAdmin, isDispatcher, fetchPlans, supabase])

  /** Optimistic status update with rollback */
  const updatePlanStatus = useCallback(async (
    planId: string,
    status: Plan['status'],
    reason?: string
  ) => {
    const previous = plans.find(p => p.id === planId)

    // Immediate local update for zero-delay reflection
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
      // Rollback on error
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
  }, [plans, profile, supabase])

  /** Optimistic plan creation with immediate local sync */
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

    // Replace optimistic entry with real data immediately
    setPlans(prev => prev.map(p => p.id === tempId ? newPlan : p))

    // Notify the assigned employee
    if (newPlan.employee_id) {
      await sendNotification({
        userId: newPlan.employee_id,
        title: '📋 New Shift Assigned',
        message: `You have been assigned a new shift for ${new Date(newPlan.start_time).toLocaleDateString()}. Please confirm.`,
        module: 'plans',
        moduleId: newPlan.id
      })
    }

    return newPlan
  }, [supabase])

  /** Optimistic delete with zero-delay */
  const deletePlan = useCallback(async (planId: string) => {
    const previous = plans.find(p => p.id === planId)

    // Immediate local removal for instant UI reflection
    setPlans(prev => prev.filter(p => p.id !== planId))

    const { error } = await supabase.from('plans').delete().eq('id', planId)
    if (error) {
      // Rollback if delete fails
      if (previous) setPlans(prev => [...prev, previous].sort((a,b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()))
      actionToasts.genericError('Failed to delete plan')
      return
    }
    actionToasts.planDeleted()
  }, [plans, supabase])

  return { plans, loading, updatePlanStatus, createPlan, deletePlan, refresh: fetchPlans }
}
