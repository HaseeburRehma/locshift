import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller, organizationOf } from '@/lib/supabase/api-auth'
import { LOKSHIFT_ROLES } from '@/lib/rbac/roles'

// PATCH /api/users/role — an admin changes the role of another member of
// their own organisation.
export async function PATCH(request: Request) {
  try {
    const caller = await getApiCaller()
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (caller.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 })
    }

    let body: { userId?: unknown; role?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { userId, role } = body

    if (typeof userId !== 'string' || typeof role !== 'string' || !userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }
    if (!(LOKSHIFT_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Only members of the caller's own organisation; never yourself.
    if (userId === caller.id) {
      return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })
    }
    if (!caller.organizationId || (await organizationOf(userId)) !== caller.organizationId) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    const { error } = await createAdminClient()
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true, role })
  } catch (error: any) {
    console.error('[UpdateRole] Error:', error)
    return NextResponse.json({ error: 'Could not update role' }, { status: 500 })
  }
}
