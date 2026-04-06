'use client'

import React, { useState } from 'react'
import { TimeAccountOverview } from '@/components/time/TimeAccountOverview'
import { MonthlyBreakdown } from '@/components/time/MonthlyBreakdown'
import { PersonnelTimeAccounts } from '@/components/time/PersonnelTimeAccounts'
import { useUser } from '@/lib/user-context'
import { useTimeAccount } from '@/hooks/times/useTimeAccount'
import { useOrganizationTimeAccounts } from '@/hooks/times/useOrgTimeAccounts'
import { Loader2 } from 'lucide-react'

type View = 'personnel' | 'overview' | 'monthly'

export default function TimeAccountPage() {
  const { isAdmin, isDispatcher, isEmployee, profile } = useUser()

  // Admin starts at personnel list; employee starts at their own overview
  const [view, setView] = useState<View>((isAdmin || isDispatcher) ? 'personnel' : 'overview')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null)

  // ── Org-level hook (admin/dispatcher) ──
  const { accounts, loading: orgLoading } = useOrganizationTimeAccounts()

  // ── Individual hook — targets selected employee (or self if employee) ──
  const targetId = selectedEmployeeId || (isEmployee ? profile?.id : undefined)
  const { monthlyData, totalBalance, loading: detailLoading } = useTimeAccount(targetId ?? undefined)

  const selectedMonthData = monthlyData.find(m => m.key === selectedMonthKey) ?? null

  // ── Handlers ──
  const handleSelectEmployee = (id: string, name?: string) => {
    setSelectedEmployeeId(id)
    setSelectedEmployeeName(name ?? null)
    setView('overview')
  }

  const handleBackToPersonnel = () => {
    setSelectedEmployeeId(null)
    setSelectedEmployeeName(null)
    setView('personnel')
  }

  const handleMonthClick = (key: string) => {
    setSelectedMonthKey(key)
    setView('monthly')
  }

  const handleBackToOverview = () => {
    setSelectedMonthKey(null)
    setView('overview')
  }

  // ── Loading ──
  if (orgLoading && view === 'personnel') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Syncing Personnel Balances…
        </p>
      </div>
    )
  }

  if (detailLoading && view === 'overview') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          Loading Time Account…
        </p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-screen">
      <div className="max-w-[1600px] mx-auto">

        {/* ── ADMIN / DISPATCHER: Personnel overview list ── */}
        {view === 'personnel' && (isAdmin || isDispatcher) && (
          <PersonnelTimeAccounts
            accounts={accounts}
            onSelectEmployee={(id) => {
              const acct = accounts.find(a => a.employee_id === id)
              handleSelectEmployee(id, acct?.full_name)
            }}
          />
        )}

        {/* ── Individual overview (employee personal or admin drilling into someone) ── */}
        {view === 'overview' && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-100 md:overflow-hidden animate-in fade-in zoom-in duration-500">
            <TimeAccountOverview
              onBack={
                isEmployee
                  ? () => window.history.back()
                  : handleBackToPersonnel
              }
              onMonthClick={handleMonthClick}
              data={monthlyData}
              totalBalance={totalBalance}
              totalOvertimePaid={monthlyData.reduce((sum, m) => sum + (m.difference > 0 ? m.difference : 0), 0)}
              employeeName={selectedEmployeeName ?? undefined}
            />
          </div>
        )}

        {/* ── Monthly deep-dive ── */}
        {view === 'monthly' && selectedMonthData && (
          <div className="max-w-5xl mx-auto md:bg-white md:rounded-[2.5rem] md:shadow-2xl md:border md:border-slate-100 md:overflow-hidden animate-in zoom-in duration-500">
            <MonthlyBreakdown
              onBack={handleBackToOverview}
              monthData={selectedMonthData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
