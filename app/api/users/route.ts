//app/api/users/route.ts
// GET: members of the caller's organisation (admin only — the user
// management panel). `is_active` powers the activate/deactivate toggle.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller } from '@/lib/supabase/api-auth'

export async function GET() {
  try {
    const caller = await getApiCaller()
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (caller.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 })
    }
    if (!caller.organizationId) return NextResponse.json([])

    const { data, error } = await createAdminClient()
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('organization_id', caller.organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GetUsers] admin query error:', error)
      return NextResponse.json({ error: 'Could not load users' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[GetUsers] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
