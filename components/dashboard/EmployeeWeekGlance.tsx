'use client'

/**
 * Employee home (Punkte 9, 10, 14): today's shift first — confirm it or
 * start the time tracking — then the next days of the own week.
 */

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CalendarRange, CheckCircle2, MapPin, Play, StickyNote } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Plan } from '@/lib/types'
import { WEEK_PLAN_SELECT } from '@/hooks/plans/usePlanningWeek'
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { PLAN_STATUS } from '@/components/plans/PlanCard'
import { addDays, localDateKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatShiftRange, weekdayName } from '@/lib/time/format'
import { planStartDay } from '@/lib/plans/week'
import { describePlan } from '@/lib/plans/notify'
import { notifyManagers, sendNotification } from '@/lib/notifications/service'
import { createCoalescer } from '@/hooks/useCoalescedRefetch'

export function EmployeeWeekGlance() {
  const { user, profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { activeEntry, clockIn } = useTimeTracking()
  const [plans, setPlans] = useState<Plan[]>([])
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const load = async () => {
      const today = localDateKey()
      const { data } = await supabase
        .from('plans')
        .select(WEEK_PLAN_SELECT)
        .eq('employee_id', user.id)
        .in('status', ['assigned', 'confirmed'])
        .gt('end_time', new Date().toISOString())
        .lt('start_time', new Date(`${addDays(today, 7)}T00:00:00`).toISOString())
        .order('start_time')
      setPlans((data ?? []) as Plan[])
    }
    load()
    // A rollout of several shifts fires one event per row — one reload.
    const refresh = createCoalescer(load)
    const channel = supabase
      .channel(`employee-week-${user.id}-${suffix.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `employee_id=eq.${user.id}` }, () => refresh.schedule())
      .subscribe()
    return () => {
      refresh.dispose()
      supabase.removeChannel(channel)
    }
  }, [user])

  const today = localDateKey()
  const now = Date.now()
  const current = plans.filter((p) => planStartDay(p) === today || (new Date(p.start_time).getTime() <= now && new Date(p.end_time).getTime() > now))
  const upcoming = plans.filter((p) => !current.includes(p))

  const confirm = async (p: Plan) => {
    const { error } = await createClient().from('plans').update({ status: 'confirmed', updated_at: new Date().toISOString() }).eq('id', p.id)
    if (error) return toast.error(L('Bestätigung fehlgeschlagen', 'Confirmation failed'))
    setPlans((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'confirmed' } : x)))
    toast.success(L('Schicht bestätigt', 'Shift confirmed'))
    const payload = {
      title: 'Schicht bestätigt',
      message: `${profile?.full_name ?? 'Mitarbeiter'} hat die Schicht ${describePlan(p)} bestätigt.`,
      module: 'plans' as const,
      moduleId: p.id,
      skipEmail: true,
    }
    if (p.creator_id && p.creator_id !== user?.id) void sendNotification({ userId: p.creator_id, ...payload })
    else void notifyManagers(payload)
  }

  const card = (p: Plan, highlight: boolean) => {
    const status = PLAN_STATUS[p.status] ?? PLAN_STATUS.assigned
    const from = p.start_location?.short_code || p.start_location?.name
    const to = p.destination_location?.short_code || p.destination_location?.name
    return (
      <div key={p.id} className={cn('rounded-2xl border bg-white p-4 shadow-sm', highlight ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {planStartDay(p) === today ? L('Heute', 'Today') : `${weekdayName(planStartDay(p), locale, true)}, ${formatDateDE(planStartDay(p)).slice(0, 6)}`}
            </p>
            <p className="text-lg font-black text-slate-900 tabular-nums">{formatShiftRange(p.start_time, p.end_time, locale)}</p>
            {(p.shift_name || p.route) && <p className="text-sm font-bold text-[#0064E0] truncate">{p.shift_name || p.route}</p>}
            {p.customer?.name && <p className="text-xs font-semibold text-slate-500 truncate">{p.customer.name}</p>}
            {(from || to) && (
              <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <MapPin className="w-3 h-3" /> {from ?? '?'} → {to ?? '?'}
              </p>
            )}
            {p.notes && (
              <p className="mt-1 flex items-start gap-1 text-xs font-semibold text-amber-800">
                <StickyNote className="w-3 h-3 mt-0.5 shrink-0" /> {p.notes}
              </p>
            )}
          </div>
          <span className={cn('shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', status.cls)}>
            {locale === 'de' ? status.de : status.en}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {p.status === 'assigned' && (
            <Button size="sm" onClick={() => confirm(p)} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4 mr-1" /> {L('Bestätigen', 'Confirm')}
            </Button>
          )}
          {highlight && !activeEntry && (
            <Button size="sm" onClick={() => clockIn(p.id)} className="rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] font-bold">
              <Play className="w-4 h-4 mr-1 fill-current" /> {L('Schicht starten', 'Start shift')}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 tracking-tight">
          <CalendarRange className="w-4 h-4 text-blue-600" /> {L('Meine Einsätze', 'My shifts')}
        </h3>
        <Link href="/dashboard/plans/my-week" className="text-xs font-bold text-blue-600 hover:underline">
          {L('Ganze Woche', 'Whole week')}
        </Link>
      </div>
      {plans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-400">
          {L('In den nächsten 7 Tagen sind keine Schichten geplant.', 'No shifts planned in the next 7 days.')}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {current.map((p) => card(p, true))}
          {upcoming.slice(0, current.length ? 5 : 6).map((p) => card(p, false))}
        </div>
      )}
    </section>
  )
}
