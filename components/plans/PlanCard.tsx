'use client'

import React from 'react'
import { Lock, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Plan } from '@/lib/types'
import { formatTimeOfDay } from '@/lib/time/format'
import { endDayOffset } from '@/lib/time/shift-hours'
import { hasStarted } from '@/lib/plans/week'

export const PLAN_STATUS: Record<string, { de: string; en: string; cls: string }> = {
  draft: { de: 'Entwurf', en: 'Draft', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  assigned: { de: 'Offen', en: 'Open', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  confirmed: { de: 'Bestätigt', en: 'Confirmed', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { de: 'Abgelehnt', en: 'Rejected', cls: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { de: 'Storniert', en: 'Cancelled', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export function planStatusLabel(status: string, locale: 'de' | 'en') {
  const s = PLAN_STATUS[status] ?? PLAN_STATUS.assigned
  return locale === 'de' ? s.de : s.en
}

interface Props {
  plan: Plan
  locale: 'de' | 'en'
  draggable?: boolean
  compact?: boolean
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
}

export function PlanCard({ plan, locale, draggable, compact, onClick, onDragStart }: Props) {
  const offset = endDayOffset(plan.start_time, plan.end_time)
  const started = hasStarted(plan)
  const status = PLAN_STATUS[plan.status] ?? PLAN_STATUS.assigned
  const from = plan.start_location?.short_code || plan.start_location?.name
  const to = plan.destination_location?.short_code || plan.destination_location?.name

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border bg-white px-2.5 py-2 shadow-sm transition-all hover:shadow-md hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        plan.status === 'rejected' ? 'border-red-200' : plan.status === 'confirmed' ? 'border-emerald-200' : 'border-amber-200',
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[12px] font-black text-slate-900 tabular-nums whitespace-nowrap">
          {formatTimeOfDay(plan.start_time)}–{formatTimeOfDay(plan.end_time)}
          {offset > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-indigo-50 px-1 text-[9px] font-black text-indigo-700" title={locale === 'de' ? 'Ende am Folgetag' : 'Ends next day'}>
              <Moon className="w-2.5 h-2.5" />+{offset}
            </span>
          )}
        </span>
        {started && <Lock className="w-3 h-3 text-slate-400 shrink-0" aria-label={locale === 'de' ? 'Bereits begonnen' : 'Already started'} />}
      </div>
      {(plan.shift_name || plan.route) && (
        <p className="mt-0.5 text-[11px] font-bold text-[#0064E0] truncate">{plan.shift_name || plan.route}</p>
      )}
      {!compact && (
        <>
          {plan.customer?.name && <p className="text-[10px] font-semibold text-slate-500 truncate">{plan.customer.name}</p>}
          {(from || to) && (
            <p className="text-[10px] font-semibold text-slate-500 truncate">
              {from ?? '?'} → {to ?? '?'}
            </p>
          )}
          {!from && !to && plan.location && (
            <p className="text-[10px] font-semibold text-slate-500 truncate">{plan.location}</p>
          )}
        </>
      )}
      <span className={cn('mt-1 inline-block rounded-md border px-1.5 py-px text-[9px] font-black uppercase tracking-wider', status.cls)}>
        {locale === 'de' ? status.de : status.en}
      </span>
      {plan.is_gastfahrt && (
        <span className="mt-1 ml-1 inline-block rounded-md border border-violet-200 bg-violet-50 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-violet-700">
          Gastfahrt
        </span>
      )}
    </button>
  )
}
