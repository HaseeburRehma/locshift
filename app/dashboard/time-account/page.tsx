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

  const [view, setView] = useState<View>((isAdmin || isDispatcher) ? 'personnel' : 'overview')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string | null>(null)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null)

  const { accounts, loading: orgLoading } = useOrganizationTimeAccounts()

  const targetId = selectedEmployeeId || (isEmployee ? profile?.id : undefined)
  const { monthlyData, totalBalance, loading: detailLoading } = useTimeAccount(targetId ?? undefined)

  const selectedMonthData = monthlyData.find(m => m.key === selectedMonthKey) ?? null

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

  // ── Loading states ──
  if (orgLoading && view === 'personnel') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-[12px] font-medium text-slate-400">Loading personnel…</p>
      </div>
    )
  }

  if (detailLoading && view === 'overview') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <p className="text-[12px] font-medium text-slate-400">Loading time account…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">

      {/* ── Admin / Dispatcher: Personnel list ── */}
      {view === 'personnel' && (isAdmin || isDispatcher) && (
        <PersonnelTimeAccounts
          accounts={accounts}
          onSelectEmployee={(id) => {
            const acct = accounts.find(a => a.employee_id === id)
            handleSelectEmployee(id, acct?.full_name)
          }}
        />
      )}

      {/* ── Employee overview (personal or admin drill-in) ── */}
      {view === 'overview' && (
        <TimeAccountOverview
          onBack={isEmployee ? () => window.history.back() : handleBackToPersonnel}
          onMonthClick={handleMonthClick}
          data={monthlyData}
          totalBalance={totalBalance}
          totalOvertimePaid={monthlyData.reduce((sum, m) => sum + (m.difference > 0 ? m.difference : 0), 0)}
          employeeName={selectedEmployeeName ?? undefined}
        />
      )}

      {/* ── Monthly daily breakdown ── */}
      {view === 'monthly' && selectedMonthData && (
        <MonthlyBreakdown
          onBack={handleBackToOverview}
          monthData={selectedMonthData}
        />
      )}
    </div>
  )
}
