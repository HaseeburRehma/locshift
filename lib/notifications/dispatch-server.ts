/**
 * Server-side notification fan-out: in-app row + email + push.
 *
 * Used by /api/notifications/dispatch (web + mobile) and the cron routes.
 * Respects notification_preferences per user (missing row = everything on).
 * Each channel is best-effort; a failing channel never blocks the others.
 *
 * Two phases so HTTP callers never wait on Resend / Expo:
 *   prepareDispatch() — loads recipients + preferences and writes the in-app
 *                       rows; returns `deliver()` for the external legs.
 *   deliver()         — email via the Resend batch API and Expo push, each
 *                       request with a timeout, bounded retries and (for
 *                       Resend) a per-instance throttle.
 * dispatchNotifications() runs both phases back-to-back (cron jobs).
 */

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface DispatchParams {
  organizationId: string
  recipientIds: string[]
  title: string
  message: string
  module: string
  moduleId?: string | null
  link?: string | null
  email?: boolean
  /**
   * When set, only these recipients may receive the email leg (everyone in
   * `recipientIds` still gets in-app + push). `null`/omitted = no restriction.
   */
  emailRecipientIds?: string[] | null
  push?: boolean
}

export interface DispatchResult {
  inApp: number
  email: number
  emailFailed: number
  push: number
  pushFailed: number
  errors: string[]
}

export interface PreparedDispatch {
  /** In-app leg already done; email/push counters fill in during deliver(). */
  result: DispatchResult
  /** Emails / push recipients that deliver() will attempt. */
  pending: { email: number; push: number }
  /** Sends email + push. Safe to call once; never throws. */
  deliver: () => Promise<DispatchResult>
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const RESEND_BATCH_URL = `${(process.env.RESEND_BASE_URL || 'https://api.resend.com').replace(/\/$/, '')}/emails/batch`

/** Hard timeout per outbound request (Resend / Expo). */
const REQUEST_TIMEOUT_MS = 5_000
/** Retries on 429 / 5xx / timeout / network error (so max. 3 attempts). */
const MAX_RETRIES = 2
/** Resend's default limit is 2 requests per second per team. */
const RESEND_MIN_INTERVAL_MS = 550
/** Resend batch API: max. 100 emails per request. */
const RESEND_BATCH_SIZE = 100
/** Expo push API: max. 100 messages per request. */
const EXPO_CHUNK_SIZE = 100

function emptyResult(): DispatchResult {
  return { inApp: 0, email: 0, emailFailed: 0, push: 0, pushFailed: 0, errors: [] }
}

function appUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://lokshift.de'
  return path.startsWith('http') ? path : `${base.replace(/\/$/, '')}${path}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailHtml(title: string, message: string, link: string | null): string {
  const body = escapeHtml(message).replace(/\n/g, '<br/>')
  const button = link
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(link)}" style="background:#0064E0;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">In LokShift öffnen</a></p>`
    : ''
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <p style="color:#0064E0;font-weight:800;letter-spacing:1px;font-size:12px;margin:0 0 12px">LOKSHIFT</p>
  <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
  <p style="margin:0;line-height:1.55;font-size:14px">${body}</p>${button}
  <p style="margin:32px 0 0;color:#94a3b8;font-size:11px">Diese Nachricht wurde automatisch von LokShift versendet.</p>
</div>`
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 250 ms · 2^attempt + up to 100 ms jitter. */
const backoffMs = (attempt: number) => 250 * 2 ** attempt + Math.floor(Math.random() * 100)

type Attempt =
  | { ok: true; res: Response }
  | { ok: false; status: number | null; error: string; retryAfterMs?: number }

/**
 * fetch with AbortSignal.timeout and up to MAX_RETRIES retries on
 * 429 / 5xx / timeout / network errors. Other 4xx are returned at once.
 * `beforeAttempt` runs before every attempt (Resend throttle).
 */
async function fetchWithRetry(url: string, init: RequestInit, beforeAttempt?: () => Promise<void>): Promise<Attempt> {
  let last: Attempt = { ok: false, status: null, error: 'not attempted' }
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const hinted = last.ok ? 0 : Math.min(last.retryAfterMs ?? 0, 2_000)
      await sleep(Math.max(backoffMs(attempt - 1), hinted))
    }
    if (beforeAttempt) await beforeAttempt()
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      if (res.ok) return { ok: true, res }
      const text = await res.text().catch(() => '')
      const retryAfter = Number(res.headers.get('retry-after'))
      last = {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ''}`,
        retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : undefined,
      }
      if (res.status !== 429 && res.status < 500) return last
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      last = {
        ok: false,
        status: null,
        error:
          name === 'TimeoutError' || name === 'AbortError'
            ? `timeout after ${REQUEST_TIMEOUT_MS} ms`
            : err instanceof Error
              ? err.message
              : String(err),
      }
    }
  }
  return last
}

