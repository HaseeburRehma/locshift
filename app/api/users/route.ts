//app/api/users/route.ts

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Helper: initialize admin client
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key || key === 'your_key_here') throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET() {
  try {
    // 1. Read session from cookie — instant, no network call
    const supabase = await createClient()
    // getUser() verifies the JWT with the auth server (getSession() trusts the cookie).
    const { data: { user: verifiedUser } } = await supabase.auth.getUser()
    const session = verifiedUser ? { user: verifiedUser } : null

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check caller's role via admin client (bypasses RLS, fast)
    const adminClient = getAdminClient()
    const { data: callerProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('[GetUsers] profile lookup error:', profileError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const callerRole = callerProfile?.role
    if (callerRole !== 'admin' && callerRole !== 'manager') {
      return NextResponse.json({ error: 'Forbidden. Admin/Manager access required.' }, { status: 403 })
    }

    // 3. List all users via admin client. `is_active` powers the
    //    activate/deactivate toggle in the management panel.
    // Own organisation only (the service role would otherwise list every tenant).
    const { data: me } = await adminClient.from('profiles').select('organization_id').eq('id', session.user.id).maybeSingle()
    if (!me?.organization_id) return NextResponse.json([])
    const { data, error } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('organization_id', me.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GetUsers] admin query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('[GetUsers] Unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
