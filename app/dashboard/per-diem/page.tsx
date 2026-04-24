// app/dashboard/per-diem/page.tsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Wallet,
  Plus,
  Search,
  Eye,
  Download,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { PerDiem, Profile } from '@/lib/types'
import { usePerDiem } from '@/hooks/usePerDiem'
import { PerDiemForm } from '@/components/shared/PerDiemForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useMediaQuery } from '@/hooks/use-media-query'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, isSameMonth, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type StatusFilter = 'all' | 'submitted' | 'approved' | 'rejected'

const ITEMS_PER_PAGE = 10

export default function PerDiemPage() {
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const { perDiems, loading, createPerDiem, updatePerDiemStatus } = usePerDiem()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<string, Profile>>({})
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPd, setSelectedPd] = useState<PerDiem | null>(null)

  const isAdminView = isAdmin || isDispatcher

  // Fetch employee profiles for admin view
  useEffect(() => {
    if (!isAdminView || !profile?.organization_id) return
    const fetchProfiles = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
      if (data) {
        const map: Record<string, Profile> = {}
        ;(data as Profile[]).forEach(p => { map[p.id] = p })
        setEmployeeProfiles(map)
      }
    }
    fetchProfiles()
  }, [isAdminView, profile?.organization_id])

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1) }, [statusFilter, searchQuery])

  const filteredPerDiems = useMemo(() => {
    return perDiems.filter(pd => {
      const matchesStatus =
        statusFilter === 'all' || pd.status === statusFilter
      const employeeName =
        employeeProfiles[pd.employee_id]?.full_name?.toLowerCase() ?? ''
      const matchesSearch =
        employeeName.includes(searchQuery.toLowerCase()) ||
        (pd.task ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (pd.country ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      return matchesStatus && matchesSearch
    })
  }, [perDiems, statusFilter, searchQuery, employeeProfiles])

  const totalPages = Math.max(1, Math.ceil(filteredPerDiems.length / ITEMS_PER_PAGE))
  const paginated = filteredPerDiems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = perDiems.filter(pd =>
      isSameMonth(parseISO(pd.date), now)
    )
    const totalAmount = thisMonth
      .filter(pd => pd.status === 'approved')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
    const pendingCount = perDiems.filter(pd => pd.status === 'submitted').length
    const approvedCount = perDiems.filter(pd => pd.status === 'approved').length
    const totalAll = perDiems.reduce((a, c) => a + (Number(c.amount) || 0), 0)
    return { totalAmount, pendingCount, approvedCount, totalAll }
  }, [perDiems])

  const handleExport = () => {
    const headers = ['Employee', 'Date', 'Task', 'Country', 'Days', 'Rate', 'Amount', 'Status']
    const rows = filteredPerDiems.map(pd => [
      employeeProfiles[pd.employee_id]?.full_name ?? 'Unknown',
      pd.start_date
        ? `${format(parseISO(pd.start_date), 'dd.MM')} - ${format(parseISO(pd.end_date ?? pd.start_date), 'dd.MM.yyyy')}`
        : format(parseISO(pd.date), 'dd.MM.yyyy'),
      pd.task ?? 'N/A',
      pd.country,
      pd.num_days ?? 1,
      pd.rate?.toFixed(2) ?? '0.00',
      pd.amount.toFixed(2),
      pd.status,
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `per_diems_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success(L('Export gestartet', 'Export started'))
  }

  const renderForm = () => (
    <PerDiemForm
      onSubmit={async (data): Promise<boolean> => {
        const ok = await createPerDiem(data)
        if (ok) setIsFormOpen(false)
        return !!(ok ?? false)
      }}
      onCancel={() => setIsFormOpen(false)}
    />
  )

  const formatDateRange = (pd: PerDiem) => {
    if (pd.start_date && pd.end_date) {
      return `${format(parseISO(pd.start_date), 'MMM d')} – ${format(parseISO(pd.end_date), 'MMM d, yyyy')}`
    }
    return format(parseISO(pd.date), 'MMM d, yyyy')
  }

  const daysOrHours = (pd: PerDiem) => {
    if (pd.working_hours) return `${pd.working_hours} ${L('Std.', 'hrs')}`
    const n = pd.num_days ?? 1
    return `${n} ${n === 1 ? L('Tag', 'day') : L('Tage', 'days')}`
  }

  const rateLabel = (pd: PerDiem) => {
    if (pd.working_hours && pd.hourly_rate) return `€${pd.hourly_rate.toFixed(2)}/${L('Std.', 'hr')}`
    return `€${(pd.rate ?? 0).toFixed(2)}/${L('Tag', 'day')}`
  }

  return (
    <div className="min-h-screen bg-white animate-in fade-in duration-300">
      <div className="px-5 md:px-8 pt-6 pb-16 space-y-7 max-w-5xl mx-auto">

        {/* ── Page Title + actions ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[26px] md:text-[30px] font-bold text-slate-900 tracking-tight leading-none">
              {L('Verpflegung / Spesen', 'Per Diem / Travel Allowance')}
            </h1>
            <p className="text-[13px] text-slate-500 font-normal">
              {L('Verpflegungsanträge erfassen und nachverfolgen', 'Submit and track per diem claims')}
            </p>
          </div>
          {isAdminView && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 text-[13px] font-semibold text-slate-600 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              {L('CSV exportieren', 'Export CSV')}
            </button>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all col-span-1">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-blue-600 leading-none tracking-tight">
              €{stats.totalAmount.toFixed(2)}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">{L('Gesamt diesen Monat', 'Total This Month')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all col-span-1">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-blue-600 leading-none tracking-tight">
              {stats.pendingCount}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">{L('Offene Anträge', 'Pending Claims')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all hidden md:block">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-emerald-500 leading-none tracking-tight">
              {stats.approvedCount}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">{L('Genehmigt', 'Approved')}</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 hover:border-slate-300 hover:shadow-sm transition-all hidden md:block">
            <div className="text-[28px] md:text-[32px] font-bold tabular-nums text-slate-900 leading-none tracking-tight">
              €{stats.totalAll.toFixed(0)}
            </div>
            <p className="text-[12px] text-slate-500 font-normal leading-none">{L('Gesamtsumme', 'Total All Time')}</p>
          </div>
        </div>

        {/* ── Claims Table Card ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Card header: title + search + filter + add button */}
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center gap-4">
            <h2 className="text-[16px] font-semibold text-slate-900 shrink-0">
              {L('Verpflegungs-Anträge', 'Per Diem Claims')}
            </h2>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={isAdminView ? L('Mitarbeiter oder Einsatz suchen…', 'Search employee or task…') : L('Zielort suchen…', 'Search destination…')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-4 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Status filters */}
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'submitted', 'approved', 'rejected'] as StatusFilter[]).map(f => {
                const labels: Record<StatusFilter, { de: string; en: string }> = {
                  all:       { de: 'Alle',       en: 'All' },
                  submitted: { de: 'Ausstehend', en: 'Pending' },
                  approved:  { de: 'Genehmigt',  en: 'Approved' },
                  rejected:  { de: 'Abgelehnt',  en: 'Rejected' },
                }
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all',
                      statusFilter === f
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    )}
                  >
                    {locale === 'de' ? labels[f].de : labels[f].en}
                  </button>
                )
              })}
            </div>

            {/* Add Claim button */}
            <button
              onClick={() => setIsFormOpen(true)}
              className="ml-auto shrink-0 flex items-center gap-2 bg-blue-600 text-white text-[13px] font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {L('Antrag hinzufügen', 'Add Claim')}
            </button>
          </div>

          {/* Column headers — desktop */}
          <div className={cn(
            'hidden md:grid px-6 py-3 bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-widest text-slate-400',
            isAdminView ? 'grid-cols-12' : 'grid-cols-10'
          )}>
            {isAdminView && <div className="col-span-2">{L('Mitarbeiter', 'Employee')}</div>}
            <div className={isAdminView ? 'col-span-2' : 'col-span-3'}>{L('Reisezeitraum', 'Travel Dates')}</div>
            <div className="col-span-2">{L('Zielort', 'Destination')}</div>
            <div className="col-span-1">{L('Tage', 'Days')}</div>
            <div className="col-span-2">{L('Satz', 'Rate')}</div>
            <div className="col-span-1 text-right">{L('Betrag', 'Amount')}</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-1 text-right">{L('Aktionen', 'Actions')}</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                <span className="text-[13px] text-slate-400">{L('Anträge werden geladen…', 'Loading claims…')}</span>
              </div>
            ) : filteredPerDiems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                <Wallet className="h-10 w-10 text-slate-300" />
                <p className="text-[13px] text-slate-400 font-medium">{L('Keine Verpflegungsanträge gefunden.', 'No per diem claims found.')}</p>
              </div>
            ) : (
              paginated.map(pd => (
                <div key={pd.id} className="group hover:bg-slate-50 transition-colors">

                  {/* Desktop row */}
                  <div className={cn(
                    'hidden md:grid items-center px-6 py-4',
                    isAdminView ? 'grid-cols-12' : 'grid-cols-10'
                  )}>
                    {/* Employee (admin only) */}
                    {isAdminView && (
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[12px] font-bold text-slate-500 shrink-0">
                          {employeeProfiles[pd.employee_id]?.full_name?.charAt(0) ?? '?'}
                        </div>
                        <span className="text-[13px] font-medium text-slate-900 truncate">
                          {employeeProfiles[pd.employee_id]?.full_name ?? 'Unknown'}
                        </span>
                      </div>
                    )}

                    {/* Travel Dates */}
                    <div className={isAdminView ? 'col-span-2' : 'col-span-3'}>
                      <p className="text-[13px] font-medium text-slate-900 leading-none">{formatDateRange(pd)}</p>
                    </div>

                    {/* Destination */}
                    <div className="col-span-2">
                      <p className="text-[13px] text-slate-600 truncate">{pd.country}</p>
                    </div>

                    {/* Days */}
                    <div className="col-span-1">
                      <p className="text-[13px] text-slate-600">{daysOrHours(pd)}</p>
                    </div>

                    {/* Rate */}
                    <div className="col-span-2">
                      <p className="text-[13px] text-slate-600">{rateLabel(pd)}</p>
                    </div>

                    {/* Amount */}
                    <div className="col-span-1 text-right">
                      <span className="text-[14px] font-semibold text-emerald-600 tabular-nums">
                        €{pd.amount.toFixed(2)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 flex justify-center">
                      <StatusBadge status={pd.status} />
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      {isAdminView && pd.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => updatePerDiemStatus(pd.id, 'approved')}
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updatePerDiemStatus(pd.id, 'rejected')}
                            className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedPd(pd)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Mobile row */}
                  <div className="md:hidden px-5 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        {isAdminView && (
                          <p className="text-[12px] font-semibold text-blue-600">
                            {employeeProfiles[pd.employee_id]?.full_name ?? 'Unknown'}
                          </p>
                        )}
                        <p className="text-[14px] font-semibold text-slate-900 leading-none">{formatDateRange(pd)}</p>
                        <p className="text-[12px] text-slate-400">{pd.country} · {daysOrHours(pd)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[15px] font-bold text-emerald-600 tabular-nums">€{pd.amount.toFixed(2)}</span>
                        <StatusBadge status={pd.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-slate-400">{rateLabel(pd)}</span>
                      <div className="flex items-center gap-1.5">
                        {isAdminView && pd.status === 'submitted' && (
                          <>
                            <button
                              onClick={() => updatePerDiemStatus(pd.id, 'approved')}
                              className="h-8 px-3 flex items-center gap-1 rounded-lg bg-emerald-50 text-emerald-600 text-[12px] font-semibold hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => updatePerDiemStatus(pd.id, 'rejected')}
                              className="h-8 px-3 flex items-center gap-1 rounded-lg bg-red-50 text-red-500 text-[12px] font-semibold hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedPd(pd)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[12px] text-slate-500 font-medium hidden md:block">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredPerDiems.length)} of {filteredPerDiems.length}
              </span>
              <div className="flex items-center gap-1.5 mx-auto md:mx-0">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-white hover:border-slate-300 transition-all active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-[12px] font-semibold transition-all active:scale-95',
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-white border border-transparent hover:border-slate-200'
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-40 hover:bg-white hover:border-slate-300 transition-all active:scale-95"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Claim Form — Dialog (desktop) / Drawer (mobile) ── */}
      {isDesktop ? (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="rounded-2xl p-0 sm:max-w-xl border border-slate-200 shadow-xl overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
              <DialogTitle className="text-[18px] font-bold text-slate-900">
                New Per Diem Claim
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 pt-4 overflow-y-auto max-h-[80vh]">
              {renderForm()}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DrawerContent className="rounded-t-[2rem] outline-none">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3" />
            <DrawerHeader className="px-5 pt-4 pb-2 text-left">
              <DrawerTitle className="text-[18px] font-bold text-slate-900">
                New Per Diem Claim
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-5 pb-8 overflow-y-auto max-h-[80vh]">
              {renderForm()}
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* ── Per Diem Detail View ── */}
      {selectedPd && (
        <PerDiemDetailModal
          pd={selectedPd}
          employeeName={employeeProfiles[selectedPd.employee_id]?.full_name}
          isAdminView={isAdminView}
          onClose={() => setSelectedPd(null)}
          onApprove={id => { updatePerDiemStatus(id, 'approved'); setSelectedPd(null) }}
          onReject={id => { updatePerDiemStatus(id, 'rejected'); setSelectedPd(null) }}
        />
      )}
    </div>
  )

}

// ── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg = {
    submitted: { color: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Pending' },
    approved: { color: 'bg-emerald-50 text-emerald-600 border-emerald-200', label: 'Approved' },
    rejected: { color: 'bg-red-50 text-red-500 border-red-200', label: 'Rejected' },
  } as Record<string, { color: string; label: string }>

  const s = cfg[status] ?? { color: 'bg-slate-50 text-slate-500 border-slate-200', label: status }
  return (
    <span className={cn('inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold border', s.color)}>
      {s.label}
    </span>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────
function PerDiemDetailModal({
  pd,
  employeeName,
  isAdminView,
  onClose,
  onApprove,
  onReject,
}: {
  pd: PerDiem
  employeeName?: string | null
  isAdminView: boolean
  onClose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const formatDateRange = () => {
    if (pd.start_date && pd.end_date)
      return `${format(parseISO(pd.start_date), 'MMM d')} – ${format(parseISO(pd.end_date), 'MMM d, yyyy')}`
    return format(parseISO(pd.date), 'MMM d, yyyy')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-slate-900">Per Diem Detail</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isAdminView && employeeName && (
            <DetailRow label="Employee" value={employeeName} />
          )}
          <DetailRow label="Travel Dates" value={formatDateRange()} />
          <DetailRow label="Destination" value={pd.country} />
          <DetailRow
            label="Duration"
            value={pd.working_hours ? `${pd.working_hours} hrs` : `${pd.num_days ?? 1} days`}
          />
          <DetailRow
            label="Rate"
            value={pd.working_hours ? `€${pd.hourly_rate?.toFixed(2) ?? '0.00'}/hr` : `€${(pd.rate ?? 0).toFixed(2)}/day`}
          />
          {pd.task && <DetailRow label="Task / Note" value={pd.task} />}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <span className="text-[13px] font-semibold text-slate-500">Total Amount</span>
            <span className="text-[22px] font-bold text-emerald-600 tabular-nums">€{pd.amount.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between -mt-2">
            <span className="text-[13px] text-slate-400">Status</span>
            <StatusBadge status={pd.status} />
          </div>
        </div>

        {/* Footer */}
        {isAdminView && pd.status === 'submitted' && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => onReject(pd.id)}
              className="flex-1 h-10 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold hover:bg-red-50 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(pd.id)}
              className="flex-1 h-10 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50">
      <span className="text-[13px] text-slate-400 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-slate-900 text-right">{value}</span>
    </div>
  )
}
