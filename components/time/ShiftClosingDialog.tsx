'use client'

/**
 * Abschlussansicht (Kundenfeedback Punkt 2 + 19).
 *
 * Shown after "Beenden" and for every shift that was ended but not yet
 * submitted. Compares planned, recorded and to-be-submitted times; the
 * employee can correct the values or take over the planned time, then
 * submits. A break of 0 minutes never blocks submitting.
 */

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Info, Loader2, Moon, Send, Undo2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { TimeEntry } from '@/lib/types'
import type { SubmitShiftValues } from '@/hooks/useTimeTracking'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { calculateShiftTimes, isValidDate, isValidTime, localDateKey, localTimeKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatEuro, formatHours, formatHoursLong, weekdayName } from '@/lib/time/format'
import { calculateSpesen, spesenTierLabel } from '@/lib/spesen'

interface ShiftClosingDialogProps {
  entry: TimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (entryId: string, values: SubmitShiftValues) => Promise<boolean>
}

const hhmm = (iso?: string | null) => (iso ? localTimeKey(new Date(iso)) : '')
const dayOf = (iso?: string | null) => (iso ? localDateKey(new Date(iso)) : '')

export function ShiftClosingDialog({ entry, open, onOpenChange, onSubmit }: ShiftClosingDialogProps) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { spesenRates } = useUser()

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [overnight, setOvernight] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const plan = entry?.plan && entry.plan.start_time && entry.plan.end_time ? entry.plan : null
  const recordedStart = entry?.clock_start_time ?? entry?.start_time ?? null
  const recordedEnd = entry?.clock_end_time ?? entry?.end_time ?? null

  useEffect(() => {
    if (!entry || !open) return
    setDate(entry.date)
    setStartTime(hhmm(entry.start_time))
    setEndTime(hhmm(entry.end_time))
    setBreakMinutes(String(entry.break_minutes ?? 0))
    setOvernight(!!entry.overnight_stay)
    setNotes(entry.notes ?? '')
  }, [entry, open])

  const brk = Math.max(0, Math.round(Number(breakMinutes.replace(',', '.')) || 0))
  const shift = useMemo(
    () => calculateShiftTimes(date, startTime, endTime, brk),
    [date, startTime, endTime, brk],
  )

  const errors: string[] = []
  const warnings: string[] = []
  if (!isValidDate(date)) errors.push(L('Bitte ein gültiges Datum eingeben.', 'Please enter a valid date.'))
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    errors.push(L('Bitte Beginn und Ende im Format HH:MM eingeben.', 'Please enter start and end as HH:MM.'))
  } else if (startTime === endTime) {
    errors.push(L('Ende entspricht dem Beginn.', 'End equals start.'))
  } else if (shift.netHours <= 0) {
    errors.push(L('Die Pause ist so lang wie die Schicht.', 'The break is as long as the shift.'))
  }
  if (Number(breakMinutes.replace(',', '.')) < 0) errors.push(L('Die Pause darf nicht negativ sein.', 'The break cannot be negative.'))
  if (shift.grossHours > 16) {
    warnings.push(L('Ungewöhnlich lange Schicht (über 16 Std.) – bitte Ende prüfen.', 'Unusually long shift (over 16 h) – please check the end.'))
  }

  const deviates =
    !!recordedStart &&
    !!recordedEnd &&
    (hhmm(recordedStart) !== startTime || hhmm(recordedEnd) !== endTime || dayOf(recordedStart) !== date)

  // Forgotten clock-out: the recording spans 24 h or more, but HH:MM alone
  // can't express that — submitting unchanged would silently store < 24 h.
  const recordedHours =
    recordedStart && recordedEnd ? (new Date(recordedEnd).getTime() - new Date(recordedStart).getTime()) / 3_600_000 : null
  if (recordedHours != null && recordedHours >= 24 && !deviates) {
    errors.push(
      L(
        `Die Erfassung läuft über ${Math.floor(recordedHours)} Std. (bis ${formatDateDE(dayOf(recordedEnd))} ${hhmm(recordedEnd)}). Bitte das tatsächliche Ende eintragen oder „Planzeit übernehmen“.`,
        `The recording spans ${Math.floor(recordedHours)} h (until ${dayOf(recordedEnd)} ${hhmm(recordedEnd)}). Please enter the actual end or apply the planned time.`,
      ),
    )
  }

  const applyPlan = () => {
    if (!plan?.start_time || !plan.end_time) return
    setDate(dayOf(plan.start_time))
    setStartTime(hhmm(plan.start_time))
    setEndTime(hhmm(plan.end_time))
  }

  const planApplied =
    !!plan && dayOf(plan.start_time) === date && hhmm(plan.start_time) === startTime && hhmm(plan.end_time) === endTime

  const spesen = calculateSpesen(shift.netHours, overnight, spesenRates)

  const handleSubmit = async () => {
    if (!entry || errors.length) return
    setSubmitting(true)
    const ok = await onSubmit(entry.id, {
      date,
      startTime,
      endTime,
      breakMinutes: brk,
      overnightStay: overnight,
      notes,
    })
    setSubmitting(false)
    if (ok) onOpenChange(false)
  }

  const cellLabel = 'text-[10px] font-black uppercase tracking-widest text-slate-400'
  const readCell = 'h-11 flex items-center justify-center rounded-xl bg-slate-50 text-sm font-bold text-slate-600 tabular-nums'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="p-6 md:p-8 space-y-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900">
              {L('Schicht prüfen und absenden', 'Review and submit shift')}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {entry
                ? `${weekdayName(entry.date, locale)}, ${formatDateDE(entry.date)}${plan?.shift_name || plan?.route ? ` · ${plan.shift_name || plan.route}` : ''}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {/* Comparison */}
          <div className="grid grid-cols-[90px_1fr_1fr_1.3fr] gap-2 items-center">
            <span />
            <span className={cn(cellLabel, 'text-center')}>{L('Geplant', 'Planned')}</span>
            <span className={cn(cellLabel, 'text-center')}>{L('Erfasst', 'Recorded')}</span>
            <span className={cn(cellLabel, 'text-center text-[#0064E0]')}>{L('Absenden', 'Submit')}</span>

            <span className={cellLabel}>{L('Datum', 'Date')}</span>
            <span className={readCell}>{plan ? formatDateDE(dayOf(plan.start_time)).slice(0, 6) : '—'}</span>
            <span className={readCell}>{recordedStart ? formatDateDE(dayOf(recordedStart)).slice(0, 6) : '—'}</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl font-bold" />

            <span className={cellLabel}>{L('Beginn', 'Start')}</span>
            <span className={readCell}>{plan ? hhmm(plan.start_time) : '—'}</span>
            <span className={readCell}>{hhmm(recordedStart) || '—'}</span>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 rounded-xl font-bold tabular-nums" />

            <span className={cellLabel}>{L('Ende', 'End')}</span>
            <span className={readCell}>{plan ? hhmm(plan.end_time) : '—'}</span>
            <span className={readCell}>{hhmm(recordedEnd) || '—'}</span>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 rounded-xl font-bold tabular-nums" />

            <span className={cellLabel}>{L('Pause', 'Break')}</span>
            <span className={cn(readCell, 'text-xs')}>{L('nicht hinterlegt', 'not set')}</span>
            <span className={readCell}>{entry ? `${entry.break_minutes ?? 0} Min.` : '—'}</span>
            <div className="relative">
              <Input
                inputMode="numeric"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value.replace(/[^\d]/g, ''))}
                className="h-11 rounded-xl font-bold tabular-nums pr-12"
                aria-label={L('Pause in Minuten', 'Break in minutes')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Min.</span>
            </div>
          </div>

          {!plan && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 shrink-0" />
              {L('Für diese Schicht ist keine Planung hinterlegt.', 'No planned shift is linked to this entry.')}
            </p>
          )}

          {/* Result */}
          <div
            className={cn(
              'rounded-2xl border p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3',
              errors.length ? 'border-red-200 bg-red-50' : 'border-blue-100 bg-blue-50/60',
            )}
          >
            <div>
              <p className={cellLabel}>{L('Arbeitszeit', 'Working time')}</p>
              <p className="text-4xl font-black tracking-tight text-[#0064E0] tabular-nums">
                {formatHours(shift.netHours, locale)} <span className="text-lg">{L('Std.', 'h')}</span>
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                = {formatHoursLong(shift.netHours, locale)}
                {brk > 0 ? ` · ${L('abzgl.', 'minus')} ${brk} Min. ${L('Pause', 'break')}` : ` · ${L('ohne Pause', 'no break')}`}
              </p>
            </div>
            <div className="text-sm space-y-1 md:text-right">
              {shift.isOvernight && (
                <p className="flex md:justify-end items-center gap-1.5 font-bold text-indigo-700">
                  <Moon className="w-4 h-4" />
                  {L('Ende am Folgetag', 'Ends next day')} ({weekdayName(shift.endDate, locale, true)}, {formatDateDE(shift.endDate).slice(0, 6)})
                </p>
              )}
              <p className="text-slate-600 font-semibold">
                {L('Spesen', 'Per diem')}: {formatEuro(spesen, locale)}{' '}
                <span className="text-slate-400 font-medium">({spesenTierLabel(spesen, spesenRates, locale)})</span>
              </p>
            </div>
          </div>

          {errors.map((e) => (
            <p key={e} className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {e}
            </p>
          ))}
          {warnings.map((w) => (
            <p key={w} className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {w}
            </p>
          ))}
          {deviates && (
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              {L(
                `Abweichung zur Erfassung (erfasst ${hhmm(recordedStart)}–${hhmm(recordedEnd)}). Die ursprüngliche Erfassung bleibt für Disposition und Admin im Verlauf sichtbar.`,
                `Differs from the recording (${hhmm(recordedStart)}–${hhmm(recordedEnd)}). The original recording stays visible to dispatch and admin in the history.`,
              )}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
              <span className="text-sm font-bold text-slate-700">{L('Übernachtung', 'Overnight stay')}</span>
              <Switch checked={overnight} onCheckedChange={setOvernight} />
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L('Notiz (optional)', 'Note (optional)')}
              className="rounded-2xl min-h-[48px]"
            />
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              className="md:mr-auto rounded-xl font-bold text-slate-500"
              onClick={() => onOpenChange(false)}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              {L('Später absenden', 'Submit later')}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!plan || planApplied}
              onClick={applyPlan}
              className="h-12 rounded-xl font-black uppercase text-[11px] tracking-widest"
            >
              {planApplied ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> : <CalendarClock className="w-4 h-4 mr-2" />}
              {L('Planzeit übernehmen', 'Apply planned time')}
            </Button>
            <Button
              type="button"
              disabled={!entry || errors.length > 0 || submitting}
              onClick={handleSubmit}
              className="h-12 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] text-white font-black uppercase text-[11px] tracking-widest"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {L('Schicht absenden', 'Submit shift')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
