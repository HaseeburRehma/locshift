'use client'

/**
 * Umverteilung (Kundenfeedback Punkt 8): shows old and new assignment
 * before saving and warns about overlaps, absences, expired qualifications
 * and shifts that already started.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, BellRing, Loader2, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Plan } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { describePlan } from '@/lib/plans/notify'
import { reassignWarnings, type ReassignWarning, type WeekAbsence, type WeekQualification } from '@/lib/plans/week'
import { formatDateDE, formatShiftRange } from '@/lib/time/format'
import type { PlanningEmployee } from '@/hooks/plans/usePlanningWeek'

const UNASSIGNED = '__unassigned__'

interface Props {
  plan: Plan | null
  /** Pre-selected target (drag & drop); null = let the user pick. */
  targetEmployeeId: string | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: PlanningEmployee[]
  plans: Plan[]
  absences: WeekAbsence[]
  qualifications: WeekQualification[]
  onConfirm: (plan: Plan, target: string | null, notify: boolean) => Promise<boolean>
}

export function ReassignDialog({ plan, targetEmployeeId, open, onOpenChange, employees, plans, absences, qualifications, onConfirm }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [target, setTarget] = useState<string>('')
  const [notify, setNotify] = useState(true)
  const [ackStarted, setAckStarted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setTarget(targetEmployeeId === null ? UNASSIGNED : targetEmployeeId ?? '')
    setNotify(true)
    setAckStarted(false)
  }, [open, targetEmployeeId])

  const targetId = target === UNASSIGNED ? null : target || undefined
  const warnings: ReassignWarning[] = useMemo(() => {
    if (!plan || !targetId) return plan && new Date(plan.start_time) <= new Date() ? [{ kind: 'started' }] : []
    return reassignWarnings(plan, targetId, { plans, absences, qualifications })
  }, [plan, targetId, plans, absences, qualifications])

  if (!plan) return null
  const name = (id: string | null) => (id ? employees.find((e) => e.id === id)?.full_name ?? '—' : L('Unbesetzt', 'Unassigned'))
  const started = warnings.some((w) => w.kind === 'started')
  const sameTarget = (targetId ?? null) === plan.employee_id
  const canSave = target !== '' && !sameTarget && (!started || ackStarted) && !saving

  const text = (w: ReassignWarning): string => {
    switch (w.kind) {
      case 'started':
        return L('Die Schicht hat bereits begonnen bzw. ist abgeschlossen. Umverteilen nur in Ausnahmefällen.', 'The shift has already started or finished. Reassign only in exceptional cases.')
      case 'overlap':
        return L(`Überschneidung mit einer anderen Schicht (${formatShiftRange(w.start_time, w.end_time, 'de')}).`, `Overlaps another shift (${formatShiftRange(w.start_time, w.end_time, 'en')}).`)
      case 'absence':
        return w.absence.kind === 'sick'
          ? L('Mitarbeiter ist an diesem Tag krank gemeldet.', 'Employee is on sick leave that day.')
          : L(`Mitarbeiter hat an diesem Tag Urlaub${w.absence.pending ? ' (beantragt)' : ''}.`, `Employee is on vacation that day${w.absence.pending ? ' (requested)' : ''}.`)
      case 'qualification_expired':
        return L(`${w.name} ist am ${formatDateDE(w.expires_at)} abgelaufen.`, `${w.name} expired on ${w.expires_at}.`)
      case 'fitness_missing':
        return L('Keine gültige Tauglichkeit hinterlegt.', 'No valid fitness certificate on file.')
    }
  }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    const ok = await onConfirm(plan, targetId ?? null, notify)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[2rem] p-6 md:p-8">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-2xl font-black tracking-tight">{L('Schicht umverteilen', 'Reassign shift')}</DialogTitle>
          <DialogDescription>{describePlan(plan)}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{L('Bisher', 'Current')}</p>
            <p className="text-sm font-black text-slate-800">{name(plan.employee_id)}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400" />
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{L('Neu', 'New')}</p>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 border-0 bg-transparent p-0 text-sm font-black text-[#0064E0] shadow-none focus:ring-0">
                <SelectValue placeholder={L('Mitarbeiter wählen', 'Choose employee')} />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                <SelectItem value={UNASSIGNED}>{L('Unbesetzt', 'Unassigned')}</SelectItem>
                {employees.filter((e) => e.id !== plan.employee_id).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {L('Zeiten, Kunde, Betriebsstellen und weitere Angaben bleiben unverändert. Der neue Mitarbeiter muss die Schicht bestätigen.', 'Times, customer, locations and other details stay unchanged. The new employee has to confirm the shift.')}
        </p>

        {warnings.length > 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-1.5">
            {warnings.map((w, i) => (
              <p key={i} className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                {w.kind === 'started' ? <Lock className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
                {text(w)}
              </p>
            ))}
            {started && (
              <label className="flex items-center gap-2 pt-1 text-sm font-bold text-amber-900">
                <Checkbox checked={ackStarted} onCheckedChange={(v) => setAckStarted(!!v)} />
                {L('Trotzdem umverteilen', 'Reassign anyway')}
              </label>
            )}
          </div>
        )}

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
          <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} />
          <BellRing className="w-4 h-4 text-slate-400" />
          {L('Beide Mitarbeiter per E-Mail und App benachrichtigen', 'Notify both employees by email and app')}
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" className="rounded-xl font-bold" onClick={() => onOpenChange(false)}>
            {L('Abbrechen', 'Cancel')}
          </Button>
          <Button disabled={!canSave} onClick={save} className="h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-black uppercase text-[11px] tracking-widest">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {L('Umverteilung speichern', 'Save reassignment')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
