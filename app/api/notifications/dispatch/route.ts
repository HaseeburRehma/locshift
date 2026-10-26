/**
 * POST /api/notifications/dispatch
 *
 * One entry point for every notification in LokShift (webapp + mobile):
 * persists the in-app row, then sends the email and the Expo push in
 * `after()` so the response never waits on Resend / Expo.
 *
 * Auth: Supabase session cookie (webapp) or `Authorization: Bearer <jwt>`
 * (mobile). Recipients must be active members of the caller's organisation.
 *
 * Who may notify whom:
 *   - admin / administrator / dispatcher: any active member of their org.
 *   - everyone else:
 *       · 'managers' (all active admins + dispatchers),
 *       · individual users whose role is admin/dispatcher,
 *       · themselves,
 *       · plus at most ONE other individual per call (chat DM, plan response),
 *       · or more than one when the call is about a chat conversation the
 *         caller is a member of (module 'chat', moduleId = conversation id;
 *         recipients must be members) or a calendar event the caller created
 *         (module 'calendar', moduleId = event id; recipients must be invited).
 *     Email only reaches managers (and the caller themselves); other
 *     recipients of a non-manager get in-app + push only.
 *
 * Rate limit: sliding window per sender (see RATE_LIMITS). The window lives
 * in memory, i.e. it is best-effort per serverless instance — Vercel can run
 * several instances in parallel, each with its own window.
 *
 * Body:
 *   recipients: string[] | 'managers'
 *   title, message, module, moduleId?, link?, email?, push?
 */

import { NextResponse, after } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isManagerRole, managerIds, prepareDispatch } from '@/lib/notifications/dispatch-server'
import { safeRelativePath } from '@/lib/security/redirect'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Upper bound for the after() work (email + push incl. retries).
export const maxDuration = 60

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

const MAX_RECIPIENTS = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Dispatches per sender per 60 s. Managers get a higher ceiling because the
 * bulk planning flows (CSV import, Serienplanung, week planner) send one
 * request per affected employee.
 */
const RATE_WINDOW_MS = 60_000
const RATE_LIMITS = { member: 30, manager: 300 } as const

interface Body {
  recipients: string[] | 'managers'
  title: string
  message: string
  module: string
  moduleId?: string | null
  link?: string | null
  email?: boolean
  push?: boolean
}

type Admin = ReturnType<typeof createAdminClient>

function json(body: unknown, status = 200, extra?: Record<string, string>) {
  return NextResponse.json(body, { status, headers: { ...CORS, ...extra } })
}

async function callerId(request: Request): Promise<string | null> {
  const auth = request.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const token = auth.slice(7).trim()
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await supabase.auth.getUser(token)
    return data.user?.id ?? null
  }
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// ── Rate limit (in-memory sliding window, per instance) ────────────────────
const hits = new Map<string, number[]>()

function takeRateSlot(senderId: string, limit: number): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now()
  const recent = (hits.get(senderId) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= limit) {
    hits.set(senderId, recent)
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000)) }
  }
  recent.push(now)
  hits.set(senderId, recent)
  if (hits.size > 5_000) {
    for (const [key, times] of hits) if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key)
  }
  return { ok: true }
}

/**
 * Members of the chat conversation / calendar event a non-manager is
 * notifying about, or null when the caller isn't part of it.
 */
