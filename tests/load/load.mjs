#!/usr/bin/env node
/**
 * LokShift load + race test — TEST project only.
 *
 *   node tests/load/load.mjs load [virtualUsers=50] [seconds=120]
 *   node tests/load/load.mjs race
 *
 * Reads TEST_SUPABASE_URL / TEST_SUPABASE_ANON_KEY / TEST_USER_PASSWORD from
 * .env.test.local. Needs the seeded users (*@lokshift-test.invalid). Rows it
 * writes carry the marker "[load]" so they can be removed afterwards.
 *
 * Virtual users replay the reads/writes the web and mobile apps make
 * (PostgREST with the user's JWT and the x-lokshift-client header).
 */
import fs from 'node:fs'
import path from 'node:path'

const PROD_REF = 'fuccfnewtfwgdcofijmz'
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(import.meta.dirname, '../../.env.test.local'), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL_ = env.TEST_SUPABASE_URL
const KEY = env.TEST_SUPABASE_ANON_KEY
if (!URL_ || !KEY || !env.TEST_USER_PASSWORD) throw new Error('Missing TEST_* values in .env.test.local')
if (URL_.includes(PROD_REF)) throw new Error('Refusing to run against production')

const ORG_A = 'a0000000-0000-4000-8000-00000000000a'
const USERS = {
  admin: { id: 'a1000000-0000-4000-8000-000000000001', email: 'admin-a@lokshift-test.invalid' },
  disp: { id: 'a2000000-0000-4000-8000-000000000002', email: 'disp-a@lokshift-test.invalid' },
  emp1: { id: 'a3000000-0000-4000-8000-000000000003', email: 'emp1-a@lokshift-test.invalid' },
  emp2: { id: 'a4000000-0000-4000-8000-000000000004', email: 'emp2-a@lokshift-test.invalid' },
}
const CONV_A = 'c0000000-0000-4000-8000-00000000000a' // admin + emp2

// ── HTTP + metrics ─────────────────────────────────────────────────────────
const stats = new Map()
function record(name, ms, ok, status) {
  const s = stats.get(name) ?? { n: 0, errors: 0, times: [], statuses: {} }
  s.n += 1
  if (!ok) {
    s.errors += 1
    s.statuses[status] = (s.statuses[status] ?? 0) + 1
  }
  s.times.push(ms)
  stats.set(name, s)
}

async function call(name, user, method, p, body, extraHeaders = {}) {
  const t0 = performance.now()
  let status = 0
  try {
    const res = await fetch(`${URL_}${p}`, {
      method,
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
        'x-lokshift-client': '2',
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
    status = res.status
    const text = await res.text()
    record(name, performance.now() - t0, res.ok, status)
    return { ok: res.ok, status, body: text ? JSON.parse(text) : null }
  } catch (err) {
    record(name, performance.now() - t0, false, err?.name === 'TimeoutError' ? 'timeout' : 'network')
    return { ok: false, status, body: null }
  }
}

async function signIn(u) {
  const res = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: env.TEST_USER_PASSWORD }),
  })
  const j = await res.json()
  if (!res.ok) throw new Error(`Sign-in failed for ${u.email}: ${res.status} ${j.error_description ?? j.msg ?? ''}`)
  u.token = j.access_token
}