// ── Resend throttle (per serverless instance) ──────────────────────────────
// Every Resend request — including retries — waits for a slot so one
// instance never exceeds ~2 requests/second. Concurrent after() tasks in the
// same instance share the gate; separate instances do not (best-effort).
let resendGate: Promise<void> = Promise.resolve()
let resendLastAt = 0

function resendSlot(): Promise<void> {
  const slot = resendGate.then(async () => {
    const wait = resendLastAt + RESEND_MIN_INTERVAL_MS - Date.now()
    if (wait > 0) await sleep(wait)
    resendLastAt = Date.now()
  })
  resendGate = slot.catch(() => undefined)
  return slot
}

interface OutboundEmail {
  to: string
  subject: string
  text: string
  html: string
}

async function sendEmails(emails: OutboundEmail[], result: DispatchResult): Promise<void> {
  if (emails.length === 0) return
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[dispatch] RESEND_API_KEY missing — skipping email send')
    result.emailFailed += emails.length
    result.errors.push('email: RESEND_API_KEY not configured')
    return
  }
  // Sender must be on the verified Resend domain (see lib/email/resend.ts).
  const from = process.env.RESEND_FROM_ADDRESS || 'LokShift <noreply@lokshift.de>'

  for (let i = 0; i < emails.length; i += RESEND_BATCH_SIZE) {
    const chunk = emails.slice(i, i + RESEND_BATCH_SIZE)
    const outcome = await fetchWithRetry(
      RESEND_BATCH_URL,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          // Same key on every retry of this chunk → Resend never sends it twice.
          'Idempotency-Key': `dispatch-${randomUUID()}`,
          // One bad address must not drop the whole chunk.
          'x-batch-validation': 'permissive',
        },
        body: JSON.stringify(chunk.map((e) => ({ from, ...e }))),
      },
      resendSlot,
    )
    if (!outcome.ok) {
      result.emailFailed += chunk.length
      result.errors.push(`email: ${outcome.error}`)
      continue
    }
    const json = (await outcome.res.json().catch(() => null)) as
      | { data?: { id: string }[]; errors?: { index: number; message: string }[] }
      | null
    const failed = json?.errors?.length ?? 0
    const sent = Array.isArray(json?.data) ? json.data.length : chunk.length - failed
    result.email += sent
    result.emailFailed += Math.max(0, chunk.length - sent)
    for (const e of json?.errors ?? []) result.errors.push(`email[${chunk[e.index]?.to ?? e.index}]: ${e.message}`)
  }
}

interface PushMessage {
  to: string
  title: string
  body: string
  sound: 'default'
  priority: 'high'
  channelId: 'default'
  data: Record<string, unknown>
}

interface ExpoTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

async function sendPush(
  admin: ReturnType<typeof createAdminClient>,
  messages: PushMessage[],
  result: DispatchResult,
): Promise<void> {
  for (let i = 0; i < messages.length; i += EXPO_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + EXPO_CHUNK_SIZE)
    const outcome = await fetchWithRetry(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(chunk),
    })
    if (!outcome.ok) {
      result.pushFailed += chunk.length
      result.errors.push(`push: ${outcome.error}`)
      continue
    }
    const json = (await outcome.res.json().catch(() => null)) as
      | { data?: ExpoTicket[]; errors?: { code?: string; message?: string }[] }
      | null
    for (const e of json?.errors ?? []) result.errors.push(`push: ${e.code ?? ''} ${e.message ?? ''}`.trim())
    const tickets = Array.isArray(json?.data) ? json.data : []
    const dead: string[] = []
    chunk.forEach((msg, idx) => {
      const ticket = tickets[idx]
      if (ticket?.status === 'ok') {
        result.push += 1
        return
      }
      result.pushFailed += 1
      if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.push(msg.to)
    })
    if (dead.length) {
      const { error } = await admin.from('push_tokens').delete().in('token', dead)
      if (error) result.errors.push(`push_tokens cleanup: ${error.message}`)
    }
  }
}

/**
 * Phase 1: resolve recipients (active members of `organizationId` only),
 * write the in-app rows, and return the email/push work as `deliver()`.
 */
