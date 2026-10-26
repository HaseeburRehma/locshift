/**
 * Server-side caller resolution for API routes that use the service role.
 *
 * `getUser()` verifies the JWT with the auth server (unlike `getSession()`,
 * which trusts the cookie as-is), then the caller's profile is read with the
 * service role. Routes must still check role + organisation of the target.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ApiCaller {
  id: string
  email: string | null
  role: string
  organizationId: string | null
}

export async function getApiCaller(): Promise<ApiCaller | null> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id, role, organization_id, is_active')
    .eq('id', user.id)
    .maybeSingle()
  if (!data || data.is_active === false) return null
  return {
    id: user.id,
    email: user.email ?? null,
    role: String(data.role ?? '').toLowerCase(),
    organizationId: (data.organization_id as string | null) ?? null,
  }
}

/** Organisation of another user (service role), or null if unknown. */
export async function organizationOf(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from('profiles').select('organization_id').eq('id', userId).maybeSingle()
  return (data?.organization_id as string | null) ?? null
}

/** Profile columns a user may never set through generic update endpoints. */
export const PROTECTED_PROFILE_FIELDS = ['id', 'role', 'organization_id', 'is_active', 'email', 'created_at', 'must_change_password'] as const

/** The only columns users may change on their own profile through the API. */
export const SELF_EDITABLE_PROFILE_FIELDS = [
  'full_name', 'first_name', 'last_name', 'phone', 'gender', 'bio',
  'avatar_url', 'notifications_enabled', 'onboarding_completed',
] as const

/** Keeps only allowed keys with primitive values (no nested objects). */
export function pickFields(body: unknown, allowed: readonly string[]): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!allowed.includes(k)) continue
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v
    else if (typeof v === 'string') out[k] = v.slice(0, 2000)
  }
  return out
}
