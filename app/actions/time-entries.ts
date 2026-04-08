'use server'

import { createClient as createServerClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS restrictions on is_verified field
function getAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function updateTimeEntryStatus(
  id: string,
  isVerified: boolean,
  verifiedBy: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAdminClient()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
       console.warn('[updateTimeEntryStatus] Missing SUPABASE_SERVICE_ROLE_KEY. Update may fail due to RLS.')
    }

    const { error, data } = await supabase
      .from('time_entries')
      .update({
        is_verified: isVerified,
        verified_by: verifiedBy,
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('[updateTimeEntryStatus] Supabase error:', error)
      return { success: false, error: error.message || 'Supabase error occurred' }
    }

    if (!data || data.length === 0) {
      console.error('[updateTimeEntryStatus] No rows updated for ID:', id)
      return { success: false, error: 'No time entry found or unable to update due to permissions' }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[updateTimeEntryStatus] Exception:', err)
    return { success: false, error: err?.message || String(err) || 'Unknown error' }
  }
}
