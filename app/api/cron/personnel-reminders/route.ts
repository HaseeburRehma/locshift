/**
 * Daily deadline reminders for the Personalakte (Kundenfeedback Punkt 11).
 *
 * For every active document with an expiry date, the most specific due
 * reminder (e.g. 28 / 14 / 0 days before) is sent once to admin +
 * dispatch and the employee (confidential documents: admins only) via in-app,
 * email and push. qualification_reminders keys on (document, expiry date,
 * reminder day) — a renewal changes the expiry date, so old reminders are
 * settled automatically.
 *
 * Claim-then-send: all reached reminder days are inserted into
 * qualification_reminders with ON CONFLICT DO NOTHING first; the
 * notification only goes out when THIS run inserted the row of the day to
 * send. Overlapping or retried runs therefore never send twice. A document
 * not reached within the time budget is simply picked up by the next run
 * (its most specific reached reminder stays due until it is claimed).
 *
 * Trigger: Vercel Cron (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchNotifications, managerIds } from '@/lib/notifications/dispatch-server'
import { daysUntil, docTypeLabel, dueReminder } from '@/lib/personnel/documents'
import { formatDateDE } from '@/lib/time/format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** PostgREST returns at most 1000 rows per request. */
const PAGE_SIZE = 1000
/** Documents claimed per upsert; sends follow right after each claim. */
const CLAIM_CHUNK = 10
/** Stop claiming new reminders after this, leaving headroom below maxDuration. */
const TIME_BUDGET_MS = 40_000

interface DocRow {
  id: string
  organization_id: string
  user_id: string
  name: string | null
  doc_type: string | null
  expires_at: string
  reminder_days: number[] | null
  is_confidential: boolean | null
  employee: { full_name: string | null; is_active: boolean | null } | { full_name: string | null; is_active: boolean | null }[] | null
}

interface DueDoc {
  doc: DocRow
  expiresAt: string
  send: number | null
  settle: number[]
}

function berlinToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

const claimKey = (qualificationId: string, expiresAt: string, day: number) => `${qualificationId}|${expiresAt.slice(0, 10)}|${day}`

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const admin = createAdminClient()
  const today = berlinToday()

  const managersByOrg = new Map<string, string[]>()
  const adminsByOrg = new Map<string, string[]>()
  let checked = 0
  let sent = 0
  let deferred = 0
  let outOfTime = false
  const errors: string[] = []

  const sendReminder = async (d: DocRow) => {
    const employee = (Array.isArray(d.employee) ? d.employee[0] : d.employee) ?? null
    // Confidential documents are admin-only (dispatch can't open them).
    let recipients: string[]
    if (d.is_confidential) {
      if (!adminsByOrg.has(d.organization_id)) adminsByOrg.set(d.organization_id, await managerIds(d.organization_id, null, true))
      recipients = [...(adminsByOrg.get(d.organization_id) ?? [])]
    } else {
      if (!managersByOrg.has(d.organization_id)) managersByOrg.set(d.organization_id, await managerIds(d.organization_id))
      recipients = [...(managersByOrg.get(d.organization_id) ?? []), d.user_id]
    }
    const left = daysUntil(d.expires_at, today)
    const who = employee?.full_name ?? 'Mitarbeiter'
    const what = `${docTypeLabel(d.doc_type, 'de')}${d.name && d.name !== docTypeLabel(d.doc_type, 'de') ? ` (${d.name})` : ''}`
    const title = left < 0 ? `${what} abgelaufen` : left === 0 ? `${what} läuft heute ab` : `${what} läuft in ${left} Tagen ab`
    const message = `${who}: ${what} – gültig bis ${formatDateDE(d.expires_at)}. Bitte Erneuerung veranlassen und den neuen Nachweis in der Personalakte hinterlegen.`
    const result = await dispatchNotifications({
      organizationId: d.organization_id,
      recipientIds: recipients,
      title,
      message,
      module: 'personnel',
      moduleId: d.id,
      link: `/dashboard/personnel/${d.user_id}`,
    })
    errors.push(...result.errors)
    sent += 1
  }

  for (let from = 0; !outOfTime; from += PAGE_SIZE) {
    const { data, error } = await admin
      .from('qualifications')
      .select('id, organization_id, user_id, name, doc_type, expires_at, reminder_days, is_confidential, employee:profiles!user_id(full_name, is_active)')
      .is('archived_at', null)
      .not('expires_at', 'is', null)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      if (from === 0) return NextResponse.json({ error: error.message }, { status: 500 })
      errors.push(`qualifications page ${from}: ${error.message}`)
      break
    }
    const docs = (data ?? []) as unknown as DocRow[]
    checked += docs.length

    const due: DueDoc[] = []
    for (const d of docs) {
      const employee = Array.isArray(d.employee) ? d.employee[0] : d.employee
      if (employee?.is_active === false) continue
      // No pre-read of sent rows: every reached day is (re)claimed below and
      // the insert itself tells us which ones are new.
      const { send, settle } = dueReminder({ expires_at: d.expires_at, reminder_days: d.reminder_days ?? [] }, [], today)
      if (settle.length === 0) continue
      due.push({ doc: d, expiresAt: String(d.expires_at).slice(0, 10), send, settle })
    }

    for (let i = 0; i < due.length; i += CLAIM_CHUNK) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        outOfTime = true
        deferred += due.length - i
        break
      }
      const chunk = due.slice(i, i + CLAIM_CHUNK)
      const { data: claimed, error: claimErr } = await admin
        .from('qualification_reminders')
        .upsert(
          chunk.flatMap((c) => c.settle.map((day) => ({ qualification_id: c.doc.id, expires_at: c.expiresAt, reminder_day: day }))),
          { onConflict: 'qualification_id,expires_at,reminder_day', ignoreDuplicates: true },
        )
        .select('qualification_id, expires_at, reminder_day')
      if (claimErr) {
        // Nothing claimed → nothing sent; the next run retries.
        errors.push(`claim: ${claimErr.message}`)
        continue
      }
      const won = new Set(
        (claimed ?? []).map((r) => claimKey(r.qualification_id as string, String(r.expires_at), Number(r.reminder_day))),
      )
      for (const c of chunk) {
        if (c.send == null || !won.has(claimKey(c.doc.id, c.expiresAt, c.send))) continue
        try {
          await sendReminder(c.doc)
        } catch (err) {
          errors.push(`send ${c.doc.id}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    if (docs.length < PAGE_SIZE) break
    if (!outOfTime && Date.now() - startedAt > TIME_BUDGET_MS) outOfTime = true
  }

  if (errors.length) console.warn('[cron/personnel-reminders]', errors)
  return NextResponse.json({ ok: true, today, checked, sent, deferred, complete: !outOfTime })
}

export async function GET(req: NextRequest) {
  return run(req)
}

export async function POST(req: NextRequest) {
  return run(req)
}