const pct = (arr, p) => {
  if (arr.length === 0) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// ── Scenarios (what the apps actually request) ─────────────────────────────
const monthStart = '2026-10-01'
const monthEnd = '2026-10-31'
const TE_SELECT =
  '*,employee:profiles!employee_id(id,full_name,avatar_url,role),customer:customers(id,name),plan:plans(id,start_time,end_time,shift_name)'

const employeeActions = [
  (u) => call('emp: my shifts (month)', u, 'GET', `/rest/v1/time_entries?select=${TE_SELECT}&employee_id=eq.${u.id}&date=gte.${monthStart}&date=lte.${monthEnd}&order=start_time.desc`),
  (u) => call('emp: my week plans', u, 'GET', `/rest/v1/plans?select=*&employee_id=eq.${u.id}&start_time=gte.2026-10-19&start_time=lt.2026-10-26`),
  (u) => call('emp: calendar month', u, 'GET', `/rest/v1/calendar_events?select=*&start_time=lte.${monthEnd}T23:59:59Z&end_time=gte.${monthStart}`),
  (u) => call('emp: unread badge', u, 'HEAD', `/rest/v1/notifications?select=id&user_id=eq.${u.id}&is_read=eq.false`, null, { Prefer: 'count=exact' }),
  (u) => call('emp: notification list', u, 'GET', `/rest/v1/notifications?select=*&user_id=eq.${u.id}&order=created_at.desc&limit=30`),
  (u) => call('emp: profile', u, 'GET', `/rest/v1/profiles?select=*&id=eq.${u.id}`),
  (u) => call('emp: colleagues', u, 'GET', `/rest/v1/profiles?select=id,full_name,avatar_url,role&organization_id=eq.${ORG_A}`),
  (u) =>
    call('emp: notify managers', u, 'POST', '/rest/v1/notifications', {
      user_id: USERS.disp.id,
      title: '[load] Schicht abgesendet',
      message: '[load]',
      module_type: 'times',
      link: '/dashboard/times/approvals',
    }),
]
const emp2Actions = [
  (u) => call('chat: read messages', u, 'GET', `/rest/v1/chat_messages?select=*&conversation_id=eq.${CONV_A}&order=created_at.desc&limit=50`),
  (u) => call('chat: send message', u, 'POST', '/rest/v1/chat_messages', { conversation_id: CONV_A, sender_id: u.id, content: '[load] ok' }),
]
const managerActions = [
  (u) => call('mgr: org shifts (month)', u, 'GET', `/rest/v1/time_entries?select=${TE_SELECT}&organization_id=eq.${ORG_A}&date=gte.${monthStart}&date=lte.${monthEnd}&order=start_time.desc`),
  (u) => call('mgr: approvals queue', u, 'GET', `/rest/v1/time_entries?select=${TE_SELECT}&organization_id=eq.${ORG_A}&is_verified=eq.false&submitted_at=not.is.null`),
  (u) => call('mgr: week planner', u, 'GET', `/rest/v1/plans?select=*,employee:profiles!employee_id(id,full_name)&organization_id=eq.${ORG_A}&start_time=gte.2026-10-19&start_time=lt.2026-10-26`),
  (u) => call('mgr: staff list', u, 'GET', `/rest/v1/profiles?select=*&organization_id=eq.${ORG_A}&order=full_name`),
  (u) => call('mgr: Spesen claims', u, 'GET', `/rest/v1/per_diems?select=*&organization_id=eq.${ORG_A}&order=date.desc`),
  (u) => call('mgr: personnel files', u, 'GET', `/rest/v1/qualifications?select=*&organization_id=eq.${ORG_A}`),
  (u) => call('mgr: pending absences', u, 'GET', `/rest/v1/calendar_events?select=*&organization_id=eq.${ORG_A}&request_status=eq.pending&event_type=in.(holiday,sick_leave)`),
  (u) => call('mgr: audit trail', u, 'GET', `/rest/v1/time_entry_audit?select=*&organization_id=eq.${ORG_A}&order=changed_at.desc&limit=50`),
]

async function virtualUser(i, until) {
  // 60 % employees, 40 % admin/dispatch — roughly a shift change.
  const role = i % 5 < 3 ? (i % 2 ? 'emp1' : 'emp2') : i % 2 ? 'disp' : 'admin'
  const u = USERS[role]
  const actions = role === 'emp2' ? [...employeeActions, ...emp2Actions] : role.startsWith('emp') ? employeeActions : managerActions
  await sleep(Math.random() * 2000) // ramp-up
  while (Date.now() < until) {
    await pick(actions)(u)
    await sleep(200 + Math.random() * 600) // think time
  }
}

async function load(vus, seconds) {
  for (const u of Object.values(USERS)) await signIn(u)
  console.log(`Load: ${vus} virtual users for ${seconds}s against ${new URL(URL_).host}`)
  const started = Date.now()
  const until = started + seconds * 1000
  await Promise.all(Array.from({ length: vus }, (_, i) => virtualUser(i, until)))
  const elapsed = (Date.now() - started) / 1000

  const rows = [...stats.entries()].sort(([a], [b]) => a.localeCompare(b))
  const total = rows.reduce((s, [, v]) => s + v.n, 0)
  const errors = rows.reduce((s, [, v]) => s + v.errors, 0)
  const all = rows.flatMap(([, v]) => v.times)
  console.log('\nrequest                     count  err   p50    p95    p99   (ms)  error statuses')
  for (const [name, v] of rows) {
    console.log(
      `${name.padEnd(27)}${String(v.n).padStart(6)}${String(v.errors).padStart(5)}${String(Math.round(pct(v.times, 50))).padStart(6)}${String(Math.round(pct(v.times, 95))).padStart(7)}${String(Math.round(pct(v.times, 99))).padStart(7)}        ${Object.keys(v.statuses).length ? JSON.stringify(v.statuses) : ''}`,
    )
  }
  console.log(
    `\nTOTAL ${total} requests in ${elapsed.toFixed(0)}s = ${(total / elapsed).toFixed(1)} req/s · errors ${errors} (${((errors / Math.max(1, total)) * 100).toFixed(2)}%) · p50 ${Math.round(pct(all, 50))} ms · p95 ${Math.round(pct(all, 95))} ms · p99 ${Math.round(pct(all, 99))} ms`,
  )
}

// ── Race checks: same action fired many times at once ──────────────────────
async function race() {
  for (const u of Object.values(USERS)) await signIn(u)
  const { emp2, disp, admin } = USERS
  const results = []
  const tally = (rs) => ({ ok: rs.filter((r) => r.ok).length, failed: rs.filter((r) => !r.ok).length, statuses: [...new Set(rs.map((r) => r.status))] })

  // 1. Double clock-in (two devices / retries): one open shift per employee.
  const clockIns = await Promise.all(
    Array.from({ length: 20 }, () =>
      call('race: clock-in', emp2, 'POST', '/rest/v1/time_entries', {
        organization_id: ORG_A, employee_id: emp2.id, start_time: new Date().toISOString(), notes: '[load] race',
      }),
    ),
  )
  results.push(['20× parallel clock-in, same employee', 'exactly 1 ok', tally(clockIns)])

  // Close the open shift so the next checks have a finished one to work with.
  const open = await call('race: find open', emp2, 'GET', `/rest/v1/time_entries?select=id,start_time&employee_id=eq.${emp2.id}&end_time=is.null&is_planned=not.is.true`)
  const entryId = open.body?.[0]?.id
  if (entryId) {
    const end = new Date(Date.now() + 8 * 3600_000).toISOString()
    await call('race: clock-out', emp2, 'PATCH', `/rest/v1/time_entries?id=eq.${entryId}`, { end_time: end, break_minutes: 30 })
    // 2. Double submit.
    const submits = await Promise.all(
      Array.from({ length: 10 }, () =>
        call('race: submit', emp2, 'PATCH', `/rest/v1/time_entries?id=eq.${entryId}&submitted_at=is.null`, { submitted_at: new Date().toISOString() }, { Prefer: 'return=representation' }),
      ),
    )
    const submitted = submits.filter((r) => r.ok && Array.isArray(r.body) && r.body.length === 1).length
    results.push(['10× parallel submit, same shift', 'exactly 1 row changed', { changedRows: submitted, ...tally(submits) }])

    // 3. Correction requests: only one pending per shift.
    const corrections = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        call('race: correction', emp2, 'POST', '/rest/v1/time_entry_corrections', {
          organization_id: ORG_A, entry_id: entryId, employee_id: emp2.id, requested_by: emp2.id,
          reason: `[load] Pause ${i}`, original: {}, proposed: { break_minutes: 15 + i },
        }, { Prefer: 'return=representation' }),
      ),
    )
    results.push(['10× parallel correction request, same shift', 'exactly 1 ok', tally(corrections)])

    // 4. Two managers decide the same correction at once.
    const corrId = corrections.find((r) => r.ok)?.body?.[0]?.id
    if (corrId) {
      const reviews = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          call('race: review', i % 2 ? disp : admin, 'POST', '/rest/v1/rpc/review_time_entry_correction', { p_correction_id: corrId, p_approve: i % 3 !== 0, p_note: '[load]' }),
        ),
      )
      results.push(['10× parallel review, same correction (2 managers)', 'exactly 1 ok', tally(reviews)])
    }

    // 5. Two managers approve the same shift at once (idempotent).
    const approvals = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        call('race: approve', i % 2 ? disp : admin, 'PATCH', `/rest/v1/time_entries?id=eq.${entryId}`, { is_verified: true }),
      ),
    )
    results.push(['10× parallel approve, same shift (2 managers)', 'all ok, one approval in audit', tally(approvals)])
  }

  // 6. Same vacation decided twice by two managers.
  console.log('\nrace check                                         expected                       result')
  for (const [name, expect, got] of results) console.log(`${name.padEnd(51)}${expect.padEnd(31)}${JSON.stringify(got)}`)
  console.log(`\nentry under test: ${entryId ?? '(none)'}`)
}

const [mode = 'load', a, b] = process.argv.slice(2)
if (mode === 'race') await race()
else await load(Number(a) || 50, Number(b) || 120)
