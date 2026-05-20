/**
 * POST /api/users/[id]/reset-password
 *
 * Admin-initiated password reset. Two paths are supported:
 *   1) Send a Supabase-hosted reset email to the user (default)
 *   2) Force-set must_change_password=true and rely on the first-login
 *      forced-password-change flow on next sign-in
 *
 * The endpoint always sets must_change_password=true so that the next login
 * still routes through /change-password regardless of which mode succeeded.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(
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
      .select('id, email, organization_id')
      .eq('id', targetId)
      .single()

    if (!target?.email || target.organization_id !== caller.organization_id) {
      return NextResponse.json({ error: 'User not in your organization' }, { status: 404 })
    }

    // Mark for forced change so that whatever path the user takes back in
    // (admin sets a temp password, magic link, etc.) they still get pushed
    // through /change-password.
    await admin
      .from('profiles')
      .update({ must_change_password: true, updated_at: new Date().toISOString() } as any)
      .eq('id', targetId)

    // Use Supabase's transactional reset-password email. The link returns
    // the user to /change-password (configured in Supabase Auth → URL
    // configuration).
    const { error } = await admin.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? request.headers.get('origin') ?? ''}/change-password`,
    })

    if (error) {
      // Don't bail — we still set the must_change_password flag, so an
      // admin can dictate a manual reset. Just surface the email issue.
      return NextResponse.json({
        success: true,
        emailSent: false,
        warning: error.message,
      })
    }

    return NextResponse.json({ success: true, emailSent: true })
  } catch (err: any) {
    console.error('[POST /api/users/:id/reset-password] Unexpected:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
