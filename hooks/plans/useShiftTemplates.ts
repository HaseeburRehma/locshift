'use client'

/**
 * Shift-Template hook — Phase 2 / Change-Request #8 (Rheinmaasrail).
 *
 * Templates store the reusable pieces of a Plan (customer, route,
 * location, time window, notes, overnight stay + hotel). Dispatchers
 * save a template from the PlanForm once, then pick it from a dropdown
 * to pre-fill subsequent shift creations.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import type { ShiftTemplate } from '@/lib/types'
import { toast } from 'sonner'

type NewTemplateInput = Omit<
  ShiftTemplate,
  'id' | 'organization_id' | 'creator_id' | 'created_at' | 'updated_at' | 'customer'
>

export function useShiftTemplates() {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const fetchTemplates = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    const { data, error } = await supabase
      .from('shift_templates')
      .select('*, customer:customers(id, name)')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useShiftTemplates] fetch error:', error)
    } else {
      setTemplates((data as ShiftTemplate[]) ?? [])
    }
    setLoading(false)
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchTemplates()

    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`shift-templates-${profile.organization_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shift_templates',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        () => fetchTemplates(true),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.organization_id, fetchTemplates, supabase])

  const createTemplate = useCallback(async (input: NewTemplateInput) => {
    if (!profile?.organization_id || !profile.id) return null

    const { data, error } = await supabase
      .from('shift_templates')
      .insert({
        ...input,
        organization_id: profile.organization_id,
        creator_id: profile.id,
      })
      .select('*, customer:customers(id, name)')
      .single()

    if (error) {
      console.error('[useShiftTemplates] create error:', error)
      toast.error('Vorlage konnte nicht gespeichert werden')
      return null
    }

    toast.success(`Vorlage „${data.name}" gespeichert`)
    setTemplates(prev => [data as ShiftTemplate, ...prev])
    return data as ShiftTemplate
  }, [profile?.id, profile?.organization_id, supabase])

  const deleteTemplate = useCallback(async (id: string) => {
    const previous = templates
    setTemplates(prev => prev.filter(t => t.id !== id))

    const { error } = await supabase
      .from('shift_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[useShiftTemplates] delete error:', error)
      toast.error('Vorlage konnte nicht gelöscht werden')
      setTemplates(previous)
      return false
    }

    toast.success('Vorlage gelöscht')
    return true
  }, [templates, supabase])

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    refresh: fetchTemplates,
  }
}
