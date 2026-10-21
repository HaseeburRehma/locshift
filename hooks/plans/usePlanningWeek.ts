'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { Plan } from '@/lib/types'
import { addDays, localDateKey } from '@/lib/time/shift-hours'
import type { WeekAbsence, WeekQualification } from '@/lib/plans/week'
import { notifyPlanAssigned, notifyPlanRemoved } from '@/lib/plans/notify'
import { dbErrorMessage } from '@/lib/times/entry-status'

export const WEEK_PLAN_SELECT =
  '*, employee:profiles!employee_id(id, full_name), customer:customers(id, name), start_location:operational_locations!start_location_id(id, name, short_code), destination_location:operational_locations!destination_location_id(id, name, short_code)'

export interface PlanningEmployee {
  id: string
  full_name: string
  role: string
  phone: string | null
  avatar_url: string | null
}

/**
 * Everything the weekly planning grid needs for one week (Mon–Sun), plus
 * the previous Sunday so night shifts reaching into Monday are visible.
 */
export function usePlanningWeek(weekStart: string, opts: { onlyEmployeeId?: string } = {}) {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()
  const suffix = useRef(Math.random().toString(36).slice(2, 8))

  const [plans, setPlans] = useState<Plan[]>([])
  const [employees, setEmployees] = useState<PlanningEmployee[]>([])
  const [absences, setAbsences] = useState<WeekAbsence[]>([])
  const [qualifications, setQualifications] = useState<WeekQualification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (silent = false) => {
    if (!profile?.organization_id) return
    if (!silent) setLoading(true)
    const orgId = profile.organization_id
    const from = new Date(`${addDays(weekStart, -1)}T00:00:00`).toISOString()
    const to = new Date(`${addDays(weekStart, 7)}T00:00:00`).toISOString()

    let plansQ = supabase
      .from('plans')
      .select(WEEK_PLAN_SELECT)
      .eq('organization_id', orgId)
      .lt('start_time', to)
      .gt('end_time', from)
      .neq('status', 'cancelled')
      .order('start_time')
    if (opts.onlyEmployeeId) plansQ = plansQ.eq('employee_id', opts.onlyEmployeeId)

    let empQ = supabase
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url, is_active')
      .eq('organization_id', orgId)
      .order('full_name')
    if (opts.onlyEmployeeId) empQ = empQ.eq('id', opts.onlyEmployeeId)

    let absQ = supabase
      .from('calendar_events')
      .select('creator_id, event_type, start_time, end_time, request_status')
      .eq('organization_id', orgId)
      .in('event_type', ['holiday', 'sick_leave'])
      .lt('start_time', to)
      .gt('end_time', from)
    if (opts.onlyEmployeeId) absQ = absQ.eq('creator_id', opts.onlyEmployeeId)

    const qualQ = opts.onlyEmployeeId
      ? null
      : supabase
          .from('qualifications')
          .select('user_id, name, doc_type, expires_at, is_required, archived_at')
          .eq('organization_id', orgId)

    const [plansRes, empRes, absRes, qualRes] = await Promise.all([plansQ, empQ, absQ, qualQ ?? Promise.resolve({ data: [] })])

    if (plansRes.error) {
      console.error('[usePlanningWeek]', plansRes.error)
      toast.error(L('Planung konnte nicht geladen werden', 'Could not load planning'))
    }
    setPlans((plansRes.data ?? []) as Plan[])
    setEmployees(
      ((empRes.data ?? []) as Array<PlanningEmployee & { is_active: boolean | null }>)
        .filter((e) => e.is_active !== false)
        .map((e) => ({ ...e, full_name: e.full_name || '—', role: String(e.role ?? 'employee').toLowerCase() })),
    )
    setAbsences(
      ((absRes.data ?? []) as Array<Record<string, any>>)
        .filter((a) => (a.request_status ?? 'approved') !== 'rejected')
        .map((a) => ({
          employee_id: a.creator_id,
          start_date: localDateKey(new Date(a.start_time)),
          end_date: localDateKey(new Date(new Date(a.end_time).getTime() - 60_000)),
          kind: a.event_type === 'sick_leave' ? 'sick' : 'vacation',
          pending: (a.request_status ?? 'approved') === 'pending',
        })),
    )
    setQualifications((qualRes.data ?? []) as WeekQualification[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, weekStart, opts.onlyEmployeeId, supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  // Coalesce bursts (a bulk insert of 50 shifts = one reload, not 50).
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(() => fetchAll(true), 400)
  }, [fetchAll])

  useEffect(() => {
    if (!profile?.organization_id) return
    const channel = supabase
      .channel(`planning-week-${profile.organization_id}-${suffix.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans', filter: `organization_id=eq.${profile.organization_id}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `organization_id=eq.${profile.organization_id}` }, scheduleRefresh)
      // A shift moved away from me is no longer visible to me (RLS), so its
      // UPDATE never reaches this channel — my own "plans" notification does.
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload: { new?: { module_type?: string } }) => {
        if (payload.new?.module_type === 'plans') scheduleRefresh()
      })
      .subscribe()
    // Also catch up after the tab was in the background.
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleRefresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      supabase.removeChannel(channel)
    }
  }, [profile?.organization_id, profile?.id, scheduleRefresh, supabase])

  /**
   * Moves a shift to another employee (or to "unbesetzt"). Times, customer
   * and Betriebsstellen stay untouched; the new assignee must confirm.
   */
  const reassign = async (plan: Plan, targetEmployeeId: string | null, notify = true): Promise<boolean> => {
    const previous = plan.employee_id
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, employee_id: targetEmployeeId, status: 'assigned' } : p)))
    const { data, error } = await supabase
      .from('plans')
      .update({ employee_id: targetEmployeeId, status: 'assigned', rejection_reason: null, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .select(WEEK_PLAN_SELECT)
      .single()
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Umverteilung fehlgeschlagen', 'Reassignment failed')))
      fetchAll(true)
      return false
    }
    const updated = data as Plan
    if (notify) {
      const name = (id: string | null) => employees.find((e) => e.id === id)?.full_name ?? null
      await Promise.all([
        previous ? notifyPlanRemoved(updated, previous, name(targetEmployeeId)) : Promise.resolve(),
        targetEmployeeId ? notifyPlanAssigned(updated, targetEmployeeId, name(previous)) : Promise.resolve(),
      ])
    }
    toast.success(
      targetEmployeeId
        ? L('Schicht umverteilt – beide Mitarbeiter wurden benachrichtigt', 'Shift reassigned – both employees were notified')
        : L('Schicht ist jetzt unbesetzt', 'Shift is now unassigned'),
    )
    fetchAll(true)
    return true
  }

  return { plans, employees, absences, qualifications, loading, refetch: fetchAll, reassign }
}
