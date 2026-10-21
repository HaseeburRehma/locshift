'use client'

/**
 * Freigaben — dispatch/admin queue (Kundenfeedback Punkte 3 + 14).
 *
 *   1. Korrekturanträge   → approve / reject with note
 *   2. Zur Freigabe       → submitted entries, bulk approval
 *   3. Nicht abgesendet   → ended but unsubmitted / still running shifts,
 *                           with a reminder to the employee
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, BellRing, CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { useCorrections } from '@/hooks/times/useCorrections'
import type { TimeEntry, TimeEntryCorrection } from '@/lib/types'
import { TIME_ENTRY_SELECT, dbErrorMessage, entryStatus } from '@/lib/times/entry-status'
import { entryNetHours, hoursBetween, shiftIssueLabel, shiftIssues } from '@/lib/time/shift-hours'
import { formatDateDE, formatHours, formatShiftRange, formatTimeOfDay, weekdayName } from '@/lib/time/format'
import { sendNotification, sendNotificationToMany } from '@/lib/notifications/service'
import { fetchAllPages } from '@/lib/supabase/paginate'

export default function ApprovalsPage() {
  const router = useRouter()
  const { user, profile, isAdmin, isDispatcher, isLoading } = useUser()
  const isManager = isAdmin || isDispatcher
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const supabase = createClient()

  const { corrections, reviewCorrection, loading: corrLoading } = useCorrections({ pendingOnly: true })
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const fetchEntries = useCallback(async () => {
    if (!profile?.organization_id) return
    const orgId = profile.organization_id
    // Two queries so new submissions are never hidden behind old drafts:
    //   - every submitted, ended entry awaiting approval (paged), and
    //   - the most recent unsent drafts / running shifts.
    const [submittedRes, unsentRes] = await Promise.all([
      fetchAllPages<TimeEntry>((from, to) =>
        supabase
          .from('time_entries')
          .select(TIME_ENTRY_SELECT)
          .eq('organization_id', orgId)
          .eq('is_verified', false)
          .eq('is_planned', false)
          .not('submitted_at', 'is', null)
          .not('end_time', 'is', null)
          .order('date', { ascending: true })
          .order('id', { ascending: true })
          .range(from, to),
      ),
      supabase
        .from('time_entries')
        .select(TIME_ENTRY_SELECT)
        .eq('organization_id', orgId)
        .eq('is_verified', false)
        .eq('is_planned', false)
        .or('submitted_at.is.null,end_time.is.null')
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .limit(500),
    ])
    if (submittedRes.error || unsentRes.error) toast.error(L('Einträge konnten nicht geladen werden', 'Failed to load entries'))
    const unsentRows = ((unsentRes.data ?? []) as TimeEntry[]).slice().reverse()
    const merged = [...submittedRes.data, ...unsentRows].sort(
      (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    setEntries(merged)
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id, supabase])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (!isLoading && !isManager) router.replace('/dashboard/times')
  }, [isLoading, isManager, router])

  const submitted = useMemo(() => entries.filter((e) => entryStatus(e) === 'submitted'), [entries])
  const unsent = useMemo(
    () => entries.filter((e) => entryStatus(e) === 'draft' || (entryStatus(e) === 'running' && hoursBetween(e.start_time, new Date().toISOString(), 0) > 12)),
    [entries],
  )
  const approvable = submitted.filter((e) => shiftIssues(e).length === 0)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const approve = async (ids: string[]) => {
    if (ids.length === 0) return
    setBusy(true)
    // Only flip rows that are still unverified, so a second manager
    // approving the same entries never overwrites verified_by.
    const { data: flippedRows, error } = await supabase
      .from('time_entries')
      .update({ is_verified: true, verified_by: user?.id ?? null })
      .in('id', ids)
      .eq('is_verified', false)
      .select('id')
    setBusy(false)
    if (error) {
      toast.error(dbErrorMessage(error, locale, L('Freigabe fehlgeschlagen', 'Approval failed')))
      return
    }
    const flipped = new Set(((flippedRows ?? []) as { id: string }[]).map((r) => r.id))
    const approvedCount = flipped.size
    if (approvedCount > 0) {
      toast.success(L(`${approvedCount} Eintrag/Einträge freigegeben`, `${approvedCount} entr${approvedCount === 1 ? 'y' : 'ies'} approved`))
    }
    if (approvedCount < ids.length) {
      const skipped = ids.length - approvedCount
      toast.info(L(`${skipped} Eintrag/Einträge waren bereits freigegeben`, `${skipped} entr${skipped === 1 ? 'y was' : 'ies were'} already approved`))
    }
    const byEmployee = new Map<string, number>()
    for (const e of entries.filter((x) => flipped.has(x.id))) byEmployee.set(e.employee_id, (byEmployee.get(e.employee_id) ?? 0) + 1)
    for (const [emp, n] of byEmployee) {
      if (emp === user?.id) continue
      void sendNotification({
        userId: emp,
        title: 'Zeiten freigegeben',
        message: n === 1 ? 'Ein Zeiteintrag wurde freigegeben.' : `${n} Zeiteinträge wurden freigegeben.`,
        module: 'time_entries',
        link: '/dashboard/times',
        skipEmail: true,
      })
    }
    setSelected(new Set())
    fetchEntries()
  }

  const remind = async (e: TimeEntry) => {
    const running = !e.end_time
    await sendNotificationToMany([e.employee_id], {
      title: running ? 'Schicht noch nicht beendet' : 'Schicht noch nicht abgesendet',
      message: running
        ? `Ihre Schicht vom ${formatDateDE(e.date)} läuft seit ${formatTimeOfDay(e.start_time)} Uhr. Bitte beenden, Zeiten prüfen und absenden.`
        : `Bitte prüfen und senden Sie Ihre Schicht vom ${formatDateDE(e.date)} (${formatShiftRange(e.start_time, e.end_time)}) ab.`,
      module: 'time_entries',
      moduleId: e.id,
      link: `/dashboard/times?entry=${e.id}`,
    })
    toast.success(L('Erinnerung gesendet', 'Reminder sent'))
  }

  if (isLoading || loading || corrLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/times')} className="rounded-full mt-1">
          <ArrowLeft className="w-5 h-5 text-blue-600" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Freigaben', 'Approvals')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {L('Korrekturanträge und abgesendete Zeiten prüfen', 'Review correction requests and submitted times')}
          </p>
        </div>
      </div>

      {/* 1. Corrections */}
      <section className="space-y-3">
        <SectionTitle title={L('Korrekturanträge', 'Correction requests')} count={corrections.length} />
        {corrections.length === 0 ? (
          <Empty text={L('Keine offenen Korrekturanträge.', 'No open correction requests.')} />
        ) : (
          corrections.map((c) => <CorrectionCard key={c.id} c={c} onDecide={reviewCorrection} onOpen={() => router.push(`/dashboard/times?entry=${c.entry_id}`)} />)
        )}
      </section>

      {/* 2. Submitted */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title={L('Zur Freigabe', 'Awaiting approval')} count={submitted.length} />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-bold"
              disabled={approvable.length === 0}
              onClick={() => setSelected(new Set(approvable.map((e) => e.id)))}
            >
              {L('Alle fehlerfreien auswählen', 'Select all without issues')}
            </Button>
            <Button
              size="sm"
              disabled={selected.size === 0 || busy}
              onClick={() => approve([...selected])}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest"
            >
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {L(`${selected.size} freigeben`, `Approve ${selected.size}`)}
            </Button>
          </div>
        </div>
        {submitted.length === 0 ? (
          <Empty text={L('Keine abgesendeten Zeiten offen.', 'No submitted times waiting.')} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {submitted.map((e) => {
              const issues = shiftIssues(e)
              return (
                <div key={e.id} className={cn('flex flex-wrap items-center gap-4 px-4 py-3', issues.length && 'bg-red-50/40')}>
                  <Checkbox
                    checked={selected.has(e.id)}
                    disabled={issues.length > 0}
                    onCheckedChange={() => toggle(e.id)}
                    aria-label={L('Auswählen', 'Select')}
                  />
                  <button className="flex-1 min-w-[220px] text-left" onClick={() => router.push(`/dashboard/times?entry=${e.id}`)}>
                    <p className="text-sm font-black text-slate-900">
                      {e.employee?.full_name ?? '—'}
                      {e.entered_by && e.entered_by !== e.employee_id && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{L('stellv. erfasst', 'on behalf')}</span>
                      )}
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      {weekdayName(e.date, locale, true)}, {formatDateDE(e.date)} · {formatShiftRange(e.start_time, e.end_time, locale)} · {e.break_minutes ?? 0} Min. {L('Pause', 'break')}
                      {e.plan?.start_time && e.plan?.end_time ? ` · ${L('Plan', 'Plan')} ${formatShiftRange(e.plan.start_time, e.plan.end_time, locale)}` : ''}
                    </p>
                    {issues.length > 0 && (
                      <p className="flex items-center gap-1 text-xs font-bold text-red-600 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {issues.map((i) => shiftIssueLabel(i, locale)).join(' · ')}
                      </p>
                    )}
                  </button>
                  <span className="text-lg font-black text-slate-900 tabular-nums">
                    {formatHours(entryNetHours(e), locale)} <span className="text-xs text-slate-400">{L('Std.', 'h')}</span>
                  </span>
                  <Button
                    size="sm"
                    disabled={issues.length > 0 || busy}
                    onClick={() => approve([e.id])}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3. Unsent / still running */}
      <section className="space-y-3">
        <SectionTitle title={L('Nicht abgesendet / nicht beendet', 'Not submitted / not ended')} count={unsent.length} />
        {unsent.length === 0 ? (
          <Empty text={L('Alle beendeten Schichten sind abgesendet.', 'All finished shifts have been submitted.')} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            {unsent.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <button className="flex-1 min-w-[220px] text-left" onClick={() => router.push(`/dashboard/times?entry=${e.id}`)}>
                  <p className="text-sm font-black text-slate-900">{e.employee?.full_name ?? '—'}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {formatDateDE(e.date)} · {formatShiftRange(e.start_time, e.end_time, locale)}
                    {!e.end_time && (
                      <span className="ml-2 text-red-600 font-bold">
                        {L(`läuft seit ${formatHours(hoursBetween(e.start_time, new Date().toISOString(), 0), 'de')} Std.`, `running for ${formatHours(hoursBetween(e.start_time, new Date().toISOString(), 0), 'en')} h`)}
                      </span>
                    )}
                  </p>
                </button>
                <Button size="sm" variant="outline" className="rounded-xl font-bold" onClick={() => remind(e)}>
                  <BellRing className="w-4 h-4 mr-2" /> {L('Erinnern', 'Remind')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 tracking-tight">
      {title}
      <span className={cn('min-w-6 h-6 px-2 rounded-full text-xs font-black flex items-center justify-center', count ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400')}>
        {count}
      </span>
    </h2>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-400">{text}</p>
}

function CorrectionCard({
  c, onDecide, onOpen,
}: {
  c: TimeEntryCorrection
  onDecide: (c: TimeEntryCorrection, approve: boolean, note?: string) => Promise<boolean>
  onOpen: () => void
}) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<null | 'a' | 'r'>(null)
  const o = c.original
  const p = c.proposed
  const run = async (approve: boolean) => {
    setBusy(approve ? 'a' : 'r')
    await onDecide(c, approve, note)
    setBusy(null)
  }
  return (
    <div className="bg-white rounded-2xl border border-amber-200 p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onOpen} className="text-left">
          <p className="text-sm font-black text-slate-900">{c.employee?.full_name ?? '—'}</p>
          <p className="text-xs font-semibold text-slate-500">
            {L('Eintrag vom', 'Entry of')} {formatDateDE(o.date ?? c.entry?.date ?? '')} · {L('beantragt am', 'requested on')} {formatDateDE(c.requested_at.slice(0, 10))}
          </p>
        </button>
      </div>
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{L('Bisher (gültig)', 'Current (valid)')}</p>
          <p className="font-bold text-slate-700">
            {formatShiftRange(o.start_time, o.end_time, locale)} · {o.break_minutes ?? 0} Min. · {formatHours(hoursBetween(o.start_time, o.end_time, o.break_minutes), locale)} {L('Std.', 'h')}
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{L('Beantragt', 'Requested')}</p>
          <p className="font-bold text-amber-900">
            {formatShiftRange(p.start_time, p.end_time, locale)} · {p.break_minutes ?? 0} Min. · {formatHours(hoursBetween(p.start_time, p.end_time, p.break_minutes), locale)} {L('Std.', 'h')}
          </p>
        </div>
      </div>
      <p className="text-sm text-slate-700"><span className="font-bold">{L('Begründung', 'Reason')}:</span> {c.reason}</p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={L('Hinweis an Mitarbeiter (optional)', 'Note to employee (optional)')} className="rounded-xl" />
      <div className="flex gap-2">
        <Button disabled={!!busy} onClick={() => run(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest">
          {busy === 'a' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {L('Genehmigen & übernehmen', 'Approve & apply')}
        </Button>
        <Button disabled={!!busy} variant="outline" onClick={() => run(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest text-red-600">
          {busy === 'r' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
          {L('Ablehnen', 'Reject')}
        </Button>
      </div>
    </div>
  )
}
