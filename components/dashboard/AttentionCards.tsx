'use client'

/**
 * Compact "Handlungsbedarf" for dispatch/admin (Punkt 10, Empfehlung):
 * open approvals, unassigned / rejected upcoming shifts, deadlines that
 * expire soon, and the current week at a glance.
 */

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarRange, IdCard, ShieldCheck, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { addDays, localDateKey } from '@/lib/time/shift-hours'
import { weekDays, weekStartOf } from '@/lib/plans/week'
import { formatDateDE, weekdayName } from '@/lib/time/format'
import { fetchAllPages } from '@/lib/supabase/paginate'

interface Counts {
  approvals: number
  corrections: number
  unassigned: number
  rejected: number
  expiring: number
  expired: number
}

export function AttentionCards() {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [c, setC] = useState<Counts | null>(null)
  const [week, setWeek] = useState<{ day: string; total: number; unassigned: number }[]>([])

  useEffect(() => {
    if (!profile?.organization_id) return
    const supabase = createClient()
    const org = profile.organization_id
    const now = new Date().toISOString()
    const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString()
    const today = localDateKey()
    const in30 = addDays(today, 30)
    const ws = weekStartOf(today)
    const we = addDays(ws, 7)

    Promise.all([
      supabase.from('time_entries').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('is_verified', false).eq('is_planned', false).not('submitted_at', 'is', null),
      supabase.from('time_entry_corrections').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'pending'),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('organization_id', org).is('employee_id', null).neq('status', 'cancelled').gte('start_time', now).lte('start_time', in14),
      supabase.from('plans').select('id', { count: 'exact', head: true }).eq('organization_id', org).eq('status', 'rejected').gte('start_time', now),
      supabase.from('qualifications').select('id', { count: 'exact', head: true }).eq('organization_id', org).is('archived_at', null).gte('expires_at', today).lte('expires_at', in30),
      supabase.from('qualifications').select('id', { count: 'exact', head: true }).eq('organization_id', org).is('archived_at', null).lt('expires_at', today),
      // A week of org-wide shifts can exceed PostgREST's 1000-row cap.
      fetchAllPages<{ start_time: string; employee_id: string | null; status: string }>((from, to) =>
        supabase
          .from('plans')
          .select('id, start_time, employee_id, status')
          .eq('organization_id', org)
          .neq('status', 'cancelled')
          .gte('start_time', new Date(`${ws}T00:00:00`).toISOString())
          .lt('start_time', new Date(`${we}T00:00:00`).toISOString())
          .order('start_time', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
    ]).then(([a, b, u, r, e1, e2, wk]) => {
      setC({
        approvals: a.count ?? 0,
        corrections: b.count ?? 0,
        unassigned: u.count ?? 0,
        rejected: r.count ?? 0,
        expiring: e1.count ?? 0,
        expired: e2.count ?? 0,
      })
      const rows = (wk.data ?? []) as Array<{ start_time: string; employee_id: string | null; status: string }>
      setWeek(
        weekDays(ws).map((d) => {
          const dayRows = rows.filter((p) => localDateKey(new Date(p.start_time)) === d)
          return { day: d, total: dayRows.length, unassigned: dayRows.filter((p) => !p.employee_id).length }
        }),
      )
    })
  }, [profile?.organization_id])

  if (!c) return <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-50 animate-pulse" />)}</div>

  const today = localDateKey()
  const cards = [
    {
      href: '/dashboard/times/approvals',
      icon: ShieldCheck,
      value: c.approvals + c.corrections,
      label: L('Offene Freigaben', 'Pending approvals'),
      sub: c.corrections ? L(`davon ${c.corrections} Korrekturanträge`, `${c.corrections} correction requests`) : L('abgesendete Zeiten', 'submitted times'),
      tone: c.approvals + c.corrections > 0 ? 'warn' : 'ok',
    },
    {
      href: '/dashboard/plans/week',
      icon: UserX,
      value: c.unassigned,
      label: L('Unbesetzte Schichten', 'Unassigned shifts'),
      sub: L('nächste 14 Tage', 'next 14 days'),
      tone: c.unassigned > 0 ? 'warn' : 'ok',
    },
    {
      href: '/dashboard/plans/week',
      icon: AlertTriangle,
      value: c.rejected,
      label: L('Abgelehnte Schichten', 'Rejected shifts'),
      sub: L('neu zuweisen', 'reassign'),
      tone: c.rejected > 0 ? 'alert' : 'ok',
    },
    {
      href: '/dashboard/personnel',
      icon: IdCard,
      value: c.expiring + c.expired,
      label: L('Fristen', 'Deadlines'),
      sub: c.expired ? L(`${c.expired} abgelaufen · ${c.expiring} in 30 Tagen`, `${c.expired} expired · ${c.expiring} within 30 days`) : L(`${c.expiring} laufen in 30 Tagen ab`, `${c.expiring} expire within 30 days`),
      tone: c.expired > 0 ? 'alert' : c.expiring > 0 ? 'warn' : 'ok',
    },
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={cn(
              'rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-all',
              card.tone === 'alert' ? 'border-red-200' : card.tone === 'warn' ? 'border-amber-200' : 'border-slate-100',
            )}
          >
            <div className="flex items-center justify-between">
              <card.icon className={cn('w-5 h-5', card.tone === 'alert' ? 'text-red-600' : card.tone === 'warn' ? 'text-amber-600' : 'text-emerald-600')} />
              <span className="text-2xl font-black text-slate-900 tabular-nums">{card.value}</span>
            </div>
            <p className="mt-2 text-xs font-black text-slate-800">{card.label}</p>
            <p className="text-[11px] font-semibold text-slate-400">{card.sub}</p>
          </Link>
        ))}
      </div>

      <Link href="/dashboard/plans/week" className="block rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:border-blue-200 transition-all">
        <p className="flex items-center gap-2 text-xs font-black text-slate-800">
          <CalendarRange className="w-4 h-4 text-blue-600" /> {L('Aktuelle Wochenplanung', 'This week')}
        </p>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {week.map((d) => (
            <div key={d.day} className={cn('rounded-xl px-2 py-2 text-center', d.day === today ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50')}>
              <p className="text-[10px] font-black uppercase text-slate-400">{weekdayName(d.day, locale, true)}</p>
              <p className="text-[10px] font-bold text-slate-500">{formatDateDE(d.day).slice(0, 6)}</p>
              <p className="text-lg font-black text-slate-900 tabular-nums">{d.total}</p>
              {d.unassigned > 0 && <p className="text-[9px] font-black text-amber-700">{d.unassigned} {L('offen', 'open')}</p>}
            </div>
          ))}
        </div>
      </Link>
    </div>
  )
}
