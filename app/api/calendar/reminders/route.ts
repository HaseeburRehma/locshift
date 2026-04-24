/**
 * Phase 4 · Change Request #7 — Calendar reminder dispatcher
 * -----------------------------------------------------------------------------
 * Cron-friendly endpoint that scans `calendar_events` for reminders whose
 * "fire-at" moment (start_time minus reminder_minutes_before) has passed
 * but whose `reminder_sent_at` is still NULL. For every such event, it fans
 * out an in-app notification to the creator + all invited members via the
 * canonical sendNotification helper, then marks `reminder_sent_at = now()`
 * so subsequent invocations don't re-fire.
 *
 * The route bypasses RLS through the service-role client because it needs
 * to see every organisation. Access is gated by a CRON_SECRET bearer token
 * passed in the Authorization header; if no secret is configured the route
 * falls back to "admin user must be logged in" so it remains usable in dev.
 *
 * Invocation:
 *   GET/POST /api/calendar/reminders
 *   Header:  Authorization: Bearer $CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Ensure this endpoint always runs on the Node runtime (service-role key is
// not available in the edge runtime by design).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RemindableEvent {
  id: string
  organization_id: string
  creator_id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  reminder_minutes_before: number | null
  reminder_sent_at: string | null
}

function getAdminClientOrThrow() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'your_key_here') {
    throw new Error('Supabase admin client is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
  }
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function authorizeRequest(req: NextRequest): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const header = req.headers.get('authorization') || ''
    if (header === `Bearer ${cronSecret}`) return { ok: true }
    return { ok: false, status: 401, reason: 'Invalid or missing bearer token' }
  }
  // Fallback for local / ad-hoc use: require a signed-in admin
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return { ok: false, status: 401, reason: 'Unauthorized — no CRON_SECRET configured and no admin session found' }
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()
  if (profile?.role !== 'admin') {
    return { ok: false, status: 403, reason: 'Admin role required when CRON_SECRET is not configured' }
  }
  return { ok: true }
}

async function dispatch(req: NextRequest) {
  const auth = await authorizeRequest(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status })
  }

  let admin
  try {
    admin = getAdminClientOrThrow()
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  const now = new Date()

  // Pull candidate events — those with reminder configured and not yet fired.
  const { data: candidates, error } = await admin
    .from('calendar_events')
    .select('id, organization_id, creator_id, title, start_time, end_time, location, reminder_minutes_before, reminder_sent_at')
    .not('reminder_minutes_before', 'is', null)
    .is('reminder_sent_at', null)
    .order('start_time', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[calendar/reminders] Candidate fetch failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const due: RemindableEvent[] = (candidates || []).filter((e: RemindableEvent) => {
    if (e.reminder_minutes_before == null) return false
    const start = new Date(e.start_time).getTime()
    const fireAt = start - e.reminder_minutes_before * 60_000
    // Fire if we've crossed the fire-at window AND the event hasn't started
    // more than 5 minutes ago (avoid spamming old events when cron was paused).
    return now.getTime() >= fireAt && start - now.getTime() >= -5 * 60_000
  })

  let dispatched = 0
  const failures: { eventId: string; reason: string }[] = []

  for (const event of due) {
    try {
      // Collect recipients: creator + invited members, deduplicated
      const recipients = new Set<string>()
      if (event.creator_id) recipients.add(event.creator_id)

      const { data: memberRows, error: memberError } = await admin
        .from('calendar_event_members')
        .select('user_id')
        .eq('event_id', event.id)

      if (memberError) {
        console.warn(`[calendar/reminders] Member lookup failed for ${event.id}:`, memberError)
      } else {
        for (const row of memberRows || []) recipients.add(row.user_id)
      }

      if (recipients.size === 0) {
        // Nobody to notify — still flip the flag so we don't re-scan forever
        await admin
          .from('calendar_events')
          .update({ reminder_sent_at: now.toISOString() })
          .eq('id', event.id)
        continue
      }

      const startDate = new Date(event.start_time)
      const startLabel = startDate.toLocaleString('de-DE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      const minutes = event.reminder_minutes_before ?? 0
      const humanWindow =
        minutes >= 10080 ? `${Math.round(minutes / 10080)} Woche(n)`
        : minutes >= 1440 ? `${Math.round(minutes / 1440)} Tag(e)`
        : minutes >= 60   ? `${Math.round(minutes / 60)} Stunde(n)`
        : `${minutes} Min.`

      const title = `⏰ Erinnerung: ${event.title}`
      const message = `Beginnt in ${humanWindow} · ${startLabel}${event.location ? ` · ${event.location}` : ''}`

      const rows = Array.from(recipients).map(user_id => ({
        user_id,
        title,
        message,
        module_type: 'calendar' as const,
        module_id: event.id,
        is_read: false,
      }))

      const { error: notifyError } = await admin.from('notifications').insert(rows)
      if (notifyError) throw notifyError

      const { error: markError } = await admin
        .from('calendar_events')
        .update({ reminder_sent_at: now.toISOString() })
        .eq('id', event.id)

      if (markError) throw markError

      dispatched += recipients.size
    } catch (err: any) {
      console.error(`[calendar/reminders] Dispatch failed for ${event.id}:`, err)
      failures.push({ eventId: event.id, reason: err?.message || String(err) })
    }
  }

  return NextResponse.json({
    success: true,
    scanned: candidates?.length || 0,
    due: due.length,
    dispatched,
    failures,
    at: now.toISOString(),
  })
}

export async function GET(req: NextRequest) {
  return dispatch(req)
}

export async function POST(req: NextRequest) {
  return dispatch(req)
}
