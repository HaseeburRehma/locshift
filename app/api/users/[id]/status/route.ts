/**
 * PATCH /api/users/[id]/status
 *
 * Toggle a user's `is_active` flag. Only admins (same organization) may
 * perform this — the spec calls active/inactive a user-management concern,
 * not a self-serve setting.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetId } = await context.params
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    if (!serviceKey) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }
    const admin = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: caller } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', session.user.id)
      .single()

    if (caller?.role !== 'admin') {
      return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    }

    const { data: target } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', targetId)
      .single()

    if (!target || target.organization_id !== caller.organization_id) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    const body = (await request.json()) as { is_active?: boolean }
    if (typeof body.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active boolean required' }, { status: 400 })
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_active: body.is_active, updated_at: new Date().toISOString() } as any)
      .eq('id', targetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_active: body.is_active })
  } catch (err: any) {
    console.error('[PATCH /api/users/:id/status] Unexpected:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
