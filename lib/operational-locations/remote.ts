/**
 * Server-side Betriebsstellen search (billing spec section 9).
 *
 * The RIL100 list has ~24 000 operating points, so no screen loads the whole
 * list: pickers ask the database (RPC search_operational_locations, name ↔
 * code in both directions, ranked) and only load what they show.
 *
 * Before migration 20261125120000 is applied the RPC does not exist; then a
 * plain ilike query plus the shared client-side ranking is used instead.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { OperationalLocation } from '@/lib/types'
import { searchLocations } from './parse'

export interface RemoteSearchOptions {
  limit?: number
  includeInactive?: boolean
}

const byId = new Map<string, OperationalLocation>()

/** Remembers rows so a selected id can be shown without another request. */
export function rememberLocations(rows: OperationalLocation[]): void {
  for (const r of rows) byId.set(r.id, r)
}

export function cachedLocation(id: string | null | undefined): OperationalLocation | null {
  return id ? byId.get(id) ?? null : null
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  return error.code === 'PGRST202' || error.code === '42883' || /search_operational_locations/.test(error.message ?? '')
}

/** Escapes characters with a meaning in PostgREST filters / LIKE. */
function plain(q: string): string {
  return q.replace(/[%_,()*\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function searchLocationsRemote(
  supabase: SupabaseClient,
  organizationId: string,
  query: string,
  opts: RemoteSearchOptions = {},
): Promise<OperationalLocation[]> {
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100)
  const q = query.trim()

  if (!q) {
    // No query yet: the organisation's own Betriebsstellen (not from the
    // RIL100 import) — the ones the team uses every day.
    let own = supabase.from('operational_locations').select('*').eq('organization_id', organizationId)
    if (!opts.includeInactive) own = own.eq('is_active', true)
    const { data, error } = await own.is('source', null).order('name').limit(limit)
    if (!error) {
      rememberLocations((data ?? []) as OperationalLocation[])
      return (data ?? []) as OperationalLocation[]
    }
    let all = supabase.from('operational_locations').select('*').eq('organization_id', organizationId)
    if (!opts.includeInactive) all = all.eq('is_active', true)
    const res = await all.order('name').limit(limit)
    if (res.error) throw res.error
    rememberLocations((res.data ?? []) as OperationalLocation[])
    return (res.data ?? []) as OperationalLocation[]
  }

  const { data, error } = await supabase.rpc('search_operational_locations', {
    p_query: q,
    p_limit: limit,
    p_include_inactive: !!opts.includeInactive,
  })
  if (!error) {
    rememberLocations((data ?? []) as OperationalLocation[])
    return (data ?? []) as OperationalLocation[]
  }
  if (!isMissingRpc(error)) throw error

  // Fallback without the RPC.
  const p = plain(q)
  if (!p) return []
  let fb = supabase
    .from('operational_locations')
    .select('*')
    .eq('organization_id', organizationId)
    .or(`name.ilike.*${p}*,short_code.ilike.${p}*`)
  if (!opts.includeInactive) fb = fb.eq('is_active', true)
  const res = await fb.order('name').limit(300)
  if (res.error) throw res.error
  const ranked = searchLocations((res.data ?? []) as OperationalLocation[], q, limit)
  rememberLocations(ranked)
  return ranked
}

/** Loads the given ids (e.g. the selected start / destination). */
export async function fetchLocationsByIds(supabase: SupabaseClient, ids: string[]): Promise<OperationalLocation[]> {
  const missing = [...new Set(ids.filter((id) => id && !byId.has(id)))]
  if (missing.length) {
    const { data, error } = await supabase.from('operational_locations').select('*').in('id', missing)
    if (error) throw error
    rememberLocations((data ?? []) as OperationalLocation[])
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as OperationalLocation[]
}
