'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { CorrectionValues, TimeEntry } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { calculateShiftTimes, isValidDate, isValidTime, localTimeKey } from '@/lib/time/shift-hours'
import { formatDateDE, formatHours, formatShiftRange } from '@/lib/time/format'
import { calculateSpesen } from '@/lib/spesen'

interface Props {
  entry: TimeEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (entry: TimeEntry, proposed: CorrectionValues, reason: string) => Promise<boolean>
}

const hhmm = (iso?: string | null) => (iso ? localTimeKey(new Date(iso)) : '')

export function CorrectionRequestDialog({ entry, open, onOpenChange, onSubmit }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { spesenRates } = useUser()

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('0')
  const [overnight, setOvernight] = useState(false)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!entry || !open) return
    setDate(entry.date)
    setStartTime(hhmm(entry.start_time))
    setEndTime(hhmm(entry.end_time))
    setBreakMinutes(String(entry.break_minutes ?? 0))
    setOvernight(!!entry.overnight_stay)
    setNotes(entry.notes ?? '')
    setReason('')
  }, [entry, open])

  const brk = Math.max(0, Number(breakMinutes) || 0)
  const shift = useMemo(() => calculateShiftTimes(date, startTime, endTime, brk), [date, startTime, endTime, brk])

  const changed =
    !!entry &&
    (date !== entry.date ||
      startTime !== hhmm(entry.start_time) ||
      endTime !== hhmm(entry.end_time) ||
      brk !== (entry.break_minutes ?? 0) ||
      overnight !== !!entry.overnight_stay ||
      (notes || '') !== (entry.notes || ''))

  let error: string | null = null
  if (!isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime)) {
    error = L('Bitte Datum, Beginn und Ende vollständig angeben.', 'Please fill in date, start and end.')
  } else if (shift.netHours <= 0) {
    error = L('Die beantragte Schicht ergibt 0 Stunden.', 'The requested shift results in 0 hours.')
  } else if (!changed) {
    error = L('Bitte mindestens einen Wert ändern.', 'Please change at least one value.')
  } else if (reason.trim().length < 3) {
    error = L('Bitte eine kurze Begründung angeben.', 'Please give a short reason.')
  }

  const submit = async () => {
    if (!entry || error) return
    setSending(true)
    const proposed: CorrectionValues = {
      date,
      start_time: shift.startISO,
      end_time: shift.endISO,
      break_minutes: brk,
      overnight_stay: overnight,
      meal_allowance: calculateSpesen(shift.netHours, overnight, spesenRates),
      notes: notes.trim() || null,
    }
    const ok = await onSubmit(entry, proposed, reason)
    setSending(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[2rem] p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-2xl font-black tracking-tight">{L('Korrektur beantragen', 'Request correction')}</DialogTitle>
          <DialogDescription>
            {entry
              ? L(
                  `Aktuell gültig: ${formatDateDE(entry.date)}, ${formatShiftRange(entry.start_time, entry.end_time, 'de')}, ${formatHours(entry.net_hours, 'de')} Std. Die bisherigen Werte bleiben bis zur Freigabe durch Disposition oder Admin maßgeblich.`,
                  `Currently valid: ${entry.date}, ${formatShiftRange(entry.start_time, entry.end_time, 'en')}, ${formatHours(entry.net_hours, 'en')} h. The current values stay valid until dispatch or admin approves.`,
                )
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="col-span-2 text-xs font-black uppercase tracking-widest text-slate-400">
            {L('Datum', 'Date')}
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-11 rounded-xl" />
          </label>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
            {L('Beginn', 'Start')}
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 h-11 rounded-xl" />
          </label>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
            {L('Ende', 'End')}
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 h-11 rounded-xl" />
          </label>
          <label className="text-xs font-black uppercase tracking-widest text-slate-400">
            {L('Pause (Min.)', 'Break (min)')}
            <Input
              inputMode="numeric"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value.replace(/[^\d]/g, ''))}
              className="mt-1 h-11 rounded-xl"
            />
          </label>
          <label className="flex items-end justify-between gap-2 pb-2.5 text-sm font-bold text-slate-700">
            {L('Übernachtung', 'Overnight')}
            <Switch checked={overnight} onCheckedChange={setOvernight} />
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={L('Notiz (optional)', 'Note (optional)')}
            className="col-span-2 rounded-xl"
          />
          <label className="col-span-2 text-xs font-black uppercase tracking-widest text-slate-400">
            {L('Begründung', 'Reason')} *
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={L('z. B. Zug hatte 45 Minuten Verspätung', 'e.g. train was 45 minutes late')}
              className="mt-1 rounded-xl normal-case tracking-normal font-normal text-slate-900"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl bg-blue-50/60 border border-blue-100 px-4 py-3 text-sm font-bold text-slate-700">
          {L('Beantragt', 'Requested')}: {formatHours(shift.netHours, locale)} {L('Std.', 'h')}
          {shift.isOvernight ? ` · ${L('Ende am Folgetag', 'ends next day')}` : ''}
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">
            {L('Abbrechen', 'Cancel')}
          </Button>
          <Button
            onClick={submit}
            disabled={!!error || sending}
            className="h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] text-white font-black uppercase text-[11px] tracking-widest"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {L('Antrag senden', 'Send request')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
