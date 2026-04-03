'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WorkingTimeModel } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { toast } from 'sonner'

export function useWorkModels() {
  const [models, setModels] = useState<WorkingTimeModel[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const fetchModels = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    const { data, error } = await supabase
      .from('working_time_models')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true })

    if (error) {
      console.error('[useWorkModels] Fetch error:', error)
      toast.error('Failed to load work models')
    } else {
      setModels(data || [])
    }
    setLoading(false)
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchModels()

    if (!profile?.organization_id) return

    const channel = supabase
      .channel(`work-models-sync-${profile.organization_id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'working_time_models', 
        filter: `organization_id=eq.${profile.organization_id}` 
      }, () => fetchModels(true))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, fetchModels, supabase])

  const createModel = async (data: Partial<WorkingTimeModel>) => {
    if (!profile?.organization_id) return
    try {
      const { data: newModel, error } = await supabase
        .from('working_time_models')
        .insert({
           ...data,
           organization_id: profile.organization_id
        })
        .select()
        .single()

      if (error) throw error
      
      setModels(prev => [...prev, newModel].sort((a,b) => a.name.localeCompare(b.name)))
      toast.success('Work model created')
      return newModel
    } catch (err: any) {
      toast.error(err.message || 'Failed to create model')
      return null
    }
  }

  const updateModel = async (id: string, updates: Partial<WorkingTimeModel>) => {
    try {
      const { data: updatedModel, error } = await supabase
        .from('working_time_models')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      
      setModels(prev => prev.map(m => m.id === id ? updatedModel : m))
      toast.success('Work model updated')
      return updatedModel
    } catch (err: any) {
      toast.error(err.message || 'Failed to update model')
      return null
    }
  }

  const deleteModel = async (id: string) => {
    try {
      const { error } = await supabase.from('working_time_models').delete().eq('id', id)
      if (error) throw error
      
      setModels(prev => prev.filter(m => m.id !== id))
      toast.success('Work model deleted')
      return true
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete model')
      return false
    }
  }

  return { models, loading, createModel, updateModel, deleteModel, refresh: fetchModels }
}
