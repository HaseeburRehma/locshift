'use client'

/**
 * Wochenplanung (Kundenfeedback Punkte 7 + 8) — admin & dispatch.
 *
 * Employees in rows, Monday–Sunday side by side. Shifts appear on the day
 * they start; night shifts show "+1" and a continuation chip on the next
 * day. Drag a future shift onto another employee (same day) or use
 * "Mitarbeiter ändern" in the details to reassign — both employees are
 * notified by email and app push. Names and day headers stay sticky.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { usePlanningWeek } from '@/hooks/plans/usePlanningWeek'
import { PlanCard, PLAN_STATUS } from '@/components/plans/PlanCard'
import { PlanDetailDialog } from '@/components/plans/PlanDetailDialog'
import { ReassignDialog } from '@/components/plans/ReassignDialog'
import { absenceOn, hasStarted, isoWeek, planEndDay, planStartDay, weekDays, weekStartOf } from '@/lib/plans/week'
import { addDays, localDateKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatTimeOfDay, weekdayName } from '@/lib/time/format'
import { publicHolidayName } from '@/lib/time/zuschlag'

const UNASSIGNED_ROW = '__unassigned__'

export default function WeekPlanningPage() {
  return (
    <Suspense fallback={<div className="flex h-[70vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <WeekPlanning />
    </Suspense>
  )
}

function WeekPlanning() {
  const router = useRouter()
  const params = useSearchParams()
  const { isAdmin, isDispatcher, isLoading, surchargeRules } = useUser()
  const isManager = isAdmin || isDispatcher
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)

  const [weekStart, setWeekStart] = useState(weekStartOf(params.get('date') || localDateKey()))
  const [search, setSearch] = useState('')
  const [customer, setCustomer] = useState('all')
  const [onlyWithShifts, setOnlyWithShifts] = useState(false)
  const [showAllRoles, setShowAllRoles] = useState(false)
  const [detail, setDetail] = useState<Plan | null>(null)
  const [reassign, setReassign] = useState<{ plan: Plan; target: string | null | undefined } | null>(null)
  const [dragPlan, setDragPlan] = useState<Plan | null>(null)
  const [dropHover, setDropHover] = useState<string | null>(null)

  const { plans, employees, absences, qualifications, loading, reassign: doReassign } = usePlanningWeek(weekStart)

  useEffect(() => {
    if (!isLoading && !isManager) router.replace('/dashboard/plans/my-week')
  }, [isLoading, isManager, router])

  useEffect(() => {
    router.replace(`/dashboard/plans/week?date=${weekStart}`, { scroll: false })
  }, [weekStart, router])

  const days = weekDays(weekStart)
  const today = localDateKey()

  const customers = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of plans) if (p.customer?.id) map.set(p.customer.id, p.customer.name)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'de'))
  }, [plans])

  const visiblePlans = useMemo(
    () => plans.filter((p) => customer === 'all' || p.customer_id === customer),
    [plans, customer],
  )

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees
      .filter((e) => showAllRoles || e.role === 'employee' || e.role === 'technician' || visiblePlans.some((p) => p.employee_id === e.id))
      .filter((e) => !q || e.full_name.toLowerCase().includes(q))
      .filter((e) => !onlyWithShifts || visiblePlans.some((p) => p.employee_id === e.id && days.includes(planStartDay(p))))
  }, [employees, search, onlyWithShifts, showAllRoles, visiblePlans, days])

  const unassigned = visiblePlans.filter((p) => !p.employee_id && days.includes(planStartDay(p)))

  const cellPlans = (employeeId: string | null, day: string) =>
    visiblePlans.filter((p) => (p.employee_id ?? null) === employeeId && planStartDay(p) === day)
  const continuations = (employeeId: string | null, day: string) =>
    visiblePlans.filter((p) => (p.employee_id ?? null) === employeeId && planStartDay(p) < day && planEndDay(p) >= day)

  const canDrop = (employeeId: string | null, day: string) =>
    !!dragPlan && (dragPlan.employee_id ?? null) !== employeeId && planStartDay(dragPlan) === day

  const nameOf = (id: string | null) => (id ? employees.find((e) => e.id === id)?.full_name ?? '—' : null)

  if (isLoading || !isManager) return null

  const renderCell = (employeeId: string | null, day: string) => {
    const key = `${employeeId ?? UNASSIGNED_ROW}:${day}`
    const absence = employeeId ? absenceOn(absences, employeeId, day) : undefined
    const items = cellPlans(employeeId, day)
    const conts = continuations(employeeId, day)
    const droppable = canDrop(employeeId, day)
    return (
      <div
        key={key}
        onDragOver={(e) => {
          if (droppable) {
            e.preventDefault()
            setDropHover(key)
          }
        }}
        onDragLeave={() => setDropHover((k) => (k === key ? null : k))}
        onDrop={(e) => {
          e.preventDefault()
          setDropHover(null)
          if (droppable && dragPlan) setReassign({ plan: dragPlan, target: employeeId })
          setDragPlan(null)
        }}
        className={cn(
          'group relative min-h-[84px] border-l border-t border-slate-100 p-1.5 space-y-1.5 transition-colors',
          day === today && 'bg-blue-50/30',
          absence && (absence.kind === 'sick' ? 'bg-rose-50/60' : 'bg-teal-50/60'),
          droppable && 'bg-blue-50/60 outline-dashed outline-2 -outline-offset-2 outline-blue-300',
          dropHover === key && 'bg-blue-100/70',
        )}
      >
        {absence && (
          <span
            className={cn(
              'block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
              absence.kind === 'sick' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700',
              absence.pending && 'border border-dashed border-teal-400 bg-transparent',
            )}
          >
            {absence.kind === 'sick' ? L('Krank', 'Sick') : absence.pending ? L('Urlaub beantragt', 'Vacation requested') : L('Urlaub', 'Vacation')}
          </span>
        )}
        {conts.map((p) => (
          <button
            key={`c-${p.id}`}
            onClick={() => setDetail(p)}
            className="block w-full truncate rounded-md border border-dashed border-indigo-200 bg-indigo-50/60 px-1.5 py-0.5 text-left text-[10px] font-bold text-indigo-700"
            title={L('Nachtschicht vom Vortag', 'Night shift from previous day')}
          >
            ↳ {L('bis', 'until')} {formatTimeOfDay(p.end_time)} {p.shift_name ? `· ${p.shift_name}` : ''}
          </button>
        ))}
        {items.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            locale={locale}
            draggable={!hasStarted(p)}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', p.id)
              setDragPlan(p)
            }}
            onClick={() => setDetail(p)}
          />
        ))}
        {items.length === 0 && !absence && (
          <Link
            href={`/dashboard/plans/new?from=week&date=${day}${employeeId ? `&employee=${employeeId}` : ''}`}
            className="absolute inset-1 hidden items-center justify-center rounded-lg text-slate-300 hover:bg-slate-50 hover:text-blue-500 group-hover:flex"
            aria-label={L('Schicht anlegen', 'Add shift')}
          >
            <Plus className="w-4 h-4" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="px-3 md:px-6 py-6 space-y-4" onDragEnd={() => { setDragPlan(null); setDropHover(null) }}>
      <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Wochenplanung', 'Weekly planning')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {L('Schichten per Drag & Drop umverteilen – beide Mitarbeiter werden benachrichtigt.', 'Drag & drop shifts to reassign – both employees are notified.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label={L('Vorwoche', 'Previous week')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-2 text-sm font-black text-slate-800 whitespace-nowrap">
              KW {isoWeek(weekStart)} · {formatDateDE(weekStart).slice(0, 6)}–{formatDateDE(addDays(weekStart, 6))}
            </span>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label={L('Folgewoche', 'Next week')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" className="rounded-xl font-bold" onClick={() => setWeekStart(weekStartOf(localDateKey()))}>
            {L('Heute', 'Today')}
          </Button>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 h-10">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={weekStart}
              onChange={(e) => e.target.value && setWeekStart(weekStartOf(e.target.value))}
              className="bg-transparent text-sm font-bold text-slate-700 outline-none"
              aria-label={L('Woche wählen', 'Pick week')}
            />
          </label>
          <Button asChild className="rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-bold">
            <Link href={`/dashboard/plans/new?from=week&date=${weekStart}`}>
              <Plus className="w-4 h-4 mr-1" /> {L('Schicht anlegen', 'Add shift')}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L('Mitarbeiter suchen …', 'Search employee …')}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <Select value={customer} onValueChange={setCustomer}>
          <SelectTrigger className="h-10 w-full sm:w-56 rounded-xl font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{L('Alle Kunden', 'All customers')}</SelectItem>
            {customers.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 px-1">
          <input type="checkbox" checked={onlyWithShifts} onChange={(e) => setOnlyWithShifts(e.target.checked)} />
          {L('nur mit Schichten', 'only with shifts')}
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 px-1">
          <input type="checkbox" checked={showAllRoles} onChange={(e) => setShowAllRoles(e.target.checked)} />
          <Users className="w-4 h-4" /> {L('auch Admin/Disposition', 'include admin/dispatch')}
        </label>
        <div className="flex flex-wrap items-center gap-1.5 ml-auto text-[10px] font-black uppercase tracking-wider">
          {(['assigned', 'confirmed', 'rejected'] as const).map((s) => (
            <span key={s} className={cn('rounded-md border px-1.5 py-0.5', PLAN_STATUS[s].cls)}>{locale === 'de' ? PLAN_STATUS[s].de : PLAN_STATUS[s].en}</span>
          ))}
          <span className="rounded-md bg-teal-100 px-1.5 py-0.5 text-teal-700">{L('Urlaub', 'Vacation')}</span>
          <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-rose-700">{L('Krank', 'Sick')}</span>
        </div>
      </div>

      <div className="relative rounded-2xl border border-slate-200 bg-white overflow-auto max-h-[calc(100vh-260px)]">
        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}
        <div className="grid min-w-[1180px]" style={{ gridTemplateColumns: '200px repeat(7, minmax(140px, 1fr))' }}>
          {/* Header */}
          <div className="sticky top-0 left-0 z-20 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {L('Mitarbeiter', 'Employee')}
          </div>
          {days.map((d) => {
            const holiday = publicHolidayName(d, surchargeRules)
            return (
              <div
                key={d}
                className={cn(
                  'sticky top-0 z-10 border-b border-l border-slate-200 bg-slate-50 px-2 py-2',
                  d === today && 'bg-blue-50',
                )}
              >
                <p className={cn('text-xs font-black', d === today ? 'text-[#0064E0]' : 'text-slate-800')}>
                  {weekdayName(d, locale, true)} {formatDateDE(d).slice(0, 6)}
                </p>
                {holiday && <p className="truncate text-[9px] font-bold text-amber-700">{holiday}</p>}
              </div>
            )
          })}

          {/* Unassigned row */}
          {(unassigned.length > 0 || dragPlan) && (
            <>
              <div className="sticky left-0 z-10 border-t border-slate-100 bg-amber-50 px-3 py-2">
                <p className="text-sm font-black text-amber-800">{L('Unbesetzt', 'Unassigned')}</p>
                <p className="text-[10px] font-semibold text-amber-700">{unassigned.length} {L('Schicht(en)', 'shift(s)')}</p>
              </div>
              {days.map((d) => renderCell(null, d))}
            </>
          )}

          {rows.length === 0 && (
            <div className="col-span-8 border-t border-slate-100 p-8 text-center text-sm font-semibold text-slate-400">
              {L('Keine Mitarbeiter gefunden.', 'No employees found.')}
            </div>
          )}

          {rows.map((e) => {
            const weekCount = visiblePlans.filter((p) => p.employee_id === e.id && days.includes(planStartDay(p))).length
            return (
              <React.Fragment key={e.id}>
                <div className="sticky left-0 z-10 border-t border-slate-100 bg-white px-3 py-2">
                  <p className="text-sm font-black text-slate-900 truncate">{e.full_name}</p>
                  <p className="text-[10px] font-semibold text-slate-400 truncate">
                    {e.phone ? `${e.phone} · ` : ''}{weekCount} {L('Schicht(en)', 'shift(s)')}
                  </p>
                </div>
                {days.map((d) => renderCell(e.id, d))}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      <PlanDetailDialog
        plan={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        employeeName={detail ? nameOf(detail.employee_id) : undefined}
        canEdit
        onReassign={detail ? () => { setReassign({ plan: detail, target: undefined }); setDetail(null) } : undefined}
      />
      <ReassignDialog
        plan={reassign?.plan ?? null}
        targetEmployeeId={reassign?.target}
        open={!!reassign}
        onOpenChange={(o) => !o && setReassign(null)}
        employees={employees}
        plans={plans}
        absences={absences}
        qualifications={qualifications}
        onConfirm={doReassign}
      />
    </div>
  )
}
