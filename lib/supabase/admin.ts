import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client. Server-only: never import from client components —
 * SUPABASE_SERVICE_ROLE_KEY bypasses RLS. Callers must authorise the
 * request themselves before using it.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
