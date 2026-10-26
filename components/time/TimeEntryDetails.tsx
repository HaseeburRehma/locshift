'use client'

import React, { useState } from 'react'
import {
  AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Clock, Edit2, FileText, History, Loader2, MapPin,
  Moon, RotateCcw, Send, ShieldCheck, Trash2, User, UserCheck, Wallet, XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { TimeEntry, TimeEntryAuditRow, TimeEntryCorrection } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { useUser } from '@/lib/user-context'
import { useCorrections, useEntryHistory } from '@/hooks/times/useCorrections'
import { entryNetHours, hoursBetween, shiftIssueLabel, shiftIssues } from '@/lib/time/shift-hours'
import {
  formatDateDE, formatEuro, formatHours, formatHoursLong, formatShiftRange, formatTimeOfDay, weekdayName,
} from '@/lib/time/format'
import { ENTRY_STATUS_STYLE, entryStatus, entryStatusLabel } from '@/lib/times/entry-status'
import { berlinDateKey } from '@/lib/time/berlin'

interface TimeEntryDetailsProps {
  entry: TimeEntry
  onBack: () => void
  onEdit?: () => void
  onSubmitDraft?: () => void
  onRequestCorrection?: () => void
  onApprove?: () => void
  onUnapprove?: () => void
  onDelete?: () => void
}

function dateTime(iso: string | null | undefined, locale: 'de' | 'en') {
  if (!iso) return '—'
  // German calendar day, matching the German time printed next to it.
  const key = berlinDateKey(iso)
  return `${weekdayName(key, locale, true)}, ${formatDateDE(key)} · ${formatTimeOfDay(iso)}`
}

export function TimeEntryDetails({
  entry, onBack, onEdit, onSubmitDraft, onRequestCorrection, onApprove, onUnapprove, onDelete,
}: TimeEntryDetailsProps) {
  const { locale } = useTranslation()
  const L = (deStr: string, en: string) => (locale === 'de' ? deStr : en)
  const { isAdmin, isDispatcher } = useUser()
  const isManager = isAdmin || isDispatcher

  const status = entryStatus(entry)
  const net = entryNetHours(entry)
  const issues = shiftIssues(entry)
  const onBehalf = !!entry.entered_by && entry.entered_by !== entry.employee_id
  const clockStart = entry.clock_start_time
  const clockEnd = entry.clock_end_time
  const clockDiffers =
    !!clockStart && (clockStart !== entry.start_time || (!!clockEnd && clockEnd !== entry.end_time))
  const plan = entry.plan?.start_time && entry.plan?.end_time ? entry.plan : null

  const { corrections, reviewCorrection, cancelCorrection } = useCorrections({ entryId: entry.id })
  const pending = corrections.find((c) => c.status === 'pending') ?? null
  const decided = corrections.filter((c) => c.status !== 'pending')
  const { rows: history, loading: historyLoading } = useEntryHistory(entry.id)

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-slate-50">
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </Button>
        <h1 className="text-lg font-black tracking-tight text-gray-900 uppercase italic">
          {L('Zeiteintrag', 'Time entry')}
        </h1>
        {onEdit ? (
          <Button variant="ghost" size="icon" onClick={onEdit} className="rounded-full bg-blue-50 hover:bg-blue-100" aria-label={L('Bearbeiten', 'Edit')}>
            <Edit2 className="w-4 h-4 text-blue-600" />
          </Button>
        ) : (
          <span className="w-10" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Hero */}
        <div className="p-8 md:p-12 flex flex-col items-center text-center gap-3 bg-gradient-to-b from-white to-slate-50/30 border-b border-slate-50">
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{L('Arbeitszeit', 'Working time')}</p>
          <h2 className="text-6xl md:text-7xl font-black text-blue-600 tracking-tighter tabular-nums leading-none">
            {formatHours(net, locale)}
            <span className="text-xl md:text-2xl ml-2 opacity-50">{L('Std.', 'h')}</span>
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            = {formatHoursLong(net, locale)}
            {(entry.break_minutes ?? 0) > 0 ? ` · ${L('nach', 'after')} ${entry.break_minutes} Min. ${L('Pause', 'break')}` : ` · ${L('ohne Pause', 'no break')}`}
          </p>
          <p className="text-sm font-bold text-slate-700">
            {weekdayName(entry.date, locale)}, {formatDateDE(entry.date)} · {formatShiftRange(entry.start_time, entry.end_time, locale)}
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Badge className={cn('px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border', ENTRY_STATUS_STYLE[status])}>
              {entryStatusLabel(status, locale)}
            </Badge>
            {entry.corrected_at && (
              <Badge className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border bg-indigo-50 text-indigo-700 border-indigo-200">
                {L('Korrigiert', 'Corrected')}
              </Badge>
            )}
            {onBehalf && (
              <Badge className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border bg-slate-50 text-slate-600 border-slate-200">
                {L('Stellvertretend erfasst', 'Entered on behalf')}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-4 md:px-12 py-8 space-y-8">
          {issues.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-1">
              {issues.map((i) => (
                <p key={i} className="flex items-center gap-2 text-sm font-bold text-red-700">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {shiftIssueLabel(i, locale)}
                </p>
              ))}
              <p className="text-xs text-red-600/80">
                {L('Dieser Eintrag kann erst nach Korrektur freigegeben werden.', 'This entry can only be approved after it is corrected.')}
              </p>
            </div>
          )}

          {pending && (
            <PendingCorrection
              correction={pending}
              isManager={isManager}
              onApprove={(note) => reviewCorrection(pending, true, note)}
              onReject={(note) => reviewCorrection(pending, false, note)}
              onCancel={() => cancelCorrection(pending.id)}
            />
          )}

          {/* Actions */}
          {(onSubmitDraft || onRequestCorrection || onApprove || onUnapprove || onDelete) && (
            <div className="flex flex-wrap gap-3">
              {onSubmitDraft && (
                <Button onClick={onSubmitDraft} className="h-11 rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-black uppercase text-[11px] tracking-widest">
                  <Send className="w-4 h-4 mr-2" /> {L('Prüfen & absenden', 'Review & submit')}
                </Button>
              )}
              {onRequestCorrection && !pending && (
                <Button onClick={onRequestCorrection} variant="outline" className="h-11 rounded-xl font-black uppercase text-[11px] tracking-widest">
                  <Edit2 className="w-4 h-4 mr-2" /> {L('Korrektur beantragen', 'Request correction')}
                </Button>
              )}
              {onApprove && (
                <Button
                  onClick={onApprove}
                  disabled={issues.length > 0}
                  title={issues.length ? L('Erst Fehler korrigieren', 'Fix issues first') : undefined}
                  className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[11px] tracking-widest"
                >
                  <ShieldCheck className="w-4 h-4 mr-2" /> {L('Freigeben', 'Approve')}
                </Button>
              )}
              {onUnapprove && (
                <Button onClick={onUnapprove} variant="outline" className="h-11 rounded-xl font-black uppercase text-[11px] tracking-widest">
                  <RotateCcw className="w-4 h-4 mr-2" /> {L('Freigabe zurücknehmen', 'Revoke approval')}
                </Button>
              )}
              {onDelete && (
                <Button onClick={onDelete} variant="ghost" className="h-11 rounded-xl font-black uppercase text-[11px] tracking-widest text-red-600 hover:bg-red-50 md:ml-auto">
                  <Trash2 className="w-4 h-4 mr-2" /> {L('Löschen', 'Delete')}
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailItem icon={<User className="w-5 h-5 text-blue-600" />} label={L('Mitarbeiter', 'Employee')} value={entry.employee?.full_name ?? '—'} />
            <DetailItem icon={<Clock className="w-5 h-5 text-blue-600" />} label={L('Beginn', 'Start')} value={dateTime(entry.start_time, locale)} />
            <DetailItem icon={<Clock className="w-5 h-5 text-blue-600" />} label={L('Ende', 'End')} value={entry.end_time ? dateTime(entry.end_time, locale) : L('Läuft noch', 'Running')} />
            <DetailItem icon={<Clock className="w-5 h-5 text-blue-600" />} label={L('Pause', 'Break')} value={`${entry.break_minutes ?? 0} Min.`} />
            {plan && (
              <DetailItem
                icon={<Calendar className="w-5 h-5 text-blue-600" />}
                label={L('Geplant', 'Planned')}
                value={`${formatShiftRange(plan.start_time, plan.end_time, locale)} · ${formatHours(hoursBetween(plan.start_time, plan.end_time, 0), locale)} ${L('Std.', 'h')}${plan.shift_name ? ` · ${plan.shift_name}` : ''}`}
              />
            )}
            {clockStart && (
              <DetailItem
                icon={<History className="w-5 h-5 text-blue-600" />}
                label={L('Ursprünglich erfasst', 'Originally recorded')}
                value={
                  <span className={cn(clockDiffers && 'text-amber-700')}>
                    {formatShiftRange(clockStart, clockEnd, locale)}
                  </span>
                }
              />
            )}
            <DetailItem
              icon={<User className="w-5 h-5 text-blue-600" />}
              label={L('Kunde', 'Customer')}
              value={entry.customer?.name || entry.plan?.customer?.name || '—'}
            />
            {(entry.start_location?.name || entry.destination_location?.name) && (
              <DetailItem
                icon={<MapPin className="w-5 h-5 text-blue-600" />}
                label={L('Betriebsstellen', 'Locations')}
                value={`${entry.start_location?.short_code || entry.start_location?.name || '—'} → ${entry.destination_location?.short_code || entry.destination_location?.name || '—'}`}
              />
            )}
            {entry.location && (
              <DetailItem icon={<MapPin className="w-5 h-5 text-blue-600" />} label={L('Einsatzort', 'Location')} value={entry.location} />
            )}
            <DetailItem
              icon={<Wallet className="w-5 h-5 text-blue-600" />}
              label={L('Spesen', 'Per diem')}
              value={formatEuro(entry.meal_allowance, locale)}
            />
            {entry.overnight_stay && (
              <DetailItem icon={<Moon className="w-5 h-5 text-emerald-600" />} label={L('Übernachtung', 'Overnight stay')} value={entry.hotel_address || L('Ja', 'Yes')} />
            )}
            {entry.is_gastfahrt && (
              <DetailItem icon={<UserCheck className="w-5 h-5 text-violet-600" />} label={L('Fahrtart', 'Trip type')} value={L('Gastfahrt (separat ausgewiesen)', 'Gastfahrt (shown separately)')} />
            )}
            <DetailItem
              icon={<UserCheck className="w-5 h-5 text-blue-600" />}
              label={L('Erfasst von', 'Entered by')}
              value={`${entry.enterer?.full_name ?? entry.employee?.full_name ?? '—'}${onBehalf ? ` (${L('stellvertretend', 'on behalf')})` : ''}`}
            />
            {entry.submitted_at && (
              <DetailItem icon={<Send className="w-5 h-5 text-blue-600" />} label={L('Abgesendet am', 'Submitted')} value={dateTime(entry.submitted_at, locale)} />
            )}
            {entry.is_verified && (
              <DetailItem
                icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                label={L('Freigegeben', 'Approved')}
                value={`${entry.verifier?.full_name ?? '—'}${entry.verified_at ? ` · ${dateTime(entry.verified_at, locale)}` : ''}`}
              />
            )}
          </div>

          {entry.notes && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <FileText className="w-4 h-4" /> {L('Notiz', 'Note')}
              </h3>
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 text-gray-700 font-semibold whitespace-pre-wrap">{entry.notes}</div>
            </div>
          )}

          {decided.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{L('Korrekturanträge', 'Correction requests')}</h3>
              {decided.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-100 p-4 text-sm">
                  <p className="font-bold text-slate-800">
                    {c.status === 'approved' ? L('Genehmigt', 'Approved') : c.status === 'rejected' ? L('Abgelehnt', 'Rejected') : L('Zurückgezogen', 'Withdrawn')}
                    {' · '}
                    {formatShiftRange(c.proposed.start_time, c.proposed.end_time, locale)}
                  </p>
                  <p className="text-slate-500">{L('Begründung', 'Reason')}: {c.reason}</p>
                  {c.review_note && <p className="text-slate-500">{L('Hinweis', 'Note')}: {c.review_note}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {c.reviewer?.full_name ? `${c.reviewer.full_name} · ` : ''}
                    {c.reviewed_at ? dateTime(c.reviewed_at, locale) : dateTime(c.requested_at, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <History className="w-4 h-4" /> {L('Verlauf', 'History')}
            </h3>
            {historyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
            ) : history.length === 0 ? (
              <p className="text-sm text-slate-400">{L('Noch keine protokollierten Änderungen.', 'No logged changes yet.')}</p>
            ) : (
              <ol className="relative border-l border-slate-200 ml-2 space-y-4">
                {history.map((h) => (
                  <HistoryItem key={h.id} row={h} locale={locale} />
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PendingCorrection({
  correction, isManager, onApprove, onReject, onCancel,
}: {
  correction: TimeEntryCorrection
  isManager: boolean
  onApprove: (note: string) => Promise<boolean>
  onReject: (note: string) => Promise<boolean>
  onCancel: () => Promise<boolean>
}) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<null | 'approve' | 'reject' | 'cancel'>(null)
  const p = correction.proposed
  const o = correction.original
  const run = async (kind: 'approve' | 'reject' | 'cancel') => {
    setBusy(kind)
    if (kind === 'approve') await onApprove(note)
    else if (kind === 'reject') await onReject(note)
    else await onCancel()
    setBusy(null)
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">{L('Offener Korrekturantrag', 'Open correction request')}</p>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs font-bold text-slate-500">{L('Bisher (gültig)', 'Current (valid)')}</p>
          <p className="font-bold text-slate-800">
            {formatShiftRange(o.start_time, o.end_time, locale)} · {o.break_minutes ?? 0} Min. · {formatHours(hoursBetween(o.start_time, o.end_time, o.break_minutes), locale)} {L('Std.', 'h')}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">{L('Beantragt', 'Requested')}</p>
          <p className="font-bold text-amber-800">
            {formatShiftRange(p.start_time, p.end_time, locale)} · {p.break_minutes ?? 0} Min. · {formatHours(hoursBetween(p.start_time, p.end_time, p.break_minutes), locale)} {L('Std.', 'h')}
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-700"><span className="font-bold">{L('Begründung', 'Reason')}:</span> {correction.reason}</p>
      {isManager ? (
        <div className="space-y-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('Hinweis an Mitarbeiter (optional)', 'Note to employee (optional)')} className="rounded-xl bg-white" />
          <div className="flex gap-2">
            <Button disabled={!!busy} onClick={() => run('approve')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[11px] tracking-widest">
              {busy === 'approve' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {L('Genehmigen', 'Approve')}
            </Button>
            <Button disabled={!!busy} variant="outline" onClick={() => run('reject')} className="rounded-xl font-black uppercase text-[11px] tracking-widest text-red-600">
              {busy === 'reject' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              {L('Ablehnen', 'Reject')}
            </Button>
          </div>
        </div>
      ) : (
        <Button disabled={!!busy} variant="outline" onClick={() => run('cancel')} className="rounded-xl font-bold">
          {L('Antrag zurückziehen', 'Withdraw request')}
        </Button>
      )}
    </div>
  )
}

const FIELD_LABELS: Record<string, [string, string]> = {
  date: ['Datum', 'Date'],
  start_time: ['Beginn', 'Start'],
  end_time: ['Ende', 'End'],
  break_minutes: ['Pause', 'Break'],
  net_hours: ['Stunden', 'Hours'],
  employee_id: ['Mitarbeiter', 'Employee'],
  customer_id: ['Kunde', 'Customer'],
  notes: ['Notiz', 'Note'],
  location: ['Einsatzort', 'Location'],
  overnight_stay: ['Übernachtung', 'Overnight'],
  hotel_address: ['Hotel', 'Hotel'],
  meal_allowance: ['Spesen', 'Per diem'],
  is_gastfahrt: ['Gastfahrt', 'Gastfahrt'],
  is_planned: ['Geplant', 'Planned'],
  plan_id: ['Plan', 'Plan'],
  start_location_id: ['Start-Betriebsstelle', 'Start location'],
  destination_location_id: ['Ziel-Betriebsstelle', 'Destination'],
  submitted_at: ['Abgesendet', 'Submitted'],
  is_verified: ['Freigegeben', 'Approved'],
}

const ACTION_LABELS: Record<TimeEntryAuditRow['action'], [string, string]> = {
  created: ['Eintrag angelegt', 'Entry created'],
  clocked_in: ['Schicht gestartet', 'Shift started'],
  clocked_out: ['Schicht beendet', 'Shift ended'],
  submitted: ['Abgesendet', 'Submitted'],
  approved: ['Freigegeben', 'Approved'],
  unapproved: ['Freigabe zurückgenommen', 'Approval revoked'],
  updated: ['Geändert', 'Changed'],
  correction_applied: ['Korrektur übernommen', 'Correction applied'],
  deleted: ['Gelöscht', 'Deleted'],
}

function fmtValue(key: string, v: unknown, locale: 'de' | 'en'): string {
  if (v == null || v === '') return '—'
  if (key === 'start_time' || key === 'end_time' || key === 'submitted_at') return dateTime(String(v), locale)
  if (key === 'date') return formatDateDE(String(v))
  if (key === 'break_minutes') return `${v} Min.`
  if (key === 'net_hours') return `${formatHours(Number(v), locale)} ${locale === 'de' ? 'Std.' : 'h'}`
  if (key === 'meal_allowance') return formatEuro(Number(v), locale)
  if (typeof v === 'boolean') return v ? (locale === 'de' ? 'Ja' : 'Yes') : (locale === 'de' ? 'Nein' : 'No')
  if (key.endsWith('_id')) return locale === 'de' ? 'geändert' : 'changed'
  return String(v)
}

function HistoryItem({ row, locale }: { row: TimeEntryAuditRow; locale: 'de' | 'en' }) {
  const [label] = ACTION_LABELS[row.action] ?? ['Änderung', 'Change']
  const keys = row.action === 'created' || row.action === 'clocked_in' || row.action === 'deleted'
    ? []
    : Object.keys(row.new_values ?? {}).filter((k) => k !== 'is_verified' && k !== 'submitted_at')
  return (
    <li className="relative ml-4">
      <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
      <p className="text-sm font-bold text-slate-800">
        {locale === 'de' ? label : ACTION_LABELS[row.action]?.[1] ?? 'Change'}
        <span className="font-medium text-slate-400"> · {row.changer?.full_name ?? 'System'} · {dateTime(row.changed_at, locale)}</span>
      </p>
      {keys.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
          {keys.map((k) => (
            <li key={k}>
              <span className="font-bold">{(FIELD_LABELS[k] ?? [k, k])[locale === 'de' ? 0 : 1]}:</span>{' '}
              {fmtValue(k, row.old_values?.[k], locale)} → {fmtValue(k, row.new_values?.[k], locale)}
            </li>
          ))}
        </ul>
      )}
      {row.reason && <p className="mt-1 text-xs italic text-slate-500">{row.reason}</p>}
    </li>
  )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-3xl bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">{icon}</div>
        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-sm font-black text-gray-900 text-right">{value}</div>
    </div>
  )
}
