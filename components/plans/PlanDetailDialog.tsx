'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRightLeft, CheckCircle2, Clock, Edit2, Hotel, Loader2, MapPin, Moon, StickyNote, Timer, User, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'
import { formatDateDE, formatHours, formatShiftRange, weekdayName } from '@/lib/time/format'
import { hoursBetween, localDateKey } from '@/lib/time/shift-hours'
import { PLAN_STATUS } from './PlanCard'

interface Props {
  plan: Plan | null
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeName?: string | null
  /** Managers */
  onReassign?: () => void
  canEdit?: boolean
  /** Assigned employee */
  onRespond?: (status: 'confirmed' | 'rejected', reason?: string) => Promise<void>
  showTimeTracking?: boolean
}

export function PlanDetailDialog({ plan, open, onOpenChange, employeeName, onReassign, canEdit, onRespond, showTimeTracking }: Props) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  if (!plan) return null
  const day = localDateKey(new Date(plan.start_time))
  const status = PLAN_STATUS[plan.status] ?? PLAN_STATUS.assigned
  const from = plan.start_location ? `${plan.start_location.name}${plan.start_location.short_code ? ` (${plan.start_location.short_code})` : ''}` : null
  const to = plan.destination_location ? `${plan.destination_location.name}${plan.destination_location.short_code ? ` (${plan.destination_location.short_code})` : ''}` : null

  const respond = async (s: 'confirmed' | 'rejected') => {
    if (!onRespond) return
    setBusy(true)
    await onRespond(s, s === 'rejected' ? reason.trim() : undefined)
    setBusy(false)
    setRejecting(false)
    onOpenChange(false)
  }

  const row = (icon: React.ReactNode, label: string, value: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <div className="text-sm font-bold text-slate-900 break-words">{value}</div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setRejecting(false); setReason('') } }}>
      <DialogContent className="max-w-md rounded-[2rem] p-6 md:p-8 max-h-[92vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-2xl font-black tracking-tight">{plan.shift_name || plan.route || L('Schicht', 'Shift')}</DialogTitle>
          <DialogDescription>
            {weekdayName(day, locale)}, {formatDateDE(day)}
          </DialogDescription>
        </DialogHeader>
        <span className={cn('inline-block w-fit rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', status.cls)}>
          {locale === 'de' ? status.de : status.en}
        </span>

        <div className="mt-2 divide-y divide-slate-100">
          {row(<Clock className="w-4 h-4 text-blue-600" />, L('Zeit', 'Time'), `${formatShiftRange(plan.start_time, plan.end_time, locale)} · ${formatHours(hoursBetween(plan.start_time, plan.end_time, 0), locale)} ${L('Std.', 'h')}`)}
          {employeeName !== undefined && row(<User className="w-4 h-4 text-blue-600" />, L('Mitarbeiter', 'Employee'), employeeName ?? L('Unbesetzt', 'Unassigned'))}
          {plan.customer?.name && row(<User className="w-4 h-4 text-blue-600" />, L('Kunde', 'Customer'), plan.customer.name)}
          {(from || to) && row(<MapPin className="w-4 h-4 text-blue-600" />, L('Start → Ziel', 'Start → destination'), `${from ?? '—'} → ${to ?? '—'}`)}
          {plan.route && plan.shift_name && row(<MapPin className="w-4 h-4 text-blue-600" />, L('Strecke', 'Route'), plan.route)}
          {plan.location && row(<MapPin className="w-4 h-4 text-blue-600" />, L('Einsatzort', 'Location'), plan.location)}
          {plan.overnight_stay && row(<Moon className="w-4 h-4 text-blue-600" />, L('Übernachtung', 'Overnight'), plan.hotel_address || L('Ja', 'Yes'))}
          {plan.is_gastfahrt && row(<Hotel className="w-4 h-4 text-violet-600" />, L('Fahrtart', 'Trip'), 'Gastfahrt')}
          {plan.notes && row(<StickyNote className="w-4 h-4 text-amber-600" />, L('Hinweise', 'Notes'), <span className="font-semibold whitespace-pre-wrap">{plan.notes}</span>)}
          {plan.status === 'rejected' && plan.rejection_reason && row(<XCircle className="w-4 h-4 text-red-600" />, L('Ablehnungsgrund', 'Rejection reason'), plan.rejection_reason)}
        </div>

        {rejecting && (
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={L('Grund für die Ablehnung', 'Reason for rejecting')}
            className="mt-3 rounded-xl"
          />
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {onRespond && plan.status === 'assigned' && !rejecting && (
            <>
              <Button disabled={busy} onClick={() => respond('confirmed')} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest">
                {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} {L('Bestätigen', 'Confirm')}
              </Button>
              <Button variant="outline" onClick={() => setRejecting(true)} className="rounded-xl font-black uppercase text-[10px] tracking-widest text-red-600">
                <XCircle className="w-4 h-4 mr-2" /> {L('Ablehnen', 'Reject')}
              </Button>
            </>
          )}
          {rejecting && (
            <Button disabled={busy || reason.trim().length < 3} onClick={() => respond('rejected')} className="rounded-xl bg-red-600 hover:bg-red-700 font-black uppercase text-[10px] tracking-widest">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {L('Ablehnung senden', 'Send rejection')}
            </Button>
          )}
          {showTimeTracking && (
            <Button asChild variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
              <Link href="/dashboard">
                <Timer className="w-4 h-4 mr-2" /> {L('Zur Zeiterfassung', 'Time tracking')}
              </Link>
            </Button>
          )}
          {onReassign && (
            <Button variant="outline" onClick={onReassign} className="rounded-xl font-black uppercase text-[10px] tracking-widest">
              <ArrowRightLeft className="w-4 h-4 mr-2" /> {L('Mitarbeiter ändern', 'Change employee')}
            </Button>
          )}
          {canEdit && (
            <Button asChild variant="outline" className="rounded-xl font-black uppercase text-[10px] tracking-widest">
              <Link href={`/dashboard/plans/${plan.id}/edit`}>
                <Edit2 className="w-4 h-4 mr-2" /> {L('Bearbeiten', 'Edit')}
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
