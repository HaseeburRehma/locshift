import { getApiCaller, organizationOf } from '@/lib/supabase/api-auth'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const caller = await getApiCaller()
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (caller.role !== 'admin' && caller.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager access required.' }, { status: 403 })
    }
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'disponent', 'technician', 'partner_admin', 'partner_agent', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
    }

    // Only members of the caller's own organisation; never yourself.
    if (userId === caller.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }
    if (!caller.organizationId || (await organizationOf(userId)) !== caller.organizationId) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true, role })
  } catch (error: any) {
    console.error('[UpdateRole] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
