'use client'

/**
 * Sonderzahlungen (Kundenfeedback Punkt 6) — formerly "Urlaubsgeld".
 * Each payment has employee, title, amount, billing month or period and a
 * note on the agreement; it shows up automatically in the Monatsnachweis.
 */

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, Edit2, Gift, Loader2, Plus, Search, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import type { HolidayBonus } from '@/lib/types'
import { useSpecialPayments } from '@/hooks/useHolidayBonus'
import { SpecialPaymentForm } from '@/components/shared/SpecialPaymentForm'
import { exportHolidayBonusPdf } from '@/lib/pdf/exportPdf'
import { exportTableToExcel } from '@/lib/excel/exportExcel'
import { createClient } from '@/lib/supabase/client'
import { paymentPeriodLabel, specialPaymentTypeLabel } from '@/lib/special-payments'
import { formatEuro } from '@/lib/time/format'
import { localDateKey } from '@/lib/time/shift-hours'

const PAGE_SIZE = 10

export default function SpecialPaymentsPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const isManager = isAdmin || isDispatcher
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { payments, loading, createPayment, updatePayment, deletePayment, totalThisYear } = useSpecialPayments()

  const [names, setNames] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<HolidayBonus | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!isManager || !profile?.organization_id) return
    createClient()
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', profile.organization_id)
      .then(({ data }: { data: Array<{ id: string; full_name: string | null }> | null }) => {
        const map: Record<string, string> = {}
        for (const p of data ?? []) map[p.id] = p.full_name ?? '—'
        setNames(map)
      })
  }, [isManager, profile?.organization_id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter((p) => {
      if (employeeFilter !== 'all' && p.employee_id !== employeeFilter) return false
      if (!q) return true
      return [names[p.employee_id], p.title, p.notes, specialPaymentTypeLabel(p.bonus_type, locale), String(p.amount)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
  }, [payments, employeeFilter, search, names, locale])

  useEffect(() => setPage(1), [search, employeeFilter])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const recipients = new Set(payments.map((p) => p.employee_id)).size
  const employeeOptions = Object.entries(names).sort((a, b) => a[1].localeCompare(b[1], 'de'))

  const exportRows = () =>
    filtered.map((p) => ({
      ...p,
      employee_name: names[p.employee_id] ?? null,
    }))

  const exportExcel = () => {
    if (!filtered.length) return toast.error(L('Keine Daten zum Exportieren.', 'No data to export.'))
    exportTableToExcel({
      sheetName: L('Sonderzahlungen', 'Special payments'),
      filename: `sonderzahlungen_${localDateKey()}`,
      headers: [L('Mitarbeiter', 'Employee'), L('Bezeichnung', 'Title'), L('Art', 'Type'), L('Abrechnung', 'Billing'), L('Betrag (€)', 'Amount (€)'), L('Bemerkung', 'Note')],
      rows: filtered.map((p) => [
        names[p.employee_id] ?? p.employee_id,
        p.title ?? '',
        specialPaymentTypeLabel(p.bonus_type, locale),
        paymentPeriodLabel(p, locale),
        Number(Number(p.amount).toFixed(2)),
        p.notes ?? '',
      ]),
      totalsRow: [L('Summe', 'Total'), '', '', '', Number(filtered.reduce((s, p) => s + (Number(p.amount) || 0), 0).toFixed(2)), ''],
    })
  }

  const exportPdf = () => {
    if (!filtered.length) return toast.error(L('Keine Daten zum Exportieren.', 'No data to export.'))
    exportHolidayBonusPdf(exportRows(), {
      title: L('Sonderzahlungen', 'Special payments'),
      filename: `sonderzahlungen_${localDateKey()}.pdf`,
      locale,
    })
  }

  const table = (rows: HolidayBonus[], showEmployee: boolean) => (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {showEmployee && <th className="px-5 py-3.5">{L('Mitarbeiter', 'Employee')}</th>}
              <th className="px-5 py-3.5">{L('Bezeichnung', 'Title')}</th>
              <th className="px-5 py-3.5">{L('Art', 'Type')}</th>
              <th className="px-5 py-3.5">{L('Abrechnung', 'Billing')}</th>
              <th className="px-5 py-3.5 text-right">{L('Betrag', 'Amount')}</th>
              <th className="px-5 py-3.5">{L('Bemerkung', 'Note')}</th>
              {isManager && <th className="px-5 py-3.5 text-right">{L('Aktionen', 'Actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                {showEmployee && <td className="px-5 py-3.5 font-bold text-gray-900">{names[p.employee_id] ?? '—'}</td>}
                <td className="px-5 py-3.5 font-semibold text-gray-900">{p.title || specialPaymentTypeLabel(p.bonus_type, locale)}</td>
                <td className="px-5 py-3.5 text-gray-500">{specialPaymentTypeLabel(p.bonus_type, locale)}</td>
                <td className="px-5 py-3.5 text-gray-600">{paymentPeriodLabel(p, locale)}</td>
                <td className="px-5 py-3.5 text-right font-bold text-emerald-600 tabular-nums">{formatEuro(p.amount, locale)}</td>
                <td className="px-5 py-3.5 text-gray-500 max-w-[260px] truncate" title={p.notes ?? ''}>{p.notes || '—'}</td>
                {isManager && (
                  <td className="px-5 py-3.5">
                    {confirmDelete === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-gray-500">{L('Löschen?', 'Delete?')}</span>
                        <button className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg" onClick={() => { setConfirmDelete(null); deletePayment(p.id) }}>
                          {L('Ja', 'Yes')}
                        </button>
                        <button className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg" onClick={() => setConfirmDelete(null)}>
                          {L('Nein', 'No')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-blue-600 hover:bg-blue-50" onClick={() => setEditing(p)} aria-label={L('Bearbeiten', 'Edit')}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50" onClick={() => setConfirmDelete(p.id)} aria-label={L('Löschen', 'Delete')}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  const empty = (
    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
      <Gift className="w-6 h-6 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{L('Keine Sonderzahlungen vorhanden.', 'No special payments yet.')}</p>
    </div>
  )

  if (!isManager) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16 px-4 md:px-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0064E0] tracking-tight">{L('Sonderzahlungen', 'Special payments')}</h1>
          <p className="text-sm text-gray-500">{L('Ihre zusätzlichen Zahlungen und Vereinbarungen', 'Your additional payments and agreements')}</p>
        </div>
        <div className="bg-[#0064E0] rounded-2xl p-8 text-white text-center shadow-lg">
          <p className="text-sm font-medium text-white/70 mb-2">{L(`Summe ${new Date().getFullYear()}`, `Total ${new Date().getFullYear()}`)}</p>
          <h2 className="text-5xl font-bold tracking-tight tabular-nums">{formatEuro(totalThisYear, locale)}</h2>
          <p className="text-xs text-white/60 mt-3">
            {L('Die Zahlungen erscheinen auch in Ihrem ', 'Payments also appear in your ')}
            <Link href="/dashboard/times/monthly" className="underline font-bold">{L('Monatsnachweis', 'monthly statement')}</Link>.
          </p>
        </div>
        {loading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300 mx-auto" /> : payments.length === 0 ? empty : table(payments, false)}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16 px-4 md:px-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0064E0] tracking-tight">{L('Sonderzahlungen', 'Special payments')}</h1>
          <p className="text-sm text-gray-500">
            {L('Urlaubsgeld, Prämien und weitere Zahlungen – erscheinen automatisch im Monatsnachweis', 'Holiday pay, bonuses and other payments – shown automatically in the monthly statement')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-medium gap-1.5" onClick={exportExcel}>
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-medium gap-1.5" onClick={exportPdf}>
            <Download className="w-3.5 h-3.5" /> PDF
          </Button>
          <Button size="sm" className="h-9 rounded-xl bg-[#0064E0] hover:bg-blue-700 text-white text-xs font-bold gap-1.5" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> {L('Sonderzahlung anlegen', 'Add special payment')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0064E0] rounded-2xl p-6 text-white shadow-md">
          <p className="text-xs font-medium text-white/60 mb-1">{L(`Summe ${new Date().getFullYear()}`, `Total ${new Date().getFullYear()}`)}</p>
          <h3 className="text-3xl font-bold tracking-tight tabular-nums">{formatEuro(totalThisYear, locale)}</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-medium text-gray-400 mb-1">{L('Anzahl Zahlungen', 'Number of payments')}</p>
          <h3 className="text-3xl font-bold text-gray-900 tabular-nums">{payments.length}</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-medium text-gray-400 mb-1">{L('Empfänger', 'Recipients')}</p>
          <h3 className="text-3xl font-bold text-gray-900 tabular-nums">{recipients}</h3>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={L('Suche nach Name, Bezeichnung, Bemerkung …', 'Search name, title, note …')}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
          />
        </div>
        <div className="relative sm:w-60">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold appearance-none">
            <option value="all">{L('Alle Mitarbeiter', 'All employees')}</option>
            {employeeOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        empty
      ) : (
        <>
          {table(visible, true)}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-bold text-gray-500">{page} / {pages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null) } }}>
        <DialogContent className="rounded-2xl p-6 sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? L('Sonderzahlung bearbeiten', 'Edit special payment') : L('Neue Sonderzahlung', 'New special payment')}
            </DialogTitle>
          </DialogHeader>
          <SpecialPaymentForm
            key={editing?.id ?? 'new'}
            initial={editing}
            onSubmit={(data) => (editing ? updatePayment(editing.id, data) : createPayment(data))}
            onCancel={() => { setCreating(false); setEditing(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
