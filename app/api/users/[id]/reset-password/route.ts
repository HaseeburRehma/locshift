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

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller } from '@/lib/supabase/api-auth'
import { siteOrigin } from '@/lib/security/redirect'

export async function POST(
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

    const admin = createAdminClient()
    const { data: target } = await admin
      .from('profiles')
      .select('id, email, organization_id')
      .eq('id', targetId)
      .maybeSingle()

    if (!target?.email || !caller.organizationId || target.organization_id !== caller.organizationId) {
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
    // configuration). Never built from the Origin header.
    const { error } = await admin.auth.resetPasswordForEmail(target.email, {
      redirectTo: `${siteOrigin(request.url)}/change-password`,
    })

    if (error) {
      // Don't bail — we still set the must_change_password flag, so an
      // admin can dictate a manual reset. Just surface the email issue.
      console.warn('[reset-password] email failed:', error.message)
      return NextResponse.json({ success: true, emailSent: false, warning: 'Reset email could not be sent' })
    }

    return NextResponse.json({ success: true, emailSent: true })
  } catch (err: any) {
    console.error('[POST /api/users/:id/reset-password] Unexpected:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
