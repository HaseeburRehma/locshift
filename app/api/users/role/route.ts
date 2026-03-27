import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    // getSession() reads from cookie — no network call
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check caller's role via admin client (fast, bypasses RLS)
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden: Admin or Manager access required.' }, { status: 403 })
    }

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'disponent', 'technician', 'partner_admin', 'partner_agent', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
    }

    // adminClient is already instantiated above
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
