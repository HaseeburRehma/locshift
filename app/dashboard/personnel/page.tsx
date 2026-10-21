'use client'

/**
 * Personal & Fristen (Kundenfeedback Punkt 11) — central deadline overview
 * for admin and dispatch, plus the list of personnel files.
 */

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ChevronRight, Clock, Loader2, Plus, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { usePersonnelDocuments } from '@/hooks/personnel/usePersonnelDocuments'
import { DocumentForm } from '@/components/personnel/DocumentForm'
import { DocumentTable } from '@/components/personnel/DocumentTable'
import { DOC_TYPES, docStatus, docTypeLabel, type DocStatus, type DocType, type PersonnelDocument } from '@/lib/personnel/documents'

export default function PersonnelPage() {
  const { profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { documents, loading, createDocument, updateDocument, deleteDocument, openFile } = usePersonnelDocuments()

  const [employees, setEmployees] = useState<{ id: string; full_name: string | null; role: string | null }[]>([])
  const [tab, setTab] = useState<'deadlines' | 'files'>('deadlines')
  const [statusFilter, setStatusFilter] = useState<'attention' | DocStatus | 'all'>('attention')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<{ mode: 'new' | 'edit' | 'renew'; doc?: PersonnelDocument } | null>(null)

  useEffect(() => {
    if (!profile?.organization_id) return
    createClient()
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('organization_id', profile.organization_id)
      .order('full_name')
      .then(({ data }: { data: Array<{ id: string; full_name: string | null; role: string | null; is_active: boolean | null }> | null }) =>
        setEmployees((data ?? []).filter((p) => p.is_active !== false)),
      )
  }, [profile?.organization_id])

  const counts = useMemo(() => {
    const c = { expired: 0, expiring: 0, valid: 0, no_expiry: 0 } as Record<DocStatus, number>
    for (const d of documents) c[docStatus(d)] += 1
    return c
  }, [documents])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return documents
      .filter((d) => {
        const s = docStatus(d)
        if (statusFilter === 'attention' && s !== 'expired' && s !== 'expiring') return false
        if (statusFilter !== 'attention' && statusFilter !== 'all' && s !== statusFilter) return false
        if (typeFilter !== 'all' && d.doc_type !== typeFilter) return false
        if (q && !`${d.employee?.full_name ?? ''} ${d.name} ${d.reference ?? ''}`.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => (a.expires_at ?? '9999').localeCompare(b.expires_at ?? '9999'))
  }, [documents, statusFilter, typeFilter, search])

  const fitnessMissing = useMemo(() => {
    const drivers = employees.filter((e) => ['employee', 'technician'].includes(String(e.role ?? '').toLowerCase()))
    return drivers.filter((e) => !documents.some((d) => d.user_id === e.id && d.doc_type === 'fitness' && docStatus(d) !== 'expired'))
  }, [employees, documents])

  const perEmployee = useMemo(
    () =>
      employees.map((e) => {
        const docs = documents.filter((d) => d.user_id === e.id)
        return {
          ...e,
          total: docs.length,
          expired: docs.filter((d) => docStatus(d) === 'expired').length,
          expiring: docs.filter((d) => docStatus(d) === 'expiring').length,
        }
      }),
    [employees, documents],
  )

  const filterBtn = (key: typeof statusFilter, label: string, count?: number, tone?: string) => (
    <button
      key={key}
      onClick={() => setStatusFilter(key)}
      className={cn(
        'rounded-full border px-4 py-1.5 text-xs font-bold transition-colors',
        statusFilter === key ? 'border-[#0064E0] bg-[#0064E0] text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
      )}
    >
      {label}
      {count != null && <span className={cn('ml-1.5 rounded-full px-1.5 text-[10px]', statusFilter === key ? 'bg-white/20' : tone)}>{count}</span>}
    </button>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0064E0]">{L('Personal & Fristen', 'Staff & deadlines')}</h1>
          <p className="text-sm text-slate-400 font-medium">
            {L('Digitale Personalakte mit Gültigkeiten – Erinnerungen an Admin und Disposition', 'Digital personnel files with validity dates – reminders to admin and dispatch')}
          </p>
        </div>
        <Button onClick={() => setForm({ mode: 'new' })} className="rounded-xl bg-[#0064E0] hover:bg-[#0050B4] font-bold">
          <Plus className="w-4 h-4 mr-1" /> {L('Nachweis hinzufügen', 'Add document')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<AlertTriangle className="w-5 h-5 text-red-600" />} value={counts.expired} label={L('Abgelaufen', 'Expired')} tone="red" />
        <Kpi icon={<Clock className="w-5 h-5 text-amber-600" />} value={counts.expiring} label={L('Laufen bald ab', 'Expiring soon')} tone="amber" />
        <Kpi icon={<ShieldCheck className="w-5 h-5 text-emerald-600" />} value={counts.valid} label={L('Gültig', 'Valid')} tone="emerald" />
        <Kpi icon={<AlertTriangle className="w-5 h-5 text-slate-500" />} value={fitnessMissing.length} label={L('Ohne gültige Tauglichkeit', 'No valid fitness cert.')} tone="slate" />
      </div>

      <div className="inline-flex rounded-xl bg-slate-100 p-1">
        {(['deadlines', 'files'] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={cn('px-4 h-9 rounded-lg text-sm font-bold', tab === k ? 'bg-white text-[#0064E0] shadow-sm' : 'text-slate-500')}>
            {k === 'deadlines' ? L('Fristenübersicht', 'Deadlines') : L('Personalakten', 'Personnel files')}
          </button>
        ))}
      </div>

      {tab === 'deadlines' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {filterBtn('attention', L('Handlungsbedarf', 'Needs action'), counts.expired + counts.expiring, 'bg-amber-100 text-amber-800')}
            {filterBtn('expired', L('Abgelaufen', 'Expired'), counts.expired, 'bg-red-100 text-red-700')}
            {filterBtn('expiring', L('Läuft bald ab', 'Expiring'), counts.expiring, 'bg-amber-100 text-amber-800')}
            {filterBtn('valid', L('Gültig', 'Valid'), counts.valid, 'bg-emerald-100 text-emerald-700')}
            {filterBtn('all', L('Alle', 'All'))}
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600">
              <option value="all">{L('Alle Dokumentarten', 'All types')}</option>
              {(Object.keys(DOC_TYPES) as DocType[]).map((t) => (
                <option key={t} value={t}>{docTypeLabel(t, locale)}</option>
              ))}
            </select>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L('Suchen …', 'Search …')} className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm outline-none" />
            </div>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <DocumentTable
              documents={filtered}
              showEmployee
              onOpenFile={openFile}
              onEdit={(d) => setForm({ mode: 'edit', doc: d })}
              onRenew={(d) => setForm({ mode: 'renew', doc: d })}
              onDelete={deleteDocument}
            />
          )}
          {fitnessMissing.length > 0 && (
            <p className="text-xs font-semibold text-slate-500">
              {L('Ohne gültige Tauglichkeit:', 'Without valid fitness certificate:')} {fitnessMissing.map((e) => e.full_name ?? '—').join(', ')}
            </p>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {perEmployee.map((e) => (
            <Link key={e.id} href={`/dashboard/personnel/${e.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{e.full_name ?? '—'}</p>
                <p className="text-xs text-slate-400">{e.total} {L('Nachweis(e)', 'document(s)')}</p>
              </div>
              {e.expired > 0 && <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase text-red-700">{e.expired} {L('abgelaufen', 'expired')}</span>}
              {e.expiring > 0 && <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">{e.expiring} {L('bald fällig', 'due soon')}</span>}
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </Link>
          ))}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl rounded-2xl p-6 max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {form?.mode === 'renew' ? L('Nachweis erneuern', 'Renew document') : form?.mode === 'edit' ? L('Nachweis bearbeiten', 'Edit document') : L('Nachweis hinzufügen', 'Add document')}
            </DialogTitle>
          </DialogHeader>
          {form && (
            <DocumentForm
              key={`${form.mode}-${form.doc?.id ?? 'new'}`}
              employees={employees}
              initial={form.mode === 'edit' ? form.doc : null}
              renewOf={form.mode === 'renew' ? form.doc : null}
              onSubmit={(input, file) =>
                form.mode === 'edit' && form.doc
                  ? updateDocument(form.doc.id, input, file)
                  : createDocument(input, file, form.mode === 'renew' ? form.doc : null)
              }
              onCancel={() => setForm(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Kpi({ icon, value, label, tone }: { icon: React.ReactNode; value: number; label: string; tone: 'red' | 'amber' | 'emerald' | 'slate' }) {
  return (
    <div className={cn('rounded-2xl border bg-white p-4', tone === 'red' && value ? 'border-red-200' : tone === 'amber' && value ? 'border-amber-200' : 'border-slate-200')}>
      <div className="flex items-center justify-between">
        {icon}
        <span className="text-2xl font-black text-slate-900 tabular-nums">{value}</span>
      </div>
      <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
    </div>
  )
}
