'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus, Search, Calendar as CalendarIcon, MapPin, MoreHorizontal,
  Clock, AlertTriangle, Loader2, Download, Pencil, CheckCircle2,
  XCircle, Ban, ChevronUp, ChevronDown, MessageSquare, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { Plan } from '@/lib/types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { usePlans } from '@/hooks/plans/usePlans'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { sendNotification } from '@/lib/notifications/service'
import { createClient } from '@/lib/supabase/client'
import { Printer } from 'lucide-react'
import { startOfWeek, endOfWeek } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcHours(start: string, end: string): string {
  const h = (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000
  return `${h.toFixed(1)}h`
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}

function exportCSV(plans: Plan[]) {
  const headers = ['Employee', 'Customer', 'Location', 'Route', 'Date', 'Time', 'Hours', 'KW', 'Status', 'Notes']
  const rows = plans.map(p => [
    p.employee?.full_name ?? '',
    (p as any).customer?.name ?? '',
    p.location ?? '',
    p.route ?? '',
    new Date(p.start_time).toLocaleDateString('de-DE'),
    `${new Date(p.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(p.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    calcHours(p.start_time, p.end_time),
    `KW ${getISOWeek(new Date(p.start_time))}`,
    p.status,
    (p.notes ?? '').replace(/,/g, ';'),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plans_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600 border-gray-200',
  assigned:  'bg-blue-100 text-blue-700 border-blue-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected:  'bg-red-100 text-red-600 border-red-200',
  cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
}

function StatusBadge({ status, isUpdating }: { status: string; isUpdating?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
      STATUS_STYLES[status] ?? STATUS_STYLES.draft
    )}>
      {isUpdating ? <><Loader2 className="w-3 h-3 animate-spin" /> Updating...</> : status}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PlanRowSkeleton() {
  return (
    <tr className="border-b border-gray-50 bg-white/50">
      <td className="px-8 py-5">
        <div className="flex gap-4">
           <div className="w-10 h-10 rounded-2xl bg-gray-100 animate-pulse" />
           <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-24 mt-3" />
        </div>
      </td>
      <td className="px-8 py-5">
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-16" />
          <div className="h-3 bg-gray-50 rounded-xl animate-pulse w-8" />
        </div>
      </td>
      <td className="px-4 py-5"><div className="h-4 bg-gray-100 rounded-xl animate-pulse w-12 mx-auto" /></td>
      <td className="px-4 py-5"><div className="h-4 bg-gray-100 rounded-xl animate-pulse w-12 mx-auto" /></td>
      <td className="px-8 py-5"><div className="h-4 bg-gray-100 rounded-xl animate-pulse w-24" /></td>
      <td className="px-8 py-5">
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-28" />
          <div className="h-3 bg-gray-50 rounded-xl animate-pulse w-20" />
        </div>
      </td>
      <td className="px-8 py-5"><div className="h-8 bg-gray-100 rounded-2xl animate-pulse w-20" /></td>
      <td className="px-8 py-5 text-right"><div className="h-9 bg-gray-100 rounded-xl animate-pulse w-10 ml-auto" /></td>
    </tr>
  )
}

// ─── Inline Delete Confirm ────────────────────────────────────────────────────

function InlineConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-150">
      <span className="text-xs font-bold text-gray-500">Sure?</span>
      <button onClick={onConfirm} className="px-3 py-1.5 bg-red-500 text-white text-xs font-black rounded-xl hover:bg-red-600 transition-colors">Yes</button>
      <button onClick={onCancel}  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-colors">No</button>
    </div>
  )
}

// ─── Change Request Modal ─────────────────────────────────────────────────────

function ChangeRequestModal({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const { profile } = useUser()

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await sendNotification({
        userId: plan.creator_id,
        title: '🔄 Change Request',
        message: `${profile?.full_name} requests a change for the shift on ${new Date(plan.start_time).toLocaleDateString('de-DE')}: "${message}"`,
        module: 'plans',
        moduleId: plan.id,
      })
      toast.success('Change request sent to your dispatcher')
      onClose()
    } catch {
      toast.error('Failed to send request')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-50">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Change Request</p>
            <h3 className="text-lg font-black text-gray-900 leading-none mt-1">Request Modification</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-2xl p-4 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Shift</p>
            <p className="font-bold text-slate-900 text-sm">
              {new Date(plan.start_time).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {plan.location ? ` · ${plan.location}` : ''}
            </p>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe the change you need (e.g. 'I cannot make this shift, please reschedule')..."
            className="w-full h-28 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold border-gray-200" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold gap-2"
              disabled={!message.trim() || sending}
              onClick={handleSend}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
              Send Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Status Filter Pills ──────────────────────────────────────────────────────

const ALL_STATUSES = ['all', 'draft', 'assigned', 'confirmed', 'rejected', 'cancelled', 'this-week'] as const
type StatusFilter = typeof ALL_STATUSES[number]

function FilterPills({ active, onChange }: { active: StatusFilter; onChange: (s: StatusFilter) => void }) {
  const colors: Record<StatusFilter, string> = {
    all:       'bg-slate-900 text-white border-slate-900',
    draft:     'bg-gray-100 text-gray-700 border-gray-200',
    assigned:  'bg-blue-100 text-blue-700 border-blue-200',
    confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-100 text-red-600 border-red-200',
    cancelled: 'bg-gray-100 text-gray-400 border-gray-200',
    'this-week': 'bg-blue-600 text-white border-blue-600',
  }
  const inactiveBase = 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_STATUSES.map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
            active === s ? colors[s] : inactiveBase
          )}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

// ─── Sort Header Cell ─────────────────────────────────────────────────────────

type SortKey = 'employee' | 'date' | 'hours' | 'status' | 'customer'

function SortTh({ label, sortKey, active, dir, onClick }: {
  label: string; sortKey: SortKey; active: SortKey; dir: 'asc' | 'desc'; onClick: (k: SortKey) => void
}) {
  const isActive = active === sortKey
  return (
    <th
      className="p-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap"
      onClick={() => onClick(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        {isActive
          ? dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          : <ChevronUp className="w-3 h-3 opacity-20" />}
      </span>
    </th>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const router = useRouter()
  const { isAdmin, isDispatcher, profile } = useUser()
  const { locale } = useTranslation()
  const { plans, loading, updatePlanStatus, deletePlan } = usePlans()

  const [searchTerm, setSearchTerm]         = useState('')
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('all')
  const [sortKey, setSortKey]               = useState<SortKey>('date')
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('desc')
  const [confirmingId, setConfirmingId]     = useState<string | null>(null)
  const [updatingId, setUpdatingId]         = useState<string | null>(null)
  const [changeRequestPlan, setChangeRequestPlan] = useState<Plan | null>(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const handleStatusUpdate = async (id: string, status: Plan['status'], reason?: string) => {
    setUpdatingId(id)
    try { await updatePlanStatus(id, status, reason) }
    finally { setUpdatingId(null) }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filteredPlans = useMemo(() => {
    let result = plans.filter(p => {
      const q = searchTerm.toLowerCase()
      const matchText =
        !q ||
        p.employee?.full_name?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.route?.toLowerCase().includes(q) ||
        (p as any).customer?.name?.toLowerCase().includes(q)
      let matchStatus = statusFilter === 'all' || p.status === statusFilter
      if (statusFilter === 'this-week') {
        const planDate = new Date(p.start_time)
        const now = new Date()
        const start = startOfWeek(now, { weekStartsOn: 1 })
        const end = endOfWeek(now, { weekStartsOn: 1 })
        matchStatus = planDate >= start && planDate <= end
      }
      return matchText && matchStatus
    })

    result = [...result].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'employee') cmp = (a.employee?.full_name ?? '').localeCompare(b.employee?.full_name ?? '')
      if (sortKey === 'customer') cmp = ((a as any).customer?.name ?? '').localeCompare((b as any).customer?.name ?? '')
      if (sortKey === 'date')    cmp = new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      if (sortKey === 'hours')   cmp = (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) - (new Date(b.end_time).getTime() - new Date(b.start_time).getTime())
      if (sortKey === 'status')  cmp = a.status.localeCompare(b.status)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [plans, searchTerm, statusFilter, sortKey, sortDir])

  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage)
  const paginatedPlans = useMemo(() => {
    return filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filteredPlans, currentPage])

  // Reset to page 1 on filter/search
  useMemo(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter])

  // ── Admin / Dispatcher View ─────────────────────────────────────────────────
  if (isAdmin || isDispatcher) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <h2 className="text-4xl font-black tracking-tight text-gray-900">
              {locale === 'en' ? 'Plans & Schedules' : 'Pläne & Termine'}
            </h2>
            <p className="text-base text-gray-400 font-medium">Manage shift assignments and schedules</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/dashboard/plans/new">
              <Button className="h-12 rounded-2xl px-8 font-bold text-sm shadow-xl shadow-blue-100 bg-[#0064E0] hover:bg-blue-700 gap-2 transition-all hover:scale-[1.02] active:scale-95">
                 <Plus className="w-5 h-5" />
                 {locale === 'en' ? 'Create Plan' : 'Plan erstellen'}
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters & Table Card */}
        <Card className="border-none rounded-[2.5rem] shadow-2xl shadow-gray-200/50 overflow-hidden bg-white print:hidden">
          <CardHeader className="p-8 border-b border-gray-50 bg-white space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Status filter pills */}
              <div className="flex flex-wrap gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/50">
                {['all', 'draft', 'assigned', 'confirmed', 'this-week'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s as any)}
                    className={cn(
                      'px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300',
                      statusFilter === s 
                        ? 'bg-[#0064E0] text-white shadow-lg shadow-blue-200' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-white'
                    )}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#0064E0] transition-colors" />
                <input
                  type="text"
                  placeholder={locale === 'en' ? 'Search here...' : 'Hier suchen...'}
                  className="w-full h-12 pl-12 pr-6 rounded-2xl border border-gray-100 bg-gray-50/30 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:bg-white transition-all font-medium text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/20 border-b border-gray-100/50">
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-left min-w-[220px]">Employee</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-left min-w-[140px]">Date</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center min-w-[110px]">Start Time</th>
                    <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center min-w-[110px]">End Time</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-left min-w-[160px]">Customer</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-left min-w-[200px]">Location</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-left min-w-[130px]">Status</th>
                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading
                    ? Array.from({ length: 3 }).map((_, i) => <PlanRowSkeleton key={i} />)
                    : paginatedPlans.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="p-20 text-center text-gray-300 font-black text-[11px] uppercase tracking-widest italic">
                          No plans found in this category
                        </td>
                      </tr>
                    )
                    : paginatedPlans.map((plan, index) => (
                      <tr
                        key={plan.id}
                        className="transition-all duration-300 hover:bg-blue-50/20 group"
                      >
                        {/* Employee */}
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                               <img
                                 src={plan.employee?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(plan.employee?.full_name || 'U')}&background=0064E0&color=fff&size=64`}
                                 alt=""
                                 className="w-10 h-10 rounded-2xl object-cover border-2 border-white shadow-sm ring-1 ring-gray-100"
                               />
                               <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                            </div>
                            <span className="font-bold text-gray-900 text-sm tracking-tight whitespace-nowrap">{plan.employee?.full_name ?? 'Unassigned'}</span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-8 py-5">
                           <div className="flex flex-col">
                             <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                               {new Date(plan.start_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                             </span>
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                               {new Date(plan.start_time).getFullYear()}
                             </span>
                           </div>
                        </td>

                        {/* Start Time */}
                        <td className="px-4 py-5 font-bold text-gray-900 text-sm text-center tabular-nums">
                          {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* End Time */}
                        <td className="px-4 py-5 font-bold text-gray-900 text-sm text-center tabular-nums">
                          {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>

                        {/* Customer */}
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-gray-700 tracking-tight">
                            {(plan as any).customer?.name ??"—"}
                          </p>
                        </td>

                        {/* Location */}
                        <td className="px-8 py-5">
                           <div className="flex flex-col max-w-[180px]">
                             <span className="text-sm font-bold text-gray-600 truncate">
                               {plan.location ?? "—"}
                             </span>
                             {plan.location?.includes(',') && (
                               <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter opacity-70">
                                 Mission Coordinates
                               </span>
                             )}
                           </div>
                        </td>

                        {/* Status */}
                        <td className="px-8 py-5">
                          <StatusBadge status={plan.status} isUpdating={(plan as any)._updating || updatingId === plan.id} />
                        </td>

                        {/* Actions */}
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="w-9 h-9 rounded-xl hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 group"
                              onClick={() => router.push(`/dashboard/plans/${plan.id}/edit`)}
                            >
                              <Pencil className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                            </Button>

                            {confirmingId === plan.id ? (
                              <InlineConfirm
                                onConfirm={() => { deletePlan(plan.id); setConfirmingId(null) }}
                                onCancel={() => setConfirmingId(null)}
                              />
                            ) : (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="rounded-xl hover:bg-gray-100">
                                    <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl border-gray-100 shadow-xl p-2 w-52">
                                  {/* Edit shortcut in dropdown too */}
                                  <DropdownMenuItem
                                    className="rounded-xl font-bold text-sm gap-2 py-3 cursor-pointer"
                                    onClick={() => router.push(`/dashboard/plans/${plan.id}/edit`)}
                                  >
                                    <Pencil className="w-4 h-4 text-gray-400" />
                                    {locale === 'en' ? 'Edit Plan' : 'Plan bearbeiten'}
                                  </DropdownMenuItem>

                                  {/* Status logic */}
                                  {plan.status === 'assigned' && (
                                    <DropdownMenuItem
                                      className="rounded-xl font-bold text-sm gap-2 py-3 cursor-pointer text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                                      onClick={() => handleStatusUpdate(plan.id, 'confirmed')}
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      {locale === 'en' ? 'Confirm Shift' : 'Bestätigen'}
                                    </DropdownMenuItem>
                                  )}

                                  {(plan.status === 'assigned' || plan.status === 'draft') && (
                                    <DropdownMenuItem
                                      className="rounded-xl font-bold text-sm gap-2 py-3 cursor-pointer text-orange-600 focus:text-orange-700 focus:bg-orange-50"
                                      onClick={() => handleStatusUpdate(plan.id, 'rejected')}
                                    >
                                      <XCircle className="w-4 h-4" />
                                      {locale === 'en' ? 'Reject Shift' : 'Ablehnen'}
                                    </DropdownMenuItem>
                                  )}

                                  {plan.status !== 'cancelled' && plan.status !== 'rejected' && (
                                    <>
                                      <DropdownMenuSeparator className="bg-gray-50 mx-2" />
                                      <DropdownMenuItem
                                        className="rounded-xl font-bold text-sm gap-2 py-3 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
                                        onClick={() => setConfirmingId(plan.id)}
                                      >
                                        <Ban className="w-4 h-4" />
                                        {locale === 'en' ? 'Cancel Shift' : 'Stornieren'}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>

              {/* Pagination footer */}
              {!loading && filteredPlans.length > 0 && (
                <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPlans.length)} of {filteredPlans.length} plans
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Page Total: {paginatedPlans.reduce((sum, p) => sum + (new Date(p.end_time).getTime() - new Date(p.start_time).getTime()) / 3_600_000, 0).toFixed(1)}h
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="h-10 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] disabled:opacity-30 border-gray-100"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                       {Array.from({ length: totalPages }).map((_, i) => (
                         <button
                           key={i}
                           onClick={() => setCurrentPage(i + 1)}
                           className={cn(
                             "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                             currentPage === i + 1 ? "bg-slate-900 text-white" : "text-gray-400 hover:bg-gray-100"
                           )}
                         >
                           {i + 1}
                         </button>
                       ))}
                    </div>
                    <Button 
                      variant="outline" 
                      className="h-10 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] disabled:opacity-30 border-gray-100"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Employee View ─────────────────────────────────────────────────────────
  // Group plans by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Plan[]> = {}
    paginatedPlans.forEach(plan => {
      const key = new Date(plan.start_time).toLocaleDateString(locale === 'en' ? 'en-US' : 'de-DE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
      })
      if (!groups[key]) groups[key] = []
      groups[key].push(plan)
    })
    return groups
  }, [paginatedPlans, locale])

  return (
    <>
      {changeRequestPlan && (
        <ChangeRequestModal plan={changeRequestPlan} onClose={() => setChangeRequestPlan(null)} />
      )}

      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700 pb-24">
        {/* Header */}
        <div className="px-4 pt-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">My Schedule</span>
            <h2 className="text-3xl font-black tracking-tight text-gray-900">
              {locale === 'en' ? 'My Plans' : 'Meine Pläne'}
            </h2>
          </div>
          {/* Status filter for employee */}
          <div className="hidden md:flex gap-2 flex-wrap">
            <FilterPills active={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        {/* Mobile filter */}
        <div className="px-4 flex md:hidden gap-2 flex-wrap">
          <FilterPills active={statusFilter} onChange={setStatusFilter} />
        </div>

        {/* Plans grouped by date */}
        <div className="space-y-8 px-4">
          {loading
            ? Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-40 bg-gray-50 rounded-3xl animate-pulse" />
            ))
            : Object.keys(groupedByDate).length === 0
            ? (
              <div className="text-center py-24 text-gray-300 font-black text-[11px] uppercase tracking-widest italic">
                {locale === 'en' ? 'No assignments found.' : 'Keine Zuweisungen gefunden.'}
              </div>
            )
            : Object.entries(groupedByDate).map(([dateLabel, dayPlans]) => (
              <div key={dateLabel} className="space-y-3">
                {/* Date group header */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">
                    {dateLabel} · <span className="text-blue-600">KW {getISOWeek(new Date(dayPlans[0].start_time))}</span>
                  </span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                {/* Cards for this date */}
                {dayPlans.map((plan, index) => (
                  <Card
                    key={plan.id}
                    className={cn(
                      'border-gray-100 shadow-sm rounded-3xl overflow-hidden bg-white transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
                      (plan as any)._loading && 'opacity-50'
                    )}
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1.5">
                          <StatusBadge status={plan.status} isUpdating={(plan as any)._updating || updatingId === plan.id} />
                          {plan.location && (
                            <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {plan.location}
                            </div>
                          )}
                          {(plan as any).customer?.name && (
                            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{(plan as any).customer.name}</p>
                          )}
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xl font-black text-gray-900 tabular-nums">{calcHours(plan.start_time, plan.end_time)}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase">
                            {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {plan.notes && (
                        <div className="bg-gray-50 rounded-2xl p-3 mb-4 border border-gray-100">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                          <p className="text-sm text-gray-600 font-medium">{plan.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-2">
                        {plan.status === 'assigned' && (
                          <>
                            <Button
                              className="flex-1 h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold text-sm shadow-sm disabled:opacity-60 gap-1.5"
                              disabled={(plan as any)._updating || updatingId === plan.id}
                              onClick={() => handleStatusUpdate(plan.id, 'confirmed')}
                            >
                              {updatingId === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              {locale === 'en' ? 'Confirm' : 'Bestätigen'}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 h-11 rounded-2xl border-gray-200 font-bold text-sm text-red-500 hover:bg-red-50 disabled:opacity-60 gap-1.5"
                              disabled={(plan as any)._updating || updatingId === plan.id}
                              onClick={() => handleStatusUpdate(plan.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4" />
                              {locale === 'en' ? 'Reject' : 'Ablehnen'}
                            </Button>
                          </>
                        )}

                        {/* Request Change — always available */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-2xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 flex-shrink-0"
                          onClick={() => setChangeRequestPlan(plan)}
                          title="Request a change"
                        >
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          }
        </div>

        {/* Pagination footer */}
        {!loading && filteredPlans.length > 0 && (
          <div className="px-4 py-8 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100/60">
            <div className="flex flex-col text-center sm:text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPlans.length)} of {filteredPlans.length} plans
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="h-10 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] disabled:opacity-40 border-gray-100 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 mx-1 sm:mx-2 bg-white border border-gray-100 rounded-xl p-1 shadow-sm">
                 {Array.from({ length: totalPages }).map((_, i) => (
                   <button
                     key={i}
                     onClick={() => setCurrentPage(i + 1)}
                     className={cn(
                       "min-w-8 h-8 px-2 rounded-lg text-[10px] font-black transition-all",
                       currentPage === i + 1 
                         ? "bg-[#0064E0] text-white shadow-md shadow-blue-200" 
                         : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                     )}
                   >
                     {i + 1}
                   </button>
                 ))}
              </div>
              <Button 
                variant="outline" 
                className="h-10 rounded-xl px-4 font-black uppercase tracking-widest text-[10px] disabled:opacity-40 border-gray-100 bg-white shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
