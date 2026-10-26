/**
 * PATCH /api/users/[id]/status
 *
 * Toggle a user's `is_active` flag. Only active admins (same organization)
 * may perform this — the spec calls active/inactive a user-management
 * concern, not a self-serve setting.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller, organizationOf } from '@/lib/supabase/api-auth'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetId } = await context.params
    // getApiCaller verifies the JWT and rejects deactivated accounts.
    const caller = await getApiCaller()
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (caller.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    }
    if (targetId === caller.id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 })
    }
    if (!caller.organizationId || (await organizationOf(targetId)) !== caller.organizationId) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    let body: { is_active?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active boolean required' }, { status: 400 })
    }

    const { error } = await createAdminClient()
      .from('profiles')
      .update({ is_active: body.is_active, updated_at: new Date().toISOString() } as any)
      .eq('id', targetId)

    if (error) {
      console.error('[PATCH /api/users/:id/status]', error.message)
      return NextResponse.json({ error: 'Could not update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_active: body.is_active })
  } catch (err: any) {
    console.error('[PATCH /api/users/:id/status] Unexpected:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
