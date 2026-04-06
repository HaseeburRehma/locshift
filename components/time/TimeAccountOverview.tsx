'use client'

import React from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { MonthlyTimeData } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TimeAccountOverviewProps {
  onBack: () => void
  onMonthClick: (month: string) => void
  data: MonthlyTimeData[]
  totalBalance: number
  totalOvertimePaid: number
  employeeName?: string
}

export function TimeAccountOverview({
  onBack,
  onMonthClick,
  data,
  totalBalance,
  totalOvertimePaid,
  employeeName,
}: TimeAccountOverviewProps) {
  return (
    <div className="flex flex-col min-h-full bg-white animate-in fade-in slide-in-from-right duration-300">

      {/* ── iOS-style centred navigation header ── */}
      <div className="relative flex items-center justify-center px-4 py-4 border-b border-slate-100 bg-white sticky top-0 z-50">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-4 flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-90 transition-all text-blue-600 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900 tracking-tight">
          {employeeName ? `${employeeName}` : 'Times Account'}
        </h1>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 px-4 md:px-10 pt-8 pb-32 space-y-8">

        {/* ── Top two balance cards ── */}
        <div className="grid grid-cols-2 gap-4 md:gap-6">

          {/* Hours Balance */}
          <div className={cn(
            'rounded-[2.5rem] border-[3px] p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-1 md:space-y-2 transition-all shadow-xl',
            totalBalance >= 0 ? 'border-blue-400 bg-white shadow-blue-100/50' : 'border-red-400 bg-white shadow-red-100/50'
          )}>
            <span className={cn(
              'text-[32px] md:text-[48px] font-black tracking-tighter tabular-nums leading-none',
              totalBalance >= 0 ? 'text-blue-600' : 'text-red-500'
            )}>
              {totalBalance > 0
                ? `+${totalBalance.toFixed(1)}`
                : totalBalance.toFixed(1)}
            </span>
            <p className="text-[11px] md:text-[13px] text-slate-400 font-bold uppercase tracking-[0.2em]">Hours Balance</p>
          </div>

          {/* Overtime Paid */}
          <div className="rounded-[2.5rem] border-[3px] border-emerald-400 bg-white p-6 md:p-8 flex flex-col items-center justify-center text-center space-y-1 md:space-y-2 transition-all shadow-xl shadow-emerald-100/50">
            <span className="text-[32px] md:text-[48px] font-black tracking-tighter tabular-nums text-emerald-500 leading-none">
              {totalOvertimePaid.toFixed(1)}
            </span>
            <p className="text-[11px] md:text-[13px] text-slate-400 font-bold uppercase tracking-[0.2em]">Overtime Paid</p>
          </div>
        </div>

        {/* ── Monthly Histoy Section ── */}
        <div className="space-y-4 pt-4">
          <h2 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.3em] pl-2">
             Operational History
          </h2>
          {data.length === 0 && (
            <div className="rounded-3xl bg-slate-50/50 border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              No Time Records Detected
            </div>
          )}

          {data.map((month) => {
            const label = new Date(month.year, month.month - 1).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })

            return (
              <button
                key={month.key}
                onClick={() => onMonthClick(month.key)}
                className="w-full text-left group bg-[#F2F4F8] rounded-2xl px-5 py-4.5 flex items-center justify-between hover:bg-blue-50 transition-all active:scale-[0.98] border border-transparent hover:border-blue-100"
              >
                <div className="space-y-1">
                  <h4 className="text-[16px] font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-700 transition-colors">
                    {label}
                  </h4>
                  <p className="text-[12px] font-semibold text-slate-500">
                    {month.workingDays} working days
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "text-[14px] font-black tabular-nums tracking-tight",
                    month.difference >= 0 ? "text-blue-600" : "text-red-500"
                  )}>
                    {month.difference >= 0
                      ? `+${month.difference.toFixed(1)}hrs`
                      : `${month.difference.toFixed(1)}hrs`}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