export async function prepareDispatch(p: DispatchParams): Promise<PreparedDispatch> {
  const result = emptyResult()
  const idle: PreparedDispatch = { result, pending: { email: 0, push: 0 }, deliver: async () => result }
  const ids = [...new Set(p.recipientIds.filter(Boolean))]
  if (ids.length === 0) return idle

  const admin = createAdminClient()

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('id, email, full_name, organization_id, notifications_enabled, is_active')
    .in('id', ids)
    .eq('organization_id', p.organizationId)
  if (profErr) {
    result.errors.push(`profiles: ${profErr.message}`)
    return idle
  }
  const recipients = (profiles ?? []).filter((r) => r.is_active !== false)
  if (recipients.length === 0) return idle

  const { data: prefs } = await admin
    .from('notification_preferences')
    .select('user_id, email_enabled, push_enabled, in_app_enabled')
    .in('user_id', recipients.map((r) => r.id))
  const prefOf = new Map((prefs ?? []).map((x) => [x.user_id as string, x]))

  // 1. In-app rows (always unless the user switched in-app off)
  const rows = recipients
    .filter((r) => prefOf.get(r.id)?.in_app_enabled !== false)
    .map((r) => ({
      user_id: r.id,
      title: p.title,
      message: p.message,
      module_type: p.module,
      module_id: p.moduleId ?? null,
      link: p.link ?? null,
      is_read: false,
    }))
  if (rows.length) {
    const { error } = await admin.from('notifications').insert(rows)
    if (error) result.errors.push(`in-app: ${error.message}`)
    else result.inApp = rows.length
  }

  const link = appUrl(p.link)
  const emailAllowed = p.emailRecipientIds ? new Set(p.emailRecipientIds) : null

  const emails: OutboundEmail[] =
    p.email === false
      ? []
      : recipients
          .filter(
            (r) =>
              r.email &&
              (!emailAllowed || emailAllowed.has(r.id)) &&
              r.notifications_enabled !== false &&
              prefOf.get(r.id)?.email_enabled !== false,
          )
          .map((r) => ({
            to: r.email as string,
            subject: p.title,
            text: link ? `${p.message}\n\n${link}` : p.message,
            html: emailHtml(p.title, p.message, link),
          }))

  const pushUsers =
    p.push === false
      ? []
      : recipients
          .filter((r) => r.notifications_enabled !== false && prefOf.get(r.id)?.push_enabled !== false)
          .map((r) => r.id as string)

  let delivered: Promise<DispatchResult> | null = null
  const deliver = () => {
    delivered ??= (async () => {
      try {
        // 2. Email (Resend batch API, throttled)
        await sendEmails(emails, result)
        // 3. Push (Expo)
        if (pushUsers.length) {
          const { data: tokens, error } = await admin.from('push_tokens').select('token, user_id').in('user_id', pushUsers)
          if (error) result.errors.push(`push_tokens: ${error.message}`)
          const messages: PushMessage[] = (tokens ?? []).map((t) => ({
            to: t.token as string,
            title: p.title,
            body: p.message,
            sound: 'default',
            priority: 'high',
            channelId: 'default',
            data: { module: p.module, moduleId: p.moduleId ?? null, link: p.link ?? null },
          }))
          await sendPush(admin, messages, result)
        }
      } catch (err) {
        result.errors.push(`deliver: ${err instanceof Error ? err.message : String(err)}`)
      }
      return result
    })()
    return delivered
  }

  return { result, pending: { email: emails.length, push: pushUsers.length }, deliver }
}

/** In-app + email + push, awaited end to end (cron jobs). */
export async function dispatchNotifications(p: DispatchParams): Promise<DispatchResult> {
  const prepared = await prepareDispatch(p)
  return prepared.deliver()
}

const MANAGER_ROLES = ['admin', 'administrator', 'dispatcher']
const ADMIN_ROLES = ['admin', 'administrator']

/** admin / administrator / dispatcher, case-insensitive. */
export function isManagerRole(role: unknown): boolean {
  return MANAGER_ROLES.includes(String(role ?? '').trim().toLowerCase())
}

/** Active admins + dispatchers of an organisation (admins only with `adminsOnly`). */
export async function managerIds(organizationId: string, exclude?: string | null, adminsOnly = false): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, role, is_active')
    .eq('organization_id', organizationId)
  const roles = adminsOnly ? ADMIN_ROLES : MANAGER_ROLES
  return (data ?? [])
    .filter((p) => roles.includes(String(p.role ?? '').trim().toLowerCase()) && p.is_active !== false)
    .map((p) => p.id as string)
    .filter((id) => id !== exclude)
}
