/**
 * PostgREST caps every response at 1000 rows (Supabase `max-rows`), and a
 * capped response looks exactly like a complete one. fetchAllPages()
 * rebuilds the query for every page and walks it with `.range()` until a
 * short page comes back.
 *
 * The builder MUST apply a deterministic order that ends with a unique
 * column (e.g. `.order('date').order('id')`), otherwise rows can be skipped
 * or duplicated between pages.
 *
 *   const { data, error } = await fetchAllPages<TimeEntry>((from, to) =>
 *     supabase.from('time_entries').select('*').eq('employee_id', id)
 *       .order('date').order('id').range(from, to))
 *
 * On error the rows loaded so far are returned together with the error, so
 * callers can decide to keep their previous state instead.
 */

import type { PostgrestError } from '@supabase/supabase-js'

export const PAGE_SIZE = 1000

export interface PagedResult<T> {
  data: T[]
  error: PostgrestError | null
}

export async function fetchAllPages<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  opts: { pageSize?: number; maxRows?: number } = {},
): Promise<PagedResult<T>> {
  const size = opts.pageSize ?? PAGE_SIZE
  const maxRows = opts.maxRows ?? 100_000
  const all: T[] = []
  for (let from = 0; from < maxRows; from += size) {
    const { data, error } = await build(from, from + size - 1)
    if (error) return { data: all, error }
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < size) break
  }
  return { data: all, error: null }
}
