'use client'

/**
 * Operational-Location (Betriebsstelle) hook — Phase 3 / Change-Request #1
 * (Rheinmaasrail).
 *
 * Betriebsstellen are the named physical sites a shift departs from or
 * ends at — depots, Bahnhöfe, maintenance yards etc. Admin / dispatcher
 * CRUD them here; the whole org can read so pickers work for all roles.
 *
 * Mirrors the shape of `useShiftTemplates` (realtime subscription, silent
 * refetch, optimistic delete) so behaviour stays consistent.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import type { OperationalLocation, OperationalLocationType } from '@/lib/types'
import { toast } from 'sonner'

type NewLocationInput = {
  name: string
  short_code?: string | null
  type: OperationalLocationType
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
  is_active?: boolean
}

type UpdateLocationInput = Partial<NewLocationInput>

export function useOperationalLocations() {
  const [locations, setLocations] = useState<OperationalLocation[]>([])
  const [loading, setLoading] = useState(true)
  const { profile } = useUser()
  const supabase = createClient()

  const fetchLocations = useCallback(async (isSilent = false) => {
    if (!profile?.organization_id) return
    if (!isSilent) setLoading(true)

    const { data, error } = await supabase
      .from('operational_locations')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true })

    if (error) {
      console.error('[useOperationalLocations] fetch error:', error)
    } else {
      setLocations((data as OperationalLocation[]) ?? [])
    }
    setLoading(false)
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchLocations()

    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`operational-locations-${profile.organization_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_locations',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        () => fetchLocations(true),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.organization_id, fetchLocations, supabase])

  const createLocation = useCallback(async (input: NewLocationInput) => {
    if (!profile?.organization_id) return null

    const { data, error } = await supabase
      .from('operational_locations')
      .insert({
        ...input,
        organization_id: profile.organization_id,
        is_active: input.is_active ?? true,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[useOperationalLocations] create error:', error)
      // Friendly message for the UNIQUE (organization_id, name) violation.
      if ((error as any).code === '23505') {
        toast.error('Eine Betriebsstelle mit diesem Namen existiert bereits')
      } else {
        toast.error('Betriebsstelle konnte nicht angelegt werden')
      }
      return null
    }

    toast.success(`Betriebsstelle „${data.name}" angelegt`)
    setLocations(prev =>
      [...prev, data as OperationalLocation].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    )
    return data as OperationalLocation
  }, [profile?.organization_id, supabase])

  const updateLocation = useCallback(async (id: string, updates: UpdateLocationInput) => {
    const previous = locations
    // Optimistic patch
    setLocations(prev =>
      prev
        .map(l => (l.id === id ? { ...l, ...updates } as OperationalLocation : l))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )

    const { data, error } = await supabase
      .from('operational_locations')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('[useOperationalLocations] update error:', error)
      toast.error('Betriebsstelle konnte nicht aktualisiert werden')
      setLocations(previous)
      return null
    }

    // Sync real server copy (handles generated timestamps etc.)
    setLocations(prev =>
      prev
        .map(l => (l.id === id ? (data as OperationalLocation) : l))
        .sort((a, b) => a.name.localeCompare(b.name)),
    )
    toast.success('Betriebsstelle aktualisiert')
    return data as OperationalLocation
  }, [locations, supabase])

  const toggleActive = useCallback(async (id: string, currentStatus: boolean) => {
    return updateLocation(id, { is_active: !currentStatus })
  }, [updateLocation])

  const deleteLocation = useCallback(async (id: string) => {
    const previous = locations
    setLocations(prev => prev.filter(l => l.id !== id))

    const { error } = await supabase
      .from('operational_locations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[useOperationalLocations] delete error:', error)
      // FK constraint failure is the expected failure mode here — plans or
      // time_entries still reference this row. The ON DELETE SET NULL FKs
      // in the migration handle that gracefully, but surface any other
      // error plainly.
      toast.error('Betriebsstelle konnte nicht gelöscht werden')
      setLocations(previous)
      return false
    }

    toast.success('Betriebsstelle gelöscht')
    return true
  }, [locations, supabase])

  return {
    locations,
    loading,
    createLocation,
    updateLocation,
    toggleActive,
    deleteLocation,
    refresh: fetchLocations,
  }
}
