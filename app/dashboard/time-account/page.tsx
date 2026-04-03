'use client'

import React, { useState } from 'react'
import { TimeAccountOverview } from '@/components/time/TimeAccountOverview'
import { MonthlyBreakdown } from '@/components/time/MonthlyBreakdown'
import { PersonnelTimeAccounts } from '@/components/time/PersonnelTimeAccounts'
import { useUser } from '@/lib/user-context'
import { useTimeAccount } from '@/hooks/times/useTimeAccount'
import { useOrganizationTimeAccounts } from '@/hooks/times/useOrgTimeAccounts'
import { Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TimeAccountPage() {
  const { role, isAdmin, isDispatcher, isEmployee } = useUser()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [view, setView] = useState<'personnel' | 'overview' | 'monthly'>(
    (isAdmin || isDispatcher) ? 'personnel' : 'overview'
  )
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null)

  // 1. Organizational Hook (Admin/Dispatcher View)
  const { accounts, loading: orgLoading } = useOrganizationTimeAccounts()

  // 2. Individual Hook (Employee/Detail View)
  const { 
    monthlyData, 
    totalBalance, 
    loading: detailLoading 
  } = useTimeAccount(selectedEmployeeId || undefined)

  const selectedMonthData = monthlyData.find(m => m.key === selectedMonthKey)

  const handleSelectEmployee = (id: string) => {
    setSelectedEmployeeId(id)
    setView('overview')
  }

  const handleBackToPersonnel = () => {
    setSelectedEmployeeId(null)
    setView('personnel')
  }

  if (orgLoading && view === 'personnel') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Syncing Personnel Balances...</p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Personnel Overview (Admin/Dispatcher ONLY as per Section 4.1 & 4.2) */}
        {view === 'personnel' && (isAdmin || isDispatcher) && (
          <PersonnelTimeAccounts 
            accounts={accounts} 
            onSelectEmployee={handleSelectEmployee} 
          />
        )}

        {/* Individual Overview (Detail View for Admins OR Primary View for Employees) */}
        {view === 'overview' && (
          <div className="animate-in fade-in slide-in-from-right duration-500">
            {/* If Admin/Dispatcher, show a way to get back to the list */}
            {(isAdmin || isDispatcher) && (
              <div className="mb-4">
                <Button 
                    variant="ghost" 
                    onClick={handleBackToPersonnel}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 gap-2"
                >
                    <ArrowLeft className="h-3 w-3" /> Back to Personnel List
                </Button>
              </div>
            )}
            <TimeAccountOverview 
              onBack={isEmployee ? () => window.history.back() : handleBackToPersonnel}
              onMonthClick={(key) => {
                setSelectedMonthKey(key)
                setView('monthly')
              }}
              data={monthlyData}
              totalBalance={totalBalance}
              totalOvertimePaid={0} // To be connected with actual payroll if needed
            />
          </div>
        )}

        {/* Monthly Deep-Dive */}
        {view === 'monthly' && selectedMonthData && (
          <div className="max-w-3xl mx-auto md:bg-white md:rounded-[2.5rem] md:shadow-2xl md:overflow-hidden animate-in zoom-in duration-300">
            <MonthlyBreakdown 
              onBack={() => setView('overview')}
              monthData={selectedMonthData}
            />
          </div>
        )}
      </div>
    </div>
  )
}
