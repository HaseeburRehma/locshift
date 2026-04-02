// app/dashboard/time-account/page.tsx
'use client'

import React from 'react'
import { History, Info } from 'lucide-react'
import { useUser } from '@/lib/user-context'
import { useTranslation } from '@/lib/i18n'
import { useTimeAccount } from '@/hooks/times/useTimeAccount'
import { TimeAccountKpiCards } from '@/components/times/TimeAccountKpiCards'
import { MonthlyTimeRow } from '@/components/times/MonthlyTimeRow'
import { useRouter } from 'next/navigation'

export default function TimeAccountPage() {
  const { profile, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const { monthlyData, totalBalance, loading } = useTimeAccount()
  const router = useRouter()

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-32">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-6 pt-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-[#16A34A] rounded-xl shadow-lg shadow-green-500/20">
               <History className="w-5 h-5 text-white" />
             </div>
             <h2 className="text-3xl font-black tracking-tight text-gray-900 uppercase">
                {locale === 'en' ? 'Time Account' : 'Zeitkonto'}
             </h2>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60 ml-1">Historical Balance & Overtime Tracking</p>
        </div>
      </div>

      {/* KPI Section */}
      {!loading && (
        <TimeAccountKpiCards 
          balance={totalBalance} 
          overtimePaid={0} // Placeholder or from profile settings
        />
      )}

      {/* Monthly History Section */}
      <div className="space-y-6">
        <div className="px-6 flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
             Monthly History <Info className="w-3 h-3 opacity-50" />
          </h3>
        </div>

        <div className="px-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-[2rem]" />
              ))}
            </div>
          ) : monthlyData.length > 0 ? (
            monthlyData.map(month => (
              <MonthlyTimeRow 
                key={month.key} 
                data={month} 
                onClick={(m) => router.push(`/dashboard/time-account/${m.key}`)}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-100">
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  No historical data available
               </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
