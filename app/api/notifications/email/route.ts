/**
 * POST /api/notifications/email
 *
 * Send a transactional email to one user. The body shape is intentionally
 * narrow — it's an internal helper called by lib/notifications/service.ts
 * after an in-app notification is persisted, NOT a general-purpose mailer
 * exposed to clients.
 *
 * Security: only an authenticated caller from the same organization can
 * trigger a send to a target user.
 */

import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmailViaResend } from '@/lib/email/resend'

interface Body {
  userId: string
  subject: string
  message: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Body
    if (!body?.userId || !body?.subject || !body?.message) {
      return NextResponse.json({ error: 'userId, subject and message required' }, { status: 400 })
    }

    // Look up the caller's organization. Cross-org sends are not allowed.
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!callerProfile?.organization_id) {
      return NextResponse.json({ error: 'No organization context' }, { status: 403 })
    }

    // Look up the target email — must share the same organization.
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('email, organization_id, full_name')
      .eq('id', body.userId)
      .single()

    if (!targetProfile?.email) {
      return NextResponse.json({ error: 'Target user has no email on file' }, { status: 404 })
    }
    if (targetProfile.organization_id !== callerProfile.organization_id) {
      return NextResponse.json({ error: 'Cross-organization send blocked' }, { status: 403 })
    }

    const result = await sendEmailViaResend({
      to: targetProfile.email,
      subject: body.subject,
      text: body.message,
    })

    if (!result.success) {
      // Still 200 — the in-app notification was already persisted; the email
      // is best-effort. We just report the reason so callers can log it.
      return NextResponse.json({ success: false, error: result.error }, { status: 200 })
    }
    return NextResponse.json({ success: true, id: result.id })
  } catch (err: any) {
    console.error('[POST /api/notifications/email] Unexpected:', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
