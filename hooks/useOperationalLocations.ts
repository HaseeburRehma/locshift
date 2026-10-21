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
import { fetchAllPages } from '@/lib/supabase/paginate'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

type NewLocationInput = {
  name: string
  short_code?: string | null
  type: OperationalLocationType
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  // CR #1 follow-up — optional contact phone for the Betriebsstelle.
  phone_number?: string | null
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

    // Several hundred Betriebsstellen are imported — page past PostgREST's
    // 1000-row default (id as tie-breaker keeps the pages stable).
    const orgId = profile.organization_id
    const { data, error } = await fetchAllPages<OperationalLocation>((from, to) =>
      supabase
        .from('operational_locations')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to),
    )
    if (error) {
      // A page failed mid-way: keep the previous list instead of replacing
      // it with a partial one.
      console.error('[useOperationalLocations] fetch error:', error)
    } else {
      setLocations(data)
    }
    setLoading(false)
  }, [profile?.organization_id, supabase])

  // An import of hundreds of Betriebsstellen fires one realtime event per
  // row — coalesce them into one silent refetch.
  const scheduleRefresh = useCoalescedRefetch(() => fetchLocations(true))

  useEffect(() => {
    fetchLocations()

    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`operational-locations-${profile.organization_id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operational_locations',
          filter: `organization_id=eq.${profile.organization_id}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile?.organization_id, fetchLocations, scheduleRefresh, supabase])

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

  /**
   * Bulk import from the preview (Punkt 12). Inserts in chunks; rows that
   * already exist can be updated instead.
   */
  const importLocations = useCallback(async (
    inserts: NewLocationInput[],
    updates: { id: string; patch: UpdateLocationInput }[],
  ): Promise<{ inserted: number; updated: number; failed: string[] }> => {
    const failed: string[] = []
    let inserted = 0
    let updated = 0
    if (!profile?.organization_id) return { inserted, updated, failed: ['no organization'] }
    for (let i = 0; i < inserts.length; i += 200) {
      const chunk = inserts.slice(i, i + 200).map((r) => ({ ...r, organization_id: profile.organization_id, is_active: r.is_active ?? true }))
      const { data, error } = await supabase.from('operational_locations').insert(chunk).select('id')
      if (error) {
        // Fall back to row-by-row so one bad row doesn't drop the chunk.
        for (const row of chunk) {
          const { error: rowErr } = await supabase.from('operational_locations').insert(row)
          if (rowErr) failed.push(`${row.short_code ? `${row.short_code} ` : ''}${row.name}`)
          else inserted += 1
        }
      } else {
        inserted += data?.length ?? chunk.length
      }
    }
    for (const u of updates) {
      const { error } = await supabase.from('operational_locations').update(u.patch).eq('id', u.id)
      if (error) failed.push(u.patch.name ?? u.id)
      else updated += 1
    }
    await fetchLocations(true)
    return { inserted, updated, failed }
  }, [profile?.organization_id, supabase, fetchLocations])

  return {
    locations,
    loading,
    importLocations,
    createLocation,
    updateLocation,
    toggleActive,
    deleteLocation,
    refresh: fetchLocations,
  }
}
