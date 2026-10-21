'use client'

/**
 * Meine Woche (Kundenfeedback Punkt 9) — the employee's own week:
 * working days, start/end, customer, start and end Betriebsstelle and
 * important notes. Changes by dispatch show up live (realtime).
 */

import React, { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Clock, Loader2, MapPin, StickyNote, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { usePlanningWeek } from '@/hooks/plans/usePlanningWeek'
import { PlanDetailDialog } from '@/components/plans/PlanDetailDialog'
import { PLAN_STATUS } from '@/components/plans/PlanCard'
import { absenceOn, isoWeek, planEndDay, planStartDay, weekDays, weekStartOf } from '@/lib/plans/week'
import { addDays, hoursBetween, localDateKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatHours, formatShiftRange, formatTimeOfDay, weekdayName } from '@/lib/time/format'
import { describePlan } from '@/lib/plans/notify'
import { notifyManagers, sendNotification } from '@/lib/notifications/service'
import { dbErrorMessage } from '@/lib/times/entry-status'

export default function MyWeekPage() {
  return (
    <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <MyWeek />
    </Suspense>
  )
}

function MyWeek() {
  const router = useRouter()
  const params = useSearchParams()
  const { user, profile, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [weekStart, setWeekStart] = useState(weekStartOf(params.get('date') || localDateKey()))
  const [detail, setDetail] = useState<Plan | null>(null)

  const { plans, absences, loading, refetch } = usePlanningWeek(weekStart, { onlyEmployeeId: user?.id })
  const days = weekDays(weekStart)
  const today = localDateKey()

  const mine = useMemo(() => plans.filter((p) => p.employee_id === user?.id), [plans, user?.id])
  const weekPlans = mine.filter((p) => days.includes(planStartDay(p)) && p.status !== 'rejected')
  const plannedHours = weekPlans.reduce((s, p) => s + hoursBetween(p.start_time, p.end_time, 0), 0)
  const openCount = weekPlans.filter((p) => p.status === 'assigned').length

  const respond = async (plan: Plan, status: 'confirmed' | 'rejected', reason?: string) => {
    const { error } = await createClient()
      .from('plans')
      .update({ status, rejection_reason: status === 'rejected' ? reason ?? null : null, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Antwort konnte nicht gespeichert werden', 'Could not save response')))
      return
    }
    toast.success(status === 'confirmed' ? L('Schicht bestätigt', 'Shift confirmed') : L('Schicht abgelehnt', 'Shift rejected'))
    const payload = {
      title: status === 'confirmed' ? 'Schicht bestätigt' : 'Schicht abgelehnt',
      message: `${profile?.full_name ?? 'Mitarbeiter'} hat die Schicht ${describePlan(plan)} ${status === 'confirmed' ? 'bestätigt' : `abgelehnt${reason ? ` – Grund: ${reason}` : ''}`}.`,
      module: 'plans' as const,
      moduleId: plan.id,
      link: `/dashboard/plans/week?date=${planStartDay(plan)}`,
      skipEmail: status === 'confirmed',
    }
    if (plan.creator_id && plan.creator_id !== user?.id) void sendNotification({ userId: plan.creator_id, ...payload })
    else void notifyManagers(payload)
    refetch(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Meine Woche', 'My week')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {weekPlans.length} {L('Schicht(en)', 'shift(s)')} · {formatHours(plannedHours, locale)} {L('Std. geplant', 'h planned')}
            {openCount > 0 && <span className="ml-2 font-bold text-amber-700">· {openCount} {L('zu bestätigen', 'to confirm')}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label={L('Vorwoche', 'Previous week')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 text-sm font-black text-slate-800 whitespace-nowrap">
              KW {isoWeek(weekStart)} · {formatDateDE(weekStart).slice(0, 6)}–{formatDateDE(addDays(weekStart, 6)).slice(0, 6)}
            </span>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label={L('Folgewoche', 'Next week')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setWeekStart(weekStartOf(localDateKey()))}>
            {L('Heute', 'Today')}
          </Button>
          {(isAdmin || isDispatcher) && (
            <Button variant="outline" className="rounded-xl font-bold" onClick={() => router.push(`/dashboard/plans/week?date=${weekStart}`)}>
              {L('Wochenplanung', 'Team week')}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const dayPlans = mine.filter((p) => planStartDay(p) === d)
            const cont = mine.filter((p) => planStartDay(p) < d && planEndDay(p) >= d)
            const absence = user ? absenceOn(absences, user.id, d) : undefined
            return (
              <div
                key={d}
                className={cn(
                  'rounded-2xl border bg-white p-4',
                  d === today ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className={cn('text-sm font-black', d === today ? 'text-[#0064E0]' : 'text-slate-800')}>
                    {weekdayName(d, locale)}, {formatDateDE(d)}
                    {d === today && <span className="ml-2 text-[10px] uppercase tracking-widest">{L('Heute', 'Today')}</span>}
                  </p>
                  {absence && (
                    <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', absence.kind === 'sick' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700')}>
                      {absence.kind === 'sick' ? L('Krank', 'Sick') : absence.pending ? L('Urlaub beantragt', 'Vacation requested') : L('Urlaub', 'Vacation')}
                    </span>
                  )}
                </div>

                {cont.map((p) => (
                  <p key={`c-${p.id}`} className="mt-2 text-xs font-bold text-indigo-700">
                    ↳ {L('Nachtschicht vom Vortag bis', 'Night shift from previous day until')} {formatTimeOfDay(p.end_time)}
                  </p>
                ))}

                {dayPlans.length === 0 && cont.length === 0 && !absence && (
                  <p className="mt-2 text-sm text-slate-400">{L('Frei', 'Off')}</p>
                )}

                {dayPlans.map((p) => {
                  const status = PLAN_STATUS[p.status] ?? PLAN_STATUS.assigned
                  const from = p.start_location ? `${p.start_location.name}${p.start_location.short_code ? ` (${p.start_location.short_code})` : ''}` : null
                  const to = p.destination_location ? `${p.destination_location.name}${p.destination_location.short_code ? ` (${p.destination_location.short_code})` : ''}` : null
                  const isToday = d === today || (planStartDay(p) <= today && planEndDay(p) >= today)
                  return (
                    <div key={p.id} className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <button className="text-left" onClick={() => setDetail(p)}>
                          <p className="flex items-center gap-2 text-base font-black text-slate-900 tabular-nums">
                            <Clock className="w-4 h-4 text-blue-600" />
                            {formatShiftRange(p.start_time, p.end_time, locale)}
                            <span className="text-xs font-bold text-slate-400">({formatHours(hoursBetween(p.start_time, p.end_time, 0), locale)} {L('Std.', 'h')})</span>
                          </p>
                          {(p.shift_name || p.route) && <p className="text-sm font-bold text-[#0064E0]">{p.shift_name || p.route}</p>}
                          {p.customer?.name && <p className="text-sm font-semibold text-slate-600">{p.customer.name}</p>}
                          {(from || to) && (
                            <p className="flex items-center gap-1 text-sm text-slate-600">
                              <MapPin className="w-3.5 h-3.5" /> {from ?? '—'} → {to ?? '—'}
                            </p>
                          )}
                          {p.notes && (
                            <p className="mt-1 flex items-start gap-1 text-sm font-semibold text-amber-800">
                              <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {p.notes}
                            </p>
                          )}
                        </button>
                        <span className={cn('rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', status.cls)}>
                          {locale === 'de' ? status.de : status.en}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.status === 'assigned' && (
                          <Button size="sm" onClick={() => respond(p, 'confirmed')} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold">
                            {L('Bestätigen', 'Confirm')}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="rounded-lg font-bold" onClick={() => setDetail(p)}>
                          {L('Details', 'Details')}
                        </Button>
                        {isToday && (
                          <Button size="sm" variant="outline" asChild className="rounded-lg font-bold">
                            <Link href="/dashboard">
                              <Timer className="w-4 h-4 mr-1" /> {L('Zeiterfassung', 'Time tracking')}
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      <PlanDetailDialog
        plan={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        onRespond={detail?.employee_id === user?.id ? (s, r) => respond(detail as Plan, s, r) : undefined}
        showTimeTracking
      />
    </div>
  )
}
