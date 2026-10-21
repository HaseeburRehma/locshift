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
