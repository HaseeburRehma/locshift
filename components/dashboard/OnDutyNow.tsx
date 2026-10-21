'use client'

/**
 * "Laut Planung aktuell im Einsatz" (Kundenfeedback Punkt 10).
 *
 * The planned time decides who is listed — a person planned 10:00–18:00
 * appears at 11:00 even without check-in. The actual time tracking adds
 * the status: not checked in, checked in, already finished, or planned
 * end exceeded while still clocked in.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Loader2, MapPin, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Plan } from '@/lib/types'
import { WEEK_PLAN_SELECT } from '@/hooks/plans/usePlanningWeek'
import { dutyStatus, dutyStatusLabel, type DutyStatus } from '@/lib/plans/week'
import { formatShiftRange, formatTimeOfDay } from '@/lib/time/format'
import { localDateKey } from '@/lib/time/shift-hours'
import { useCoalescedRefetch } from '@/hooks/useCoalescedRefetch'

interface EntryLite {
  id: string
  employee_id: string
  plan_id: string | null
  start_time: string
  end_time: string | null
  employee?: { full_name: string | null } | null
}

const STATUS_STYLE: Record<DutyStatus, string> = {
  not_checked_in: 'bg-amber-50 text-amber-800 border-amber-200',
  checked_in: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  finished: 'bg-slate-100 text-slate-600 border-slate-200',
  overrun: 'bg-red-50 text-red-700 border-red-200',
}

export function OnDutyNow() {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  const [plans, setPlans] = useState<Plan[]>([])
  const [entries, setEntries] = useState<EntryLite[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  const load = useCallback(async () => {
    if (!profile?.organization_id) return
    const t = new Date()
    setNow(t)
    const lookback = new Date(t.getTime() - 16 * 3_600_000).toISOString()
    const [planRes, entryRes] = await Promise.all([
      supabase
        .from('plans')
        .select(WEEK_PLAN_SELECT)
        .eq('organization_id', profile.organization_id)
        .in('status', ['assigned', 'confirmed'])
        .lte('start_time', t.toISOString())
        .gt('end_time', lookback)
        .order('start_time'),
      supabase
        .from('time_entries')
        .select('id, employee_id, plan_id, start_time, end_time, employee:profiles!employee_id(full_name)')
        .eq('organization_id', profile.organization_id)
        .eq('is_planned', false)
        .or(`end_time.is.null,start_time.gte.${lookback}`),
    ])
    setPlans((planRes.data ?? []) as Plan[])
    setEntries((entryRes.data ?? []) as unknown as EntryLite[])
    setLoading(false)
  }, [profile?.organization_id, supabase])

  // Clock-ins at shift change / bulk planning arrive in bursts — one reload.
  const scheduleLoad = useCoalescedRefetch(load)

  useEffect(() => {
    load()
    const interval = setInterval(scheduleLoad, 60_000)
    if (!profile?.organization_id) return () => clearInterval(interval)
    const channel = supabase
      .channel(`on-duty-${profile.organization_id}-${suffix.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries', filter: `organization_id=eq.${profile.organization_id}` }, () => scheduleLoad())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `organization_id=eq.${profile.organization_id}` }, () => scheduleLoad())
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [load, scheduleLoad, profile?.organization_id, supabase])

  const rows = useMemo(() => {
    const matchEntry = (p: Plan) =>
      entries.find((e) => e.plan_id === p.id) ??
      entries.find(
        (e) =>
          e.employee_id === p.employee_id &&
          new Date(e.start_time).getTime() >= new Date(p.start_time).getTime() - 3 * 3_600_000 &&
          new Date(e.start_time) < new Date(p.end_time),
      )
    return plans
      .map((p) => {
        const entry = matchEntry(p)
        const active = new Date(p.start_time) <= now && new Date(p.end_time) > now
        const status = dutyStatus(p, entry ?? null, now)
        return { plan: p, entry, status, active }
      })
      .filter((r) => r.active || r.status === 'overrun')
  }, [plans, entries, now])

  const unplanned = useMemo(() => {
    const covered = new Set(rows.map((r) => r.entry?.id).filter(Boolean))
    return entries.filter((e) => !e.end_time && !covered.has(e.id))
  }, [rows, entries])

  const counts = rows.reduce<Record<DutyStatus, number>>(
    (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
    { not_checked_in: 0, checked_in: 0, finished: 0, overrun: 0 },
  )

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 tracking-tight">
          <Radio className="w-4 h-4 text-emerald-600" />
          {L('Laut Planung aktuell im Einsatz', 'On duty right now (per plan)')}
          <span className="rounded-full bg-[#0064E0] px-2 py-0.5 text-[10px] font-black text-white">{rows.length}</span>
        </h3>
        <div className="flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wider">
          {(Object.keys(counts) as DutyStatus[]).filter((k) => counts[k] > 0).map((k) => (
            <span key={k} className={cn('rounded-md border px-1.5 py-0.5', STATUS_STYLE[k])}>
              {counts[k]} {dutyStatusLabel(k, locale)}
            </span>
          ))}
          <Link href="/dashboard/live" className="rounded-md px-1.5 py-0.5 text-blue-600 hover:underline normal-case tracking-normal text-xs font-bold">
            {L('Live-Karte', 'Live map')}
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center rounded-2xl border border-slate-100 bg-white"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-400">
          {L('Laut Planung ist gerade niemand im Einsatz.', 'Nobody is scheduled right now.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map(({ plan, entry, status }) => {
            const from = plan.start_location?.short_code || plan.start_location?.name
            const to = plan.destination_location?.short_code || plan.destination_location?.name
            return (
              <Link
                key={plan.id}
                href={`/dashboard/plans/week?date=${localDateKey(new Date(plan.start_time))}`}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-black text-slate-900 truncate">{plan.employee?.full_name ?? L('Unbesetzt', 'Unassigned')}</p>
                  <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', STATUS_STYLE[status])}>
                    {dutyStatusLabel(status, locale)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-600 tabular-nums">
                  {L('Plan', 'Plan')} {formatShiftRange(plan.start_time, plan.end_time, locale)}
                  {entry && <span className="text-slate-400"> · {L('erfasst seit', 'clocked since')} {formatTimeOfDay(entry.start_time)}{entry.end_time ? `–${formatTimeOfDay(entry.end_time)}` : ''}</span>}
                </p>
                {(plan.shift_name || plan.route || plan.customer?.name) && (
                  <p className="mt-0.5 text-xs font-semibold text-[#0064E0] truncate">
                    {[plan.shift_name || plan.route, plan.customer?.name].filter(Boolean).join(' · ')}
                  </p>
                )}
                {(from || to) && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <MapPin className="w-3 h-3" /> {from ?? '?'} → {to ?? '?'}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {unplanned.length > 0 && (
        <p className="text-xs font-semibold text-slate-500">
          {L('Eingecheckt ohne aktuelle Planung:', 'Clocked in without a current plan:')}{' '}
          {unplanned.map((e) => `${e.employee?.full_name ?? '—'} (${L('seit', 'since')} ${formatTimeOfDay(e.start_time)})`).join(', ')}
        </p>
      )}
    </section>
  )
}
