'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Plus, Download, Search, Gift, User, Calendar, Trash2,
  ChevronLeft, ChevronRight, ChevronDown, Users, Euro,
  CheckCircle, Loader2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { HolidayBonus, Profile } from '@/lib/types'
import { useHolidayBonus } from '@/hooks/useHolidayBonus'
import { HolidayBonusForm } from '@/components/shared/HolidayBonusForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'

// ─── Helpers ────────────────────────────────────────────────
function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)
}

function exportBonusesCSV(bonuses: HolidayBonus[], profiles: Record<string, Profile>, locale: string) {
  const L = (de: string, en: string) => locale === 'de' ? de : en
  if (bonuses.length === 0) {
    toast.error(L('Keine Bonusdaten zum Exportieren.', 'No bonuses to export.'))
    return
  }
  const headers = [L('Mitarbeiter', 'Employee'), L('Betrag', 'Amount'), L('Beschreibung', 'Description'), L('Auszahlungsdatum', 'Date Paid')]
  const rows = bonuses.map(b => [
    profiles[b.employee_id]?.full_name || b.employee_id,
    b.amount.toFixed(2),
    (b.notes || '').replace(/,/g, ';'),
    new Date(b.created_at).toLocaleDateString('de-DE'),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `holiday_bonuses_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(L('CSV erfolgreich exportiert.', 'CSV exported successfully.'))
}

// ─── Delete Confirm Inline ──────────────────────────────────
function InlineDeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const { locale } = useTranslation()
  const L = (de: string, en: string) => locale === 'de' ? de : en
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-150">
      <span className="text-xs font-semibold text-gray-500">{L('Löschen?', 'Delete?')}</span>
      <button
        onClick={onConfirm}
        className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
      >
        {L('Ja', 'Yes')}
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
      >
        {L('Nein', 'No')}
      </button>
    </div>
  )
}

// ─── Page Component ─────────────────────────────────────────
export default function HolidayBonusPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { bonuses, loading, createHolidayBonus, deleteHolidayBonus, totalPaidThisYear } = useHolidayBonus()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, Profile>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Fetch employee profiles for admin view
  useEffect(() => {
    const fetchProfiles = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile?.organization_id)
      if (data) {
        const map: Record<string, Profile> = {}
        ;(data as Profile[]).forEach(p => { map[p.id] = p })
        setEmployeeProfiles(map)
      }
    }
    if ((isAdmin || isDispatcher) && profile?.organization_id) fetchProfiles()
  }, [isAdmin, isDispatcher, profile?.organization_id])

  // Employee options for the filter
  const employeeOptions = useMemo(() => {
    const empMap = new Map<string, string>()
    Object.values(employeeProfiles).forEach(p => {
      if (p.full_name) empMap.set(p.id, p.full_name)
    })
    bonuses.forEach(b => {
      if (b.employee_id && employeeProfiles[b.employee_id]?.full_name) {
        empMap.set(b.employee_id, employeeProfiles[b.employee_id].full_name!)
      }
    })
    return Array.from(empMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [bonuses, employeeProfiles])

  // Filtered + searched bonuses
  const filteredBonuses = useMemo(() => {
    let result = bonuses

    // Employee filter
    if (employeeFilter !== 'all') {
      result = result.filter(b => b.employee_id === employeeFilter)
    }

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(b => {
        const name = employeeProfiles[b.employee_id]?.full_name?.toLowerCase() || ''
        const notes = b.notes?.toLowerCase() || ''
        return name.includes(q) || notes.includes(q) || String(b.amount).includes(q)
      })
    }

    return result
  }, [bonuses, employeeFilter, searchTerm, employeeProfiles])

  // Pagination
  const totalPages = Math.ceil(filteredBonuses.length / itemsPerPage)
  const paginatedBonuses = useMemo(() => {
    return filteredBonuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredBonuses, currentPage])

  // Reset page on filter change
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, employeeFilter])

  // Filtered total for display
  const filteredTotal = useMemo(() => {
    return filteredBonuses
      .filter(b => new Date(b.created_at).getFullYear() === new Date().getFullYear())
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
  }, [filteredBonuses])

  const handleDelete = async (id: string) => {
    setConfirmingDeleteId(null)
    await deleteHolidayBonus(id)
  }

  // ─── Employee View ──────────────────────────────────────
  if (!isAdmin && !isDispatcher) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0064E0] tracking-tight">
            {locale === 'de' ? 'Urlaubsgeld' : 'Holiday Bonus'}
          </h1>
          <p className="text-sm text-gray-500">
            {locale === 'de' ? 'Urlaubsbezogene Bonuszahlungen anzeigen' : 'View holiday-related bonus payments'}
          </p>
        </div>

        {/* Total Year-to-Date Card */}
        <div className="bg-[#0064E0] rounded-2xl p-8 text-white text-center shadow-lg">
          <p className="text-sm font-medium text-white/70 mb-2">
            {locale === 'de' ? 'Gesamt Jahresbetrag' : 'Total Year-to-Date'}
          </p>
          <h2 className="text-5xl font-bold tracking-tight tabular-nums">
            {formatCurrency(totalPaidThisYear, locale)}
          </h2>
          <p className="text-sm text-white/50 mt-2">
            {locale === 'de' ? `Jahr ${new Date().getFullYear()}` : `Year ${new Date().getFullYear()}`}
          </p>
        </div>

        {/* Bonus History */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {locale === 'de' ? 'Bonusverlauf' : 'Bonus History'}
          </h2>

          {loading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin mx-auto" />
            </div>
          ) : bonuses.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400">
                  {locale === 'de' ? 'Noch keine Bonuszahlungen erhalten.' : 'No bonus payments received yet.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {locale === 'de' ? 'Bonustyp' : 'Bonus Type'}
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {locale === 'de' ? 'Zeitraum' : 'Period'}
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {locale === 'de' ? 'Betrag' : 'Amount'}
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        {locale === 'de' ? 'Zahlungsdatum' : 'Payment Date'}
                      </th>
                      <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {bonuses.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-900">
                            {b.notes || (locale === 'de' ? 'Urlaubsgeld' : 'Holiday Bonus')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-500">
                            {b.period_start
                              ? format(new Date(b.period_start), 'MMMM yyyy')
                              : format(new Date(b.created_at), 'MMMM yyyy')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-bold text-emerald-600 tabular-nums">
                            {formatCurrency(b.amount, locale)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-500">
                            {format(new Date(b.created_at), 'MMM d, yyyy')}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle className="w-3 h-3" />
                            {locale === 'de' ? 'Bezahlt' : 'Paid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── Admin / Dispatcher View ────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#0064E0] tracking-tight">
            {locale === 'de' ? 'Urlaubsgeld' : 'Holiday Bonus'}
          </h1>
          <p className="text-sm text-gray-500">
            {locale === 'de' ? 'Bonuszahlungen verwalten und verteilen' : 'Manage and distribute bonus payments'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs font-medium gap-1.5 text-gray-600"
            onClick={() => exportBonusesCSV(filteredBonuses, employeeProfiles, locale)}
          >
            <Download className="w-3.5 h-3.5" />
            {locale === 'de' ? 'CSV Export' : 'Export CSV'}
          </Button>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-9 rounded-xl bg-[#0064E0] hover:bg-blue-700 text-white text-xs font-medium gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                {locale === 'de' ? 'Neuer Bonus' : 'New Bonus'}
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl p-6 sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {locale === 'de' ? 'Bonus vergeben' : 'Award Holiday Bonus'}
                </DialogTitle>
              </DialogHeader>
              <HolidayBonusForm
                onSubmit={async (data): Promise<boolean> => {
                  const success = await createHolidayBonus(data)
                  if (success) setIsFormOpen(false)
                  return !!(success ?? false)
                }}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0064E0] rounded-2xl p-6 text-white shadow-md">
          <p className="text-xs font-medium text-white/60 mb-1">
            {locale === 'de' ? 'Gesamt bezahlt (Jahr)' : 'Total Paid (Year)'}
          </p>
          <h3 className="text-3xl font-bold tracking-tight tabular-nums">
            {formatCurrency(totalPaidThisYear, locale)}
          </h3>
          <p className="text-xs text-white/40 mt-1">{new Date().getFullYear()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-medium text-gray-400 mb-1">
            {locale === 'de' ? 'Gesamte Auszahlungen' : 'Total Distributions'}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
            {bonuses.length}
          </h3>
          <p className="text-xs text-gray-300 mt-1">{locale === 'de' ? 'Alle Zeiten' : 'All time'}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-medium text-gray-400 mb-1">
            {locale === 'de' ? 'Gefilterte Summe' : 'Filtered Total'}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
            {formatCurrency(filteredTotal, locale)}
          </h3>
          <p className="text-xs text-gray-300 mt-1">
            {filteredBonuses.length} {locale === 'de' ? 'Einträge' : 'entries'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Employee filter */}
        <div className="relative w-full sm:w-52">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select
            value={employeeFilter}
            onChange={e => setEmployeeFilter(e.target.value)}
            className={cn(
              "w-full h-10 pl-9 pr-9 rounded-xl border bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-xs appearance-none cursor-pointer",
              employeeFilter !== 'all'
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600'
            )}
          >
            <option value="all">{locale === 'de' ? 'Alle Mitarbeiter' : 'All Employees'}</option>
            {employeeOptions.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={locale === 'de' ? 'Suchen...' : 'Search...'}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all font-medium text-xs"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Clear filters */}
        {(employeeFilter !== 'all' || searchTerm.trim()) && (
          <button
            onClick={() => { setEmployeeFilter('all'); setSearchTerm('') }}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
          >
            {locale === 'de' ? 'Filter zurücksetzen' : 'Clear filters'}
          </button>
        )}
      </div>

      {/* Bonus History Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'de' ? 'Mitarbeiter' : 'Employee'}
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'de' ? 'Beschreibung' : 'Description'}
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'de' ? 'Zeitraum' : 'Period'}
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'de' ? 'Betrag' : 'Amount'}
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {locale === 'de' ? 'Zahlungsdatum' : 'Payment Date'}
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-5 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-right">
                  {locale === 'de' ? 'Aktionen' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-5">
                      <div className="h-5 bg-gray-100 rounded-lg animate-pulse w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedBonuses.length > 0 ? (
                paginatedBonuses.map(b => {
                  const emp = employeeProfiles[b.employee_id]
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/50 transition-colors group">
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp?.full_name || 'U')}&background=0064E0&color=fff&size=32`}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-gray-100"
                          />
                          <span className="text-sm font-semibold text-gray-900 truncate max-w-[140px]">
                            {emp?.full_name || '...'}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500 truncate max-w-[160px] block">
                          {b.notes || '—'}
                        </span>
                      </td>

                      {/* Period */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">
                          {b.period_start
                            ? format(new Date(b.period_start), 'MMMM yyyy')
                            : format(new Date(b.created_at), 'MMMM yyyy')}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-emerald-600 tabular-nums">
                          {formatCurrency(b.amount, locale)}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">
                          {format(new Date(b.created_at), 'MMM d, yyyy')}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <CheckCircle className="w-3 h-3" />
                          {locale === 'de' ? 'Bezahlt' : 'Paid'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        {confirmingDeleteId === b.id ? (
                          <InlineDeleteConfirm
                            onConfirm={() => handleDelete(b.id)}
                            onCancel={() => setConfirmingDeleteId(null)}
                          />
                        ) : (
                          <button
                            onClick={() => setConfirmingDeleteId(b.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                            title={locale === 'de' ? 'Löschen' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-sm text-gray-400">
                        {searchTerm || employeeFilter !== 'all'
                          ? (locale === 'de' ? 'Keine Ergebnisse gefunden.' : 'No results found.')
                          : (locale === 'de' ? 'Noch keine Bonuszahlungen vorhanden.' : 'No bonus distributions yet.')}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredBonuses.length > itemsPerPage && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs font-medium text-gray-400">
              {locale === 'de' ? 'Zeige' : 'Showing'}{' '}
              <span className="text-gray-700">{(currentPage - 1) * itemsPerPage + 1}</span>
              {' '}{locale === 'de' ? 'bis' : 'to'}{' '}
              <span className="text-gray-700">{Math.min(currentPage * itemsPerPage, filteredBonuses.length)}</span>
              {' '}{locale === 'de' ? 'von' : 'of'}{' '}
              <span className="text-gray-700">{filteredBonuses.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-gray-200"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-colors",
                      currentPage === i + 1
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg border-gray-200"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