async function groupMembers(admin: Admin, uid: string, orgId: string, module: string, moduleId: string | null): Promise<Set<string> | null> {
  if (!moduleId || !UUID_RE.test(moduleId)) return null
  if (module === 'chat') {
    const { data, error } = await admin.from('chat_members').select('user_id').eq('conversation_id', moduleId)
    if (error) return null
    const members = new Set((data ?? []).map((m) => m.user_id as string))
    return members.has(uid) ? members : null
  }
  if (module === 'calendar') {
    const { data: event } = await admin
      .from('calendar_events')
      .select('creator_id, organization_id')
      .eq('id', moduleId)
      .maybeSingle()
    if (!event || event.creator_id !== uid || event.organization_id !== orgId) return null
    const { data, error } = await admin.from('calendar_event_members').select('user_id').eq('event_id', moduleId)
    if (error) return null
    return new Set((data ?? []).map((m) => m.user_id as string))
  }
  return null
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: Request) {
  try {
    const uid = await callerId(request)
    if (!uid) return json({ error: 'Unauthorized' }, 401)

    let body: Body
    try {
      body = (await request.json()) as Body
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }
    if (!body?.title || !body?.message || !body?.module || !body?.recipients) {
      return json({ error: 'recipients, title, message and module are required' }, 400)
    }

    const admin = createAdminClient()
    const { data: caller } = await admin
      .from('profiles')
      .select('organization_id, role, is_active')
      .eq('id', uid)
      .single()
    const orgId = caller?.organization_id as string | undefined
    if (!orgId) return json({ error: 'No organization context' }, 403)
    if (caller?.is_active === false) return json({ error: 'Account inactive' }, 403)
    const callerIsManager = isManagerRole(caller?.role)

    const slot = takeRateSlot(uid, callerIsManager ? RATE_LIMITS.manager : RATE_LIMITS.member)
    if (!slot.ok) {
      return json({ error: 'Too many notifications, please retry later' }, 429, { 'Retry-After': String(slot.retryAfterSec) })
    }

    const module = String(body.module).slice(0, 40)
    const moduleId = typeof body.moduleId === 'string' && body.moduleId ? body.moduleId.slice(0, 100) : null
    // Relative app paths only ("//host" would be protocol-relative).
    const link = body.link == null ? null : safeRelativePath(body.link, '') || null

    let recipientIds: string[]
    // null = every recipient may get the email leg.
    let emailRecipientIds: string[] | null = null

    if (body.recipients === 'managers') {
      recipientIds = await managerIds(orgId, uid)
    } else if (Array.isArray(body.recipients)) {
      const requested = [
        ...new Set(body.recipients.filter((r): r is string => typeof r === 'string' && UUID_RE.test(r))),
      ].slice(0, MAX_RECIPIENTS)
      if (requested.length === 0) return json({ success: true, inApp: 0, queued: { email: 0, push: 0 } })

      // Foreign or inactive ids are dropped silently instead of leaking
      // whether they exist.
      const { data: rows, error } = await admin
        .from('profiles')
        .select('id, role, is_active')
        .in('id', requested)
        .eq('organization_id', orgId)
      if (error) return json({ error: 'Could not resolve recipients' }, 500)
      const active = (rows ?? []).filter((r) => r.is_active !== false)

      if (callerIsManager) {
        recipientIds = active.map((r) => r.id as string)
      } else {
        const self = active.filter((r) => r.id === uid).map((r) => r.id as string)
        const managers = active.filter((r) => r.id !== uid && isManagerRole(r.role)).map((r) => r.id as string)
        const others = active.filter((r) => r.id !== uid && !isManagerRole(r.role)).map((r) => r.id as string)
        if (others.length > 1) {
          const group = await groupMembers(admin, uid, orgId, module, moduleId)
          if (!group || others.some((id) => !group.has(id))) {
            return json({ error: 'Not allowed to notify these recipients' }, 403)
          }
        }
        recipientIds = [...self, ...managers, ...others]
        emailRecipientIds = [...self, ...managers]
      }
    } else {
      return json({ error: 'Invalid recipients' }, 400)
    }

    const prepared = await prepareDispatch({
      organizationId: orgId,
      recipientIds,
      title: String(body.title).slice(0, 200),
      message: String(body.message).slice(0, 2000),
      module,
      moduleId,
      link,
      email: body.email !== false,
      emailRecipientIds,
      push: body.push !== false,
    })

    if (prepared.pending.email || prepared.pending.push) {
      after(async () => {
        const result = await prepared.deliver()
        if (result.errors.length || result.emailFailed || result.pushFailed) {
          console.warn('[notifications/dispatch]', {
            email: result.email,
            emailFailed: result.emailFailed,
            push: result.push,
            pushFailed: result.pushFailed,
            errors: result.errors,
          })
        }
      })
    }

    if (prepared.result.errors.length) console.warn('[notifications/dispatch]', prepared.result.errors)
    return json({
      success: true,
      inApp: prepared.result.inApp,
      queued: prepared.pending,
      errors: prepared.result.errors,
    })
  } catch (err) {
    console.error('[notifications/dispatch] Unexpected:', err)
    return json({ error: 'Internal error' }, 500)
  }
}
