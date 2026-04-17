'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Search,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react'
import { TimeAccount, MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/lib/user-context'
import { groupByMonth } from '@/lib/times/calculations'
import { Loader2 } from 'lucide-react'

interface PersonnelTimeAccountsProps {
  accounts: TimeAccount[]
  onSelectEmployee: (employeeId: string) => void
}

const ITEMS_PER_PAGE = 10

// ── Per-employee monthly data fetcher ──────────────────────────────────────
function useEmployeeMonthly(employeeId: string | null) {
  const [data, setData] = useState<MonthlyTimeData[]>([])
  const [loading, setLoading] = useState(false)
  const { profile } = useUser()
  const supabase = createClient()

  useEffect(() => {
    if (!employeeId || !profile?.organization_id) { setData([]); return }
    setLoading(true)

    const fetch = async () => {
      const [{ data: entries }, { data: plans }] = await Promise.all([
        supabase.from('time_entries').select('*').eq('employee_id', employeeId).order('date', { ascending: false }),
        supabase.from('plans').select('*').eq('employee_id', employeeId).in('status', ['confirmed', 'assigned']),
      ])
      setData(groupByMonth(entries ?? [], plans ?? []))
      setLoading(false)
    }
    fetch()
  }, [employeeId, profile?.organization_id])

  return { data, loading }
}

// ── Main Component ─────────────────────────────────────────────────────────
export function PersonnelTimeAccounts({ accounts, onSelectEmployee }: PersonnelTimeAccountsProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  useEffect(() => { setCurrentPage(1) }, [searchTerm])

  const filtered = useMemo(() =>
    accounts.filter(a => a.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
    [accounts, searchTerm]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const totalOrgBalance = accounts.reduce((s, a) => s + a.balance, 0)
  const compliantCount = accounts.filter(a => a.balance >= 0).length

  const selectedAccount = accounts.find(a => a.employee_id === selectedEmployeeId)

  return (
    <div className="min-h-screen bg-white animate-in fade-in duration-300">
      <div className="px-5 md:px-8 pt-6 pb-16 space-y-7 max-w-5xl mx-auto">

        {/* ── Title + Search ── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[26px] md:text-[30px] font-bold text-slate-900 tracking-tight leading-none">
              Personnel Accounts
            </h1>
            <p className="text-[13px] text-slate-500">Monitor time balances across your workforce</p>
          </div>
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search employees…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ── Employee filter chips ── */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all',
                selectedEmployeeId === null
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              All Employees
            </button>
            {accounts.map(acc => (
              <button
                key={acc.employee_id}
                onClick={() => setSelectedEmployeeId(
                  selectedEmployeeId === acc.employee_id ? null : acc.employee_id
                )}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all',
                  selectedEmployeeId === acc.employee_id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-200 hover:text-blue-600'
                )}
              >
                {acc.full_name.split(' ')[0]}
                <span className={cn(
                  'text-[11px] font-bold tabular-nums',
                  selectedEmployeeId === acc.employee_id
                    ? 'text-blue-200'
                    : acc.balance >= 0 ? 'text-emerald-500' : 'text-red-400'
                )}>
                  {acc.balance >= 0 ? `+${acc.balance.toFixed(1)}h` : `${acc.balance.toFixed(1)}h`}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.07] pointer-events-none">
              <Clock className="w-24 h-24 text-blue-400" />
            </div>
            <div className="relative space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
                {selectedEmployeeId ? 'Employee Balance' : 'Organisation Balance'}
              </p>
              <div className={cn(
                'text-[36px] font-bold tabular-nums leading-none tracking-tight',
                (selectedEmployeeId ? selectedAccount?.balance ?? totalOrgBalance : totalOrgBalance) >= 0
                  ? 'text-blue-400' : 'text-red-400'
              )}>
                {(() => {
                  const val = selectedEmployeeId ? selectedAccount?.balance ?? totalOrgBalance : totalOrgBalance
                  return val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1)
                })()}
                <span className="text-[20px] font-medium text-slate-500 ml-1">h</span>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed max-w-[180px]">
                {selectedEmployeeId
                  ? `Accumulated time credits for ${selectedAccount?.full_name ?? 'this employee'}.`
                  : 'Accumulated time credits across the entire unit.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {selectedEmployeeId ? 'Actual Hours' : 'Total Employees'}
            </p>
            <div className="text-[36px] font-bold text-slate-900 leading-none tabular-nums">
              {selectedEmployeeId
                ? `${selectedAccount?.actual_hours.toFixed(1) ?? '0'}h`
                : accounts.length}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-[12px] text-slate-400 font-medium">
                {selectedEmployeeId ? 'Hours worked' : 'Operational workforce'}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 hover:border-slate-300 hover:shadow-sm transition-all">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {selectedEmployeeId ? 'Target Hours' : 'Time Account Compliance'}
            </p>
            <div className="flex items-baseline gap-1 leading-none">
              {selectedEmployeeId ? (
                <span className="text-[36px] font-bold text-blue-600 tabular-nums">
                  {selectedAccount?.target_hours ?? 0}h
                </span>
              ) : (
                <>
                  <span className="text-[36px] font-bold text-emerald-500 tabular-nums">{compliantCount}</span>
                  <span className="text-[20px] font-medium text-slate-300">/{accounts.length}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span className="text-[12px] text-slate-400 font-medium">
                {selectedEmployeeId ? 'Per month' : 'Meeting target hours'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Inline Monthly Breakdown for selected employee ── */}
        {selectedEmployeeId && (
          <EmployeeMonthlyPanel
            employeeId={selectedEmployeeId}
            employeeName={selectedAccount?.full_name ?? ''}
            onViewFull={() => onSelectEmployee(selectedEmployeeId)}
          />
        )}

        {/* ── Personnel table (always visible) ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-slate-900">
              {selectedEmployeeId ? `All Personnel` : 'Personnel List'}
            </h2>
            {filtered.length > ITEMS_PER_PAGE && (
              <span className="text-[12px] text-slate-400 font-medium">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </span>
            )}
          </div>

          {/* Column headers — desktop */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <div className="col-span-5">Employee</div>
            <div className="col-span-3 text-right">Target / mo</div>
            <div className="col-span-3 text-right">Balance</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-slate-100 min-h-[200px]">
            {filtered.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-[13px] text-slate-400 font-medium">No employees found.</p>
              </div>
            ) : (
              paginated.map(account => {
                const isActive = account.employee_id === selectedEmployeeId
                return (
                  <div
                    key={account.employee_id}
                    onClick={() => setSelectedEmployeeId(
                      isActive ? null : account.employee_id
                    )}
                    className={cn(
                      'group cursor-pointer transition-colors',
                      isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                    )}
                  >
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 items-center px-6 py-4">
                      <div className="col-span-5 flex items-center gap-4">
                        <div className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          isActive
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                        )}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <p className={cn(
                            'text-[14px] font-semibold leading-none transition-colors',
                            isActive ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-600'
                          )}>
                            {account.full_name}
                          </p>
                          <p className="text-[12px] text-slate-400 mt-0.5">
                            {account.actual_hours.toFixed(1)} hrs worked
                          </p>
                        </div>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className="text-[14px] font-medium text-slate-600 tabular-nums">
                          {account.target_hours}h
                        </span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className={cn(
                          'inline-block text-[13px] font-semibold tabular-nums px-3 py-1 rounded-lg',
                          account.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        )}>
                          {account.balance >= 0 ? `+${account.balance.toFixed(1)}h` : `${account.balance.toFixed(1)}h`}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {isActive
                          ? <ChevronDown className="h-4 w-4 text-blue-400" />
                          : <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-all" />
                        }
                      </div>
                    </div>

                    {/* Mobile row */}
                    <div className="md:hidden px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                          isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                        )}>
                          <Users className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'text-[14px] font-semibold truncate',
                            isActive ? 'text-blue-600' : 'text-slate-900'
                          )}>
                            {account.full_name}
                          </p>
                          <p className="text-[12px] text-slate-400">Target: {account.target_hours}h/mo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-[13px] font-semibold tabular-nums px-3 py-1 rounded-lg',
                          account.balance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                        )}>
                          {account.balance >= 0 ? `+${account.balance.toFixed(1)}h` : `${account.balance.toFixed(1)}h`}
                        </span>
                        {isActive
                          ? <ChevronDown className="h-4 w-4 text-blue-400" />
                          : <ChevronRight className="h-4 w-4 text-slate-300" />
                        }
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="text-[13px] font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 active:scale-95"
              >
                ← Previous
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-[12px] font-semibold transition-all active:scale-95',
                      page === currentPage
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="text-[13px] font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 active:scale-95"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Inline Employee Monthly Panel ──────────────────────────────────────────
function EmployeeMonthlyPanel({
  employeeId,
  employeeName,
  onViewFull,
}: {
  employeeId: string
  employeeName: string
  onViewFull: () => void
}) {
  const { data, loading } = useEmployeeMonthly(employeeId)

  return (
    <div className="bg-white border border-blue-200 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Panel header */}
      <div className="px-6 py-4 border-b border-blue-100 bg-blue-50/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900 leading-none">
              {employeeName}
            </h3>
            <p className="text-[12px] text-slate-400 mt-0.5">Monthly time account breakdown</p>
          </div>
        </div>
        <button
          onClick={onViewFull}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-200"
        >
          View Full Detail
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          <span className="text-[13px] text-slate-400 font-medium">Loading breakdown…</span>
        </div>
      ) : data.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-[13px] text-slate-400 font-medium">No time records found for this employee.</p>
        </div>
      ) : (
        <>
          {/* Column headers - desktop */}
          <div className="hidden md:grid grid-cols-12 px-6 py-3 bg-slate-50/60 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            <div className="col-span-4">Month</div>
            <div className="col-span-2 text-right">Working Days</div>
            <div className="col-span-2 text-right">Scheduled</div>
            <div className="col-span-2 text-right">Actual</div>
            <div className="col-span-2 text-right">Balance</div>
          </div>

          <div className="divide-y divide-slate-100">
            {data.slice(0, 6).map(month => {
              const label = new Date(month.year, month.month - 1).toLocaleDateString('en-US', {
                month: 'long', year: 'numeric',
              })
              return (
                <div
                  key={month.key}
                  onClick={onViewFull}
                  className="group cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-12 items-center px-6 py-4">
                    <div className="col-span-4">
                      <p className="text-[14px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{label}</p>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[13px] text-slate-500 tabular-nums">{month.workingDays}d</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[13px] text-slate-500 tabular-nums">{month.scheduledHours.toFixed(1)}h</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{month.actualHours.toFixed(1)}h</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className={cn(
                        'text-[13px] font-semibold tabular-nums',
                        month.difference >= 0 ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {month.difference >= 0 ? `+${month.difference.toFixed(1)}h` : `${month.difference.toFixed(1)}h`}
                      </span>
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="md:hidden px-5 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-slate-900">{label}</p>
                      <p className="text-[12px] text-slate-400">{month.workingDays} days · {month.actualHours.toFixed(1)}h actual</p>
                    </div>
                    <span className={cn(
                      'text-[14px] font-bold tabular-nums',
                      month.difference >= 0 ? 'text-emerald-500' : 'text-red-500'
                    )}>
                      {month.difference >= 0 ? `+${month.difference.toFixed(1)}h` : `${month.difference.toFixed(1)}h`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {data.length > 6 && (
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={onViewFull}
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5"
              >
                View all {data.length} months
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
