'use client'

/**
 * Explains the two Spesen sources (Kundenfeedback Punkt 13) and shows the
 * automatic Verpflegungsmehraufwand of the current month next to the
 * manual claims, so both are understood as one flow.
 */

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { formatEuro } from '@/lib/time/format'
import { localDateKey } from '@/lib/time/shift-hours'
import { fetchAllPages } from '@/lib/supabase/paginate'

export function SpesenExplainer({ manager }: { manager: boolean }) {
  const { user, profile, spesenRates } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [auto, setAuto] = useState<{ amount: number; days: number } | null>(null)

  useEffect(() => {
    if (!profile?.organization_id || !user) return
    const now = new Date()
    const start = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1))
    const end = localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    const supabase = createClient()
    const orgId = profile.organization_id
    // A month of org-wide entries can exceed PostgREST's 1000-row cap.
    fetchAllPages<{ employee_id: string; date: string; meal_allowance: number }>((from, to) => {
      let q = supabase
        .from('time_entries')
        .select('id, employee_id, date, meal_allowance')
        .eq('organization_id', orgId)
        .eq('is_planned', false)
        .gt('meal_allowance', 0)
        .gte('date', start)
        .lte('date', end)
      if (!manager) q = q.eq('employee_id', user.id)
      return q.order('date', { ascending: true }).order('id', { ascending: true }).range(from, to)
    }).then(({ data }) => {
      // Once per employee and calendar day — same rule as the Monatsnachweis.
      const perDay = new Map<string, number>()
      for (const r of data ?? []) {
        const k = `${r.employee_id}:${r.date}`
        perDay.set(k, Math.max(perDay.get(k) ?? 0, Number(r.meal_allowance) || 0))
      }
      setAuto({ amount: [...perDay.values()].reduce((s, v) => s + v, 0), days: perDay.size })
    })
  }, [profile?.organization_id, user, manager])

  return (
    <div className="grid md:grid-cols-[1fr_auto] gap-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="space-y-2 text-sm text-slate-700">
        <p className="flex items-center gap-2 font-black text-[#0064E0]">
          <Info className="w-4 h-4" /> {L('So funktionieren Spesen (Verpflegungsmehraufwand)', 'How per diem works')}
        </p>
        <p>
          <span className="font-bold">{L('1. Automatisch aus den Schichten:', '1. Automatically from shifts:')}</span>{' '}
          {L(
            `Für jeden Arbeitstag mit mehr als 8 Std. Arbeitszeit (ohne Pause) gibt es ${formatEuro(spesenRates.partial, 'de')}, mit Übernachtung ${formatEuro(spesenRates.full, 'de')} – je Kalendertag einmal. Diese Beträge entstehen beim Absenden der Schicht und stehen im Monatsnachweis.`,
            `Each working day with more than 8 h working time (excluding breaks) earns ${formatEuro(spesenRates.partial, 'en')}, with overnight stay ${formatEuro(spesenRates.full, 'en')} – once per calendar day. They are created when the shift is submitted and appear in the monthly statement.`,
          )}
        </p>
        <p>
          <span className="font-bold">{L('2. Zusätzliche Spesenanträge (hier):', '2. Additional claims (here):')}</span>{' '}
          {L(
            'Nur für Fälle, die nicht aus einer Schicht entstehen – z. B. mehrtägige Einsätze, Auslandssätze oder Sonderfälle. Disposition oder Admin genehmigt; genehmigte Anträge erscheinen ebenfalls im Monatsnachweis. Fallen Antrag und Schicht-Spesen auf denselben Tag, wird das dort markiert.',
            'Only for cases not covered by a shift – e.g. multi-day trips, foreign rates or special cases. Dispatch or admin approves; approved claims also appear in the monthly statement. If a claim and shift per diem fall on the same day, it is flagged there.',
          )}
        </p>
      </div>
      <Link
        href="/dashboard/times/monthly"
        className="flex flex-col justify-center rounded-xl bg-white border border-blue-100 px-5 py-4 min-w-[220px] hover:border-blue-300 transition-colors"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {manager ? L('Automatisch (alle, dieser Monat)', 'Automatic (all, this month)') : L('Automatisch (dieser Monat)', 'Automatic (this month)')}
        </span>
        <span className="text-2xl font-black text-[#0064E0] tabular-nums">{auto ? formatEuro(auto.amount, locale) : '…'}</span>
        <span className="text-xs font-semibold text-slate-500">
          {auto ? L(`${auto.days} Tag(e) mit Spesen`, `${auto.days} day(s) with per diem`) : ''}
        </span>
        <span className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-600">
          {L('Zum Monatsnachweis', 'Monthly statement')} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    </div>
  )
}
